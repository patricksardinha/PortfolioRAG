'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Code, Cpu, Database, HelpCircle, Shield, Key, Globe, ExternalLink, ArrowRight } from 'lucide-react';import { useGroq } from '@/lib/groq';
import searchEngine from '@/lib/search';
import Modal from './Modal';
import { formatPatrickResponse } from './Format';

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

interface ChatPageProps {
  onBack: () => void;
  selectedModel: string;
}

export default function ChatPage({ onBack, selectedModel }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTechStack, setShowTechStack] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  
  const groq = useGroq();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = [
    "Quel est ton parcours professionnel ?",
    "Quelles technologies maîtrises-tu ?",
    "Quelle est ta formation ?",
    "Où as-tu travaillé ?",
  ];

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || currentMessage.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    // Animation: effacer ancien message puis ajouter nouveau
    if (messages.length > 0) {
      setMessages([]);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setMessages([userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Recherche RAG
      const ragResult = searchEngine.search(text, {
        topK: 3,
        minSimilarity: 0.1
      });

      // Message assistant avec streaming
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        sources: ragResult.sources,
        isStreaming: true
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Stream response
      let fullContent = '';
      
      for await (const chunk of groq.streamChat(
        text,
        { 
          context: ragResult.context, 
          sources: ragResult.sources 
        },
        { model: selectedModel }
      )) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: fullContent }
              : msg
          ));
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error);
        }
      }

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
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Zone principale de chat */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-6 flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              {groq.availableModels.find(m => m.id === selectedModel)?.name}
            </span>
            {groq.rateLimitInfo && (
              <span className="text-xs text-gray-500">
                {groq.rateLimitInfo.remainingTokens} tokens
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTechStack(true)}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg"
              title="Stack technique"
            >
              <Code size={18} />
            </button>

            <button
              onClick={() => setShowExplanation(true)}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg"
              title="Comment ça marche"
            >
              <HelpCircle size={18} />
            </button>
            
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg"
              title="Retour aux paramètres"
            >
              <ArrowLeft size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 bg-gray-900 rounded-xl overflow-hidden relative">
          {/* Contenu du chat avec scroll interne */}
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 chat-scroll">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-6">
                      <Cpu className="text-gray-300" size={32} />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">
                      Assistant IA Prêt
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      Posez-moi vos questions sur mon parcours professionnel. 
                      Je puise mes réponses directement dans mon CV et mes projets grâce à un système RAG.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
									{messages.filter(m => m.role === 'assistant').map((message) => (
										<div key={message.id} className="space-y-6">
											{/* Réponse IA */}
											<div className="bg-gray-750 rounded-xl p-6">
												<div className="prose prose-invert max-w-none">
													<div 
														className="text-gray-100 leading-relaxed whitespace-pre-wrap"
														dangerouslySetInnerHTML={{ __html: formatPatrickResponse(message.content) }}
													/>
												</div>
												
												{/* Indicateur streaming */}
												{message.isStreaming && (
													<div className="mt-4 flex items-center gap-2 text-gray-400">
														<div className="flex gap-1">
															<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse"></div>
															<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
															<div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
														</div>
														<span className="text-xs">En cours de génération...</span>
													</div>
												)}
											</div>

											{/* Sources */}
											{message.sources && message.sources.length > 0 && (
												<div className="bg-gray-850 rounded-lg p-4">
													<h4 className="text-sm font-medium text-gray-300 mb-3">Sources consultées</h4>
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
														{message.sources.map((source, index) => (
															<div
																key={index}
																className="bg-gray-800 rounded-lg p-3"
															>
																<div className="flex items-center justify-between mb-1">
																	<span className="text-xs font-medium text-gray-200">
																		{source.title}
																	</span>
																	<span className="text-xs text-gray-400">
																		{source.similarity}%
																	</span>
																</div>
																<span className="text-xs text-gray-400 capitalize">
																	{source.type}
																</span>
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									))}
									<div ref={messagesEndRef} />
								</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-gray-900 hover:bg-gray-800 rounded-full text-gray-300 transition-all disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-gray-900 rounded-lg">
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Posez votre question..."
                disabled={isLoading}
                className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none disabled:opacity-50 text-center"
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !currentMessage.trim()}
              className="p-4 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Stack Technique */}
			<Modal
				isOpen={showTechStack}
				onClose={() => setShowTechStack(false)}
				title="Stack Technique du Portfolio"
				size="lg"
			>
				<div className="space-y-6">
					{/* Introduction */}
					<div className="border-l-4 border-gray-600 pl-6">
						<div className="flex items-center gap-3 mb-3">
							<Code className="text-gray-300" size={24} />
							<h3 className="text-xl font-semibold text-white">Architecture moderne</h3>
						</div>
						<p className="text-gray-300 leading-relaxed">
							Découvrez les technologies qui donnent vie à ce portfolio interactif
						</p>
					</div>

					{/* Frontend */}
					<div className="border-l-4 border-blue-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Code className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Frontend</h4>
						</div>
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Next.js</h5>
								<p className="text-gray-400 text-sm">App Router, Server Components, optimisations</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">TypeScript</h5>
								<p className="text-gray-400 text-sm">Type safety, code robuste</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Tailwind CSS</h5>
								<p className="text-gray-400 text-sm">Design system, responsive</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">React Hooks</h5>
								<p className="text-gray-400 text-sm">State management, effets, performances</p>
							</div>
						</div>
					</div>

					{/* Intelligence Artificielle */}
					<div className="border-l-4 border-green-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Cpu className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Intelligence Artificielle</h4>
						</div>
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Groq API</h5>
								<p className="text-gray-400 text-sm">LPU ultra-rapide, streaming temps réel</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">RAG System</h5>
								<p className="text-gray-400 text-sm">Recherche vectorielle, contexte enrichi</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Vector Search</h5>
								<p className="text-gray-400 text-sm">Similarité cosinus, index optimisé</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Streaming</h5>
								<p className="text-gray-400 text-sm">Réponses en temps réel, UX fluide</p>
							</div>
						</div>
					</div>

					{/* Architecture */}
					<div className="border-l-4 border-purple-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Database className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Architecture</h4>
						</div>
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">BYOK</h5>
								<p className="text-gray-400 text-sm">Bring Your Own Key, contrôle total</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Client-side Processing</h5>
								<p className="text-gray-400 text-sm">Traitement local</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Static JSON</h5>
								<p className="text-gray-400 text-sm">Index pré-calculé, performance optimale</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-2">Zero Backend</h5>
								<p className="text-gray-400 text-sm">Hébergement gratuit, sécurité maximale</p>
							</div>
						</div>
					</div>

					{/* Performance */}
					<div className="border-l-4 border-orange-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<ArrowRight className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Performance & Optimisations</h4>
						</div>
						<div className="bg-gray-800 rounded-lg p-4">
							<div className="grid sm:grid-cols-2 gap-4">
								<div className="text-center">
									<div className="text-2xl font-bold text-white mb-1">&lt;20ms</div>
									<div className="text-gray-400 text-sm">Recherche vectorielle</div>
								</div>
								<div className="text-center">
									<div className="text-2xl font-bold text-white mb-1">0€</div>
									<div className="text-gray-400 text-sm">Coût</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Modal>

			{/* Modal Explication */}
			<Modal
				isOpen={showExplanation}
				onClose={() => setShowExplanation(false)}
				title="Comment fonctionne cet Assistant IA ?"
				size="xl"
			>
				<div className="space-y-6">
					{/* Introduction */}
					<div className="border-l-4 border-gray-600 pl-6">
						<div className="flex items-center gap-3 mb-3">
							<Cpu className="text-gray-300" size={24} />
							<h3 className="text-xl font-semibold text-white">Architecture RAG</h3>
						</div>
						<p className="text-gray-300 leading-relaxed">
							Cet assistant combine <strong>recherche vectorielle</strong> et <strong>intelligence artificielle </strong> 
							pour répondre précisément à vos questions sur mon profil professionnel. Chaque réponse est basée 
							sur des données réelles extraites de mon CV. Toutefois, des erreurs peuvent survenir. Vous pouvez retrouver 
							toutes mes informations sur mon LinkedIn ou en me contactant directement.
						</p>
					</div>

					{/* Flux simplifié */}
					<div className="border-l-4 border-blue-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Database className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Flux de données</h4>
						</div>
						<div className="bg-gray-800 rounded-lg p-4">
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300">Votre Question</div>
								<div className="text-gray-500">→</div>
								<div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300">Recherche Vectorielle</div>
								<div className="text-gray-500">→</div>
								<div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300">Contexte Enrichi</div>
								<div className="text-gray-500">→</div>
								<div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300">IA Groq</div>
								<div className="text-gray-500">→</div>
								<div className="bg-gray-700 px-3 py-2 rounded-lg text-gray-300">Réponse Personnalisée</div>
							</div>
						</div>
					</div>

					{/* Étapes détaillées */}
					<div className="space-y-4">
						{/* Étape 1 */}
						<div className="border-l-4 border-green-500 pl-6">
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
									<span className="text-white font-bold">1</span>
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<Database className="text-gray-300" size={18} />
										<h5 className="font-semibold text-white">Préparation des données</h5>
									</div>
									<p className="text-gray-300 text-sm mb-3">
										Mon CV est analysé et découpé en sections sémantiques. Chaque partie (expérience, compétences, projets) 
										est transformée en vecteurs numériques et indexée pour une recherche ultra-rapide.
									</p>
									<div className="bg-gray-800 rounded-lg p-3">
										<div className="text-xs text-gray-400">
											<strong className="text-gray-300">Technologies :</strong> Embeddings TF-IDF, index JSON statique, script Node.js custom
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Étape 2 */}
						<div className="border-l-4 border-yellow-500 pl-6">
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
									<span className="text-white font-bold">2</span>
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<Code className="text-gray-300" size={18} />
										<h5 className="font-semibold text-white">Recherche vectorielle</h5>
									</div>
									<p className="text-gray-300 text-sm mb-3">
										Votre question est convertie en vecteur avec la même méthode. Le système calcule 
										la similarité avec tous les chunks pour trouver les plus pertinents en moins de 10ms.
									</p>
									<div className="bg-gray-800 rounded-lg p-3">
										<div className="text-xs text-gray-400">
											<strong className="text-gray-300">Performance :</strong> Similarité cosinus optimisée, boost par type de section, traitement client
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Étape 3 */}
						<div className="border-l-4 border-purple-500 pl-6">
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
									<span className="text-white font-bold">3</span>
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<Cpu className="text-gray-300" size={18} />
										<h5 className="font-semibold text-white">Enrichissement du contexte</h5>
									</div>
									<p className="text-gray-300 text-sm mb-3">
										Les sections les plus pertinentes sont assemblées avec votre question dans un prompt optimisé. 
										Le système ajoute des instructions pour des réponses précises et contextuelles.
									</p>
									<div className="bg-gray-800 rounded-lg p-3">
										<div className="text-xs text-gray-400">
											<strong className="text-gray-300">Optimisations :</strong> Prompt engineering, limite tokens, hiérarchisation par pertinence
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Étape 4 */}
						<div className="border-l-4 border-red-500 pl-6">
							<div className="flex items-start gap-4">
								<div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
									<span className="text-white font-bold">4</span>
								</div>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-2">
										<ArrowRight className="text-gray-300" size={18} />
										<h5 className="font-semibold text-white">Génération par Groq AI</h5>
									</div>
									<p className="text-gray-300 text-sm mb-3">
										L'IA Groq génère une réponse personnalisée en streaming temps réel. Chaque mot arrive 
										instantanément grâce aux puces LPU spécialisées.
									</p>
									<div className="bg-gray-800 rounded-lg p-3">
										<div className="text-xs text-gray-400">
											<strong className="text-gray-300">Avantages Groq :</strong> Latence ultra-faible, modèles optimisés, 6000 tokens/minute gratuits
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Sécurité */}
					<div className="border-l-4 border-orange-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Shield className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Sécurité & Confidentialité</h4>
						</div>
						<div className="grid sm:grid-cols-2 gap-4">
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-3 flex items-center gap-2">
									<Key className="text-gray-300" size={16} />
									Vos données
								</h5>
								<div className="space-y-2 text-sm text-gray-300">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Clé API en session uniquement</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Questions directes à Groq</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Aucun logging serveur</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Connexion HTTPS chiffrée</span>
									</div>
								</div>
							</div>
							<div className="bg-gray-800 rounded-lg p-4">
								<h5 className="font-medium text-white mb-3 flex items-center gap-2">
									<Globe className="text-gray-300" size={16} />
									Mes données
								</h5>
								<div className="space-y-2 text-sm text-gray-300">
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>CV public dans ce portfolio</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Index généré statiquement</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Aucune info sensible</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
										<span>Code source disponible</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Pourquoi Groq */}
					<div className="border-l-4 border-cyan-500 pl-6">
						<div className="flex items-center gap-3 mb-4">
							<Cpu className="text-gray-300" size={20} />
							<h4 className="font-semibold text-white text-lg">Pourquoi Groq spécifiquement ?</h4>
						</div>
						<div className="grid sm:grid-cols-3 gap-4">
							<div className="bg-gray-800 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3">
									<ArrowRight className="text-gray-300" size={20} />
								</div>
								<h5 className="font-medium text-white mb-2">Ultra-rapide</h5>
								<p className="text-xs text-gray-400">Puces LPU 10x plus rapides que les GPU traditionnels</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3">
									<span className="text-gray-300 text-lg font-bold">€0</span>
								</div>
								<h5 className="font-medium text-white mb-2">Gratuit</h5>
								<p className="text-xs text-gray-400">6000 tokens/minute sans carte bancaire</p>
							</div>
							<div className="bg-gray-800 rounded-lg p-4 text-center">
								<div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-3">
									<HelpCircle className="text-gray-300" size={20} />
								</div>
								<h5 className="font-medium text-white mb-2">Modèles performants</h5>
								<p className="text-xs text-gray-400">Llama 3.1 et Mixtral optimisés</p>
							</div>
						</div>
					</div>
				</div>
			</Modal>
    </div>
  );
}