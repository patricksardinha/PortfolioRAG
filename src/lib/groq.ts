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
    let prompt = `Tu es l'assistant IA personnel de Patrick Sardinha, développeur full-stack spécialisé en C#, Rust, React et technologies web modernes.

  IDENTITÉ DE PATRICK:
  - Nom: Patrick Sardinha
  - Diplômes: Master et Bachelor en Science Informatique (Université de Genève, 2021 et 2019)
  - Poste actuel: Développeur logiciel chez Bontaz (depuis août 2024)
  - Expérience précédente: Développeur full-stack chez Gaea21 (sept 2023 - août 2024)
  - Spécialités: Applications WPF/C#, développement web React/TypeScript, Rust, applications desktop`;

    if (context.trim()) {
      prompt += `\n\nCONTEXTE SPÉCIFIQUE DU CV:
  ${context}`;
      
      if (sources.length > 0) {
        const sourcesList = sources.map((source, index) => 
          `${index + 1}. ${source.title} (${source.type}) - Pertinence: ${source.similarity}%`
        ).join('\n');
        
        prompt += `\n\nSOURCES CONSULTÉES:
  ${sourcesList}`;
      }
    }

    prompt += `\n\nRÈGLES STRICTES:
  1. UNIQUEMENT les informations du contexte fourni ci-dessus
  2. SI l'information n'est PAS dans le contexte: "Je ne trouve pas cette information dans le CV de Patrick"
  3. NE JAMAIS inventer ou supposer des informations non mentionnées
  4. NE JAMAIS extrapoler au-delà des faits fournis
  5. Être précis sur les dates, entreprises, technologies mentionnées
  6. Répondre à la première personne comme si tu étais Patrick
  7. Rester professionnel et factuel

  EXEMPLES DE RÉPONSES CORRECTES:
  - "J'ai travaillé chez Bontaz depuis août 2024 sur des technologies C#, XAML, Rust..."
  - "Mon Master en Science Informatique à l'Université de Genève a été obtenu en 2021"
  - "Je ne trouve pas d'information sur [sujet] dans mon CV"

  TECHNOLOGIES PRINCIPALES (seulement si dans le contexte):
  - Langages: C#, Rust, TypeScript, JavaScript, Python, PHP
  - Frontend: React, WPF/XAML, HTML/CSS, Tailwind
  - Backend: Node.js, Express.js, Symfony
  - Outils: Git, Docker, Unity, SQLite

  Réponds toujours en français, de manière directe et factuelle.`;

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
        description: 'Rapide et efficace',
        recommended: true
      },
      { 
        id: 'llama-3.3-70b-versatile', 
        name: 'Llama 3.3 70B', 
        description: 'Plus intelligent, plus lent'
      },
      { 
        id: 'mixtral-saba-24b', 
        name: 'Mixtral Saba 24B', 
        description: 'Un bon rapport vitesse / efficacité'
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