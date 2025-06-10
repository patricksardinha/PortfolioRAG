// src/lib/groq.ts
import { useState, useCallback, useEffect } from 'react';
import type { SearchSource } from './search';

// Types
interface RateLimitInfo {
  remainingTokens?: string | null;
  resetTokens?: string | null;
  limitTokens?: string | null;
}

interface GroqModel {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
}

interface StreamChunk {
  type: 'content' | 'done' | 'error';
  content: string;
  rateLimitInfo?: RateLimitInfo;
  error?: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface ChatResponse {
  success: boolean;
  content?: string;
  rateLimitInfo?: RateLimitInfo;
  error?: string;
}

interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

class GroqClient {
  private apiKey: string;
  private baseURL: string = 'https://api.groq.com/openai/v1';
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Validation clé API
  static isValidKey(apiKey: string): boolean {
    return apiKey && typeof apiKey === 'string' && apiKey.startsWith('gsk_');
  }

  // Test de connexion
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `HTTP ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Construire prompt système avec contexte RAG
  private buildSystemPrompt(context: string = '', sources: SearchSource[] = []): string {
    let prompt = `Tu es un assistant IA qui répond aux questions sur le CV et le portfolio de John Developer.`;
    
    if (context.trim()) {
      prompt += `\n\nCONTEXTE du CV/Portfolio:\n${context}`;
      
      if (sources.length > 0) {
        const sourcesList = sources.map((source, index) => 
          `${index + 1}. ${source.title} (${source.type}) - Pertinence: ${source.similarity}%`
        ).join('\n');
        
        prompt += `\n\nSOURCES utilisées:\n${sourcesList}`;
      }
      
      prompt += `\n\nINSTRUCTIONS:
- Réponds UNIQUEMENT en te basant sur les informations du contexte fourni
- Si l'information n'est pas dans le contexte, dis-le clairement
- Sois précis, professionnel et engageant
- Utilise un ton conversationnel mais expert
- Cite les sections pertinentes quand c'est utile
- Réponds en français`;
    } else {
      prompt += `\n\nAucun contexte spécifique trouvé dans le CV. Réponds de manière générale en tant qu'assistant de portfolio professionnel.`;
    }

    return prompt;
  }

  // Chat completion avec streaming
  async *streamChat(
    message: string, 
    context: string = '', 
    sources: SearchSource[] = [], 
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const {
      model = 'llama-3.1-8b-instant',
      temperature = 0.7,
      maxTokens = 800
    } = options;

    const systemPrompt = this.buildSystemPrompt(context, sources);
    
    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: options.signal
      });

      // Parser rate limit headers
      this.rateLimitInfo = {
        remainingTokens: response.headers.get('x-ratelimit-remaining-tokens'),
        resetTokens: response.headers.get('x-ratelimit-reset-tokens'),
        limitTokens: response.headers.get('x-ratelimit-limit-tokens')
      };

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after') || '60';
          throw new Error(`Rate limit atteint. Réessayez dans ${retryAfter} secondes.`);
        }
        
        throw new Error(error.error?.message || `Erreur HTTP ${response.status}`);
      }

      // Parser stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Impossible de lire la réponse');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Garder la dernière ligne incomplète dans le buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            
            if (data === '[DONE]') {
              yield { type: 'done', content: '' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                yield { 
                  type: 'content', 
                  content,
                  rateLimitInfo: this.rateLimitInfo
                };
              }
            } catch (error) {
              // Ignorer erreurs parsing pour chunks partiels
              console.debug('Parse error:', error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Groq stream error:', error);
      yield { 
        type: 'error', 
        content: '',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Chat simple (non-streaming) pour fallback
  async chat(
    message: string, 
    context: string = '', 
    sources: SearchSource[] = [], 
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const chunks: string[] = [];
    
    try {
      for await (const chunk of this.streamChat(message, context, sources, options)) {
        if (chunk.type === 'content') {
          chunks.push(chunk.content);
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        }
      }
      
      return {
        success: true,
        content: chunks.join(''),
        rateLimitInfo: this.rateLimitInfo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        rateLimitInfo: this.rateLimitInfo
      };
    }
  }

  // Informations rate limit
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  // Modèles disponibles
  static getAvailableModels(): GroqModel[] {
    return [
      { 
        id: 'llama-3.1-8b-instant', 
        name: 'Llama 3.1 8B', 
        description: '⚡ Rapide et efficace',
        recommended: true
      },
      { 
        id: 'llama-3.1-70b-versatile', 
        name: 'Llama 3.1 70B', 
        description: '🧠 Plus intelligent, plus lent'
      },
      { 
        id: 'mixtral-8x7b-32768', 
        name: 'Mixtral 8x7B', 
        description: '🇫🇷 Excellent pour le français'
      }
    ];
  }
}

// Hook React pour Groq
export function useGroq() {
  const [client, setClient] = useState<GroqClient | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialiser client
  const initialize = useCallback(async (apiKey: string): Promise<ConnectionTestResult> => {
    if (!GroqClient.isValidKey(apiKey)) {
      setError('Clé API Groq invalide (doit commencer par gsk_)');
      return { success: false, error: 'Clé API invalide' };
    }

    setIsValidating(true);
    setError(null);

    try {
      const newClient = new GroqClient(apiKey);
      const testResult = await newClient.testConnection();

      if (!testResult.success) {
        throw new Error(testResult.error);
      }

      setClient(newClient);
      
      // Sauvegarder en session
      sessionStorage.setItem('groq_api_key', apiKey);
      
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Déconnecter
  const disconnect = useCallback(() => {
    setClient(null);
    setRateLimitInfo(null);
    setError(null);
    sessionStorage.removeItem('groq_api_key');
  }, []);

  // Auto-reconnexion au chargement
  useEffect(() => {
    const savedKey = sessionStorage.getItem('groq_api_key');
    if (savedKey && GroqClient.isValidKey(savedKey)) {
      initialize(savedKey);
    }
  }, [initialize]);

  // Stream chat avec mise à jour rate limit
  const streamChat = useCallback(async function* (
    message: string, 
    ragContext: { context?: string; sources?: SearchSource[] }, 
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!client) {
      throw new Error('Client Groq non initialisé');
    }

    const context = ragContext?.context || '';
    const sources = ragContext?.sources || [];

    for await (const chunk of client.streamChat(message, context, sources, options)) {
      // Mettre à jour rate limit info
      if (chunk.rateLimitInfo) {
        setRateLimitInfo(chunk.rateLimitInfo);
      }
      
      yield chunk;
    }
  }, [client]);

  return {
    // Actions
    initialize,
    disconnect,
    streamChat,

    // État
    client,
    isConnected: !!client,
    isValidating,
    error,
    rateLimitInfo,

    // Utilitaires
    availableModels: GroqClient.getAvailableModels(),
    isValidKey: GroqClient.isValidKey
  };
}

export default GroqClient;
export type { 
  RateLimitInfo, 
  GroqModel, 
  StreamChunk, 
  ChatOptions, 
  ChatResponse, 
  ConnectionTestResult 
};