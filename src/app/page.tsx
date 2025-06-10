'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Key, Sparkles, MessageSquare, ArrowRight, ExternalLink, Github } from 'lucide-react';
import { useGroq } from '@/lib/groq';
import searchEngine from '@/lib/search';

// Types pour les messages
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    type: string;
    similarity: number;
  }>;
  isStreaming?: boolean;
}

export default function PortfolioPage() {
  // États principaux
  const [step, setStep] = useState<'welcome' | 'setup' | 'chat'>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-8b-instant');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Services
  const groq = useGroq();
  
  // Références
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur input après setup
  useEffect(() => {
    if (step === 'chat') {
      inputRef.current?.focus();
    }
  }, [step]);

  // Initialiser Groq
  const handleAPISetup = async () => {
    if (!groq.isValidKey(apiKey)) {
      alert('Clé API Groq invalide (doit commencer par gsk_)');
      return;
    }

    const result = await groq.initialize(apiKey);
    if (result.success) {
      setStep('chat');
    } else {
      alert(`Erreur de connexion: ${result.error}`);
    }
  };

  // Envoyer message avec RAG + streaming
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    // Animation de suppression du message précédent puis ajout du nouveau
    if (messages.length > 0) {
      // Animation de fade out
      setMessages([]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setMessages([userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // 1. Recherche RAG
      const ragResult = searchEngine.search(userMessage.content, {
        topK: 3,
        minSimilarity: 0.1
      });

      console.log('RAG Results:', ragResult); // Debug

      // 2. Préparer message assistant avec streaming
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sources: ragResult.sources,
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      // 3. Stream response
      let fullContent = '';
      
      for await (const chunk of groq.streamChat(
        userMessage.content,
        { 
          context: ragResult.context, 
          sources: ragResult.sources 
        },
        { model: selectedModel }
      )) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          
          // Mettre à jour le message en temps réel
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: fullContent }
              : msg
          ));
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        }
      }

      // Finaliser le message
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('Erreur chat:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Désolé, une erreur s'est produite: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev.slice(0, 1), errorMessage]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Suggestions de questions
  const suggestions = [
    "Quelles sont tes compétences techniques ?",
    "Parle-moi de ton expérience professionnelle",
    "Quels projets as-tu réalisés ?",
    "Quel est ton parcours de formation ?",
    "Comment puis-je te contacter ?",
    "Qu'est-ce qui te passionne dans le développement ?"
  ];

  // Interface d'accueil
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-6 py-12">
          {/* Header */}
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles size={16} />
              Portfolio IA Interactif
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Bonjour ! Je suis{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                John Developer
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Développeur Full-Stack spécialisé en IA. Posez-moi vos questions sur mon parcours, 
              mes compétences ou mes projets — mon assistant IA vous répondra en temps réel !
            </p>
          </header>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="text-blue-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Chat Intelligent</h3>
              <p className="text-gray-600 text-sm">
                Posez vos questions en langage naturel et recevez des réponses personnalisées basées sur mon CV
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Key className="text-green-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gratuit & Privé</h3>
              <p className="text-gray-600 text-sm">
                Utilisez votre clé API Groq gratuite. Vos données restent privées, aucun coût pour moi
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="text-purple-600" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Streaming Real-time</h3>
              <p className="text-gray-600 text-sm">
                Réponses fluides avec streaming, sources citées et interface épurée
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <button
              onClick={() => setStep('setup')}
              className="inline-flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Commencer l'expérience
              <ArrowRight size={20} />
            </button>
            
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
              <a href="https://github.com" className="flex items-center gap-2 hover:text-gray-700">
                <Github size={16} />
                Code source
              </a>
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-700">
                <ExternalLink size={16} />
                Créer clé Groq
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interface de configuration API
  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Key className="text-blue-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Configuration IA</h2>
              <p className="text-gray-600">
                Utilisez votre clé API Groq gratuite (6000 tokens/min)
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clé API Groq
                </label>
                <input
                  type="password"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && handleAPISetup()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <a 
                    href="https://console.groq.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Créer une clé gratuite sur console.groq.com
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modèle IA
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {groq.availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Retour
                </button>
                <button
                  onClick={handleAPISetup}
                  disabled={groq.isValidating || !groq.isValidKey(apiKey)}
                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {groq.isValidating ? 'Validation...' : 'Continuer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Interface de chat
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header chat */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Portfolio Chat Assistant</h1>
            <p className="text-sm text-gray-600">
              Alimenté par {groq.availableModels.find(m => m.id === selectedModel)?.name} • Questions illimitées
            </p>
          </div>
          
          <button
            onClick={() => {
              groq.disconnect();
              setStep('welcome');
              setMessages([]);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Zone de chat */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="text-blue-600" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Posez-moi vos questions !
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Je connais tout sur mon parcours, mes compétences et mes projets
                  </p>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {suggestions.slice(0, 4).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMessage(suggestion)}
                        className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-2xl px-4 py-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Sources pour réponses IA */}
                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Sources consultées :</p>
                          <div className="flex flex-wrap gap-1">
                            {message.sources.map((source, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded"
                                title={`${source.title} - ${source.type}`}
                              >
                                {source.title} ({source.similarity}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Indicateur streaming */}
                      {message.isStreaming && (
                        <div className="mt-2 flex items-center gap-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Zone de saisie */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Votre question..."
                disabled={isLoading}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !currentMessage.trim()}
                className="bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
            
            {groq.rateLimitInfo && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                Tokens restants: {groq.rateLimitInfo.remainingTokens || 'N/A'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}