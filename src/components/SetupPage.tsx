'use client';

import { useState } from 'react';
import { Key, ArrowLeft, ArrowRight, HelpCircle, Shield, Code, Cpu, Zap, Brain, ExternalLink, Globe,  User } from 'lucide-react';import { useGroq } from '@/lib/groq';
import Modal from './Modal';

interface SetupPageProps {
  onBack: () => void;
  onNext: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export default function SetupPage({ 
  onBack, 
  onNext, 
  apiKey, 
  setApiKey, 
  selectedModel, 
  setSelectedModel 
}: SetupPageProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const groq = useGroq();

  const handleContinue = async () => {
    if (!groq.isValidKey(apiKey)) {
      alert('Clé API Groq invalide (doit commencer par gsk_)');
      return;
    }

    const result = await groq.initialize(apiKey);
    if (result.success) {
      onNext();
    } else {
      alert(`Erreur de connexion: ${result.error}`);
    }
  };

  const models = [
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B',
      description: 'Rapide et efficace',
      icon: Zap,
      specs: '8 milliards de paramètres',
      speed: 'Ultra-rapide',
      use: 'Conversations générales, réponses rapides'
    },
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B',
      description: 'Plus intelligent',
      icon: Brain,
      specs: '70 milliards de paramètres',
      speed: 'Modéré',
      use: 'Analyses complexes, raisonnement avancé'
    },
    {
      id: 'mixtral-saba-24b',
      name: 'Mixtral Saba 24B',
      description: 'Excellent en français',
      icon: Globe,
      specs: '24B architecture mixte',
      speed: 'Rapide',
      use: 'Multilingue, spécialisé français'
    }
  ];

   return (
    <div className="min-h-screen bg-gray-900 text-white overflow-y-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Configuration de l'Assistant IA</h2>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg px-2">
              Configurez votre accès à l'intelligence artificielle en quelques secondes
            </p>
          </div>

          {/* Configuration principale */}
          <div className="bg-gray-900 p-4 sm:p-6 lg:p-8 rounded-xl space-y-6 lg:space-y-8">
            {/* Layout en deux colonnes */}
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
              
              {/* Section clé API */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label className="block text-base sm:text-lg font-medium text-white">
                    Votre Clé API Groq
                  </label>
                  <button
                    onClick={() => setShowExplanation(true)}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors text-sm self-start sm:self-auto"
                  >
                    <HelpCircle size={16} />
                    Pourquoi cette clé ?
                  </button>
                </div>
                
                <input
                  type="password"
                  placeholder="gsk_xxxxxxxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-4 bg-gray-800 rounded-lg focus:ring-2 focus:ring-gray-500 focus:outline-none text-white placeholder-gray-400 text-base sm:text-lg"
                  onKeyPress={(e) => e.key === 'Enter' && handleContinue()}
                />
                <p className="text-sm text-gray-400">
                  <a 
                    href="https://console.groq.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Créer une clé gratuite sur console.groq.com →
                  </a>
                </p>
              </div>

              {/* Section modèle */}
              <div className="space-y-3 sm:space-y-4">
                <label className="block text-base sm:text-lg font-medium text-white">
                  Modèle d'Intelligence Artificielle
                </label>
                
                <div className="space-y-3">
                  {models.map(model => (
                    <label
                      key={model.id}
                      className={`flex items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                        selectedModel === model.id
                          ? 'bg-gray-700 ring-1 ring-gray-600'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.id}
                        checked={selectedModel === model.id}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="sr-only"
                      />
                      <div className="mr-4">
                        <model.icon size={20} className="text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-white">{model.name}</span>
                          {model.recommended && (
                            <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded self-start">
                              Recommandé
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-400">{model.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Boutons Navigation */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <button
                onClick={onBack}
                className="group inline-flex items-center fle gap-3 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105 text-sm sm:text-base order-2 sm:order-1"
              >
                <ArrowLeft size={20} />
                Retour
              </button>
              <button
                onClick={handleContinue}
                disabled={groq.isValidating || !groq.isValidKey(apiKey)}
                className="group inline-flex items-center gap-3 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                {groq.isValidating ? 'Validation...' : 'Continuer'}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'explication */}
        <Modal
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        title="Pourquoi utiliser votre propre clé API ?"
        size="lg"
        >
        <div className="space-y-6">
            {/* Introduction avec icône */}
            <div className="border-l-4 border-gray-600 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="text-gray-300" size={24} />
                <div>
                <h3 className="text-xl font-semibold text-white">Architecture BYOK</h3>
                <p className="text-sm text-gray-400">Bring Your Own Key</p>
                </div>
            </div>
            <p className="text-gray-300 leading-relaxed">
                Une approche qui vous donne le contrôle total de vos interactions 
                avec l'IA tout en gardant vos données privées.
            </p>
            </div>

            {/* Avantages pour vous */}
            <div className="border-l-4 border-blue-500 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <User className="text-gray-300" size={20} />
                <h4 className="font-semibold text-white text-lg">Côté utilisateurs</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Confidentialité absolue</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">6000 tokens/minute gratuits soit ~ 4500 mots/minutes</span>
                </div>
                </div>
                <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Contrôle total</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-300">Performance maximale</span>
                </div>
                </div>
            </div>
            </div>

            {/* Avantages pour le développeur */}
            <div className="border-l-4 border-green-500 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <Code className="text-gray-300" size={20} />
                <h4 className="font-semibold text-white text-lg">Côté développeur</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Portfolio gratuit à maintenir</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Aucune responsabilité données</span>
                </div>
                </div>
                <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Architecture innovante</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">Démonstration technique</span>
                </div>
                </div>
            </div>
            </div>

            {/* Fonctionnement */}
            <div className="border-l-4 border-purple-500 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <Cpu className="text-gray-300" size={20} />
                <h4 className="font-semibold text-white text-lg">Comment ça fonctionne</h4>
            </div>
            <div className="space-y-4">
                <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                    <h5 className="font-medium text-white mb-1">Traitement local de mon CV</h5>
                    <p className="text-gray-400 text-sm">
                    Mon CV est pré-traité en chunks indexés. Aucune donnée personnelle côté serveur.
                    </p>
                </div>
                </div>
                
                <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                    <h5 className="font-medium text-white mb-1">Recherche vectorielle client</h5>
                    <p className="text-gray-400 text-sm">
                    Votre question est comparée aux chunks directement dans votre navigateur.
                    </p>
                </div>
                </div>
                
                <div className="flex gap-4">
                <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                    <h5 className="font-medium text-white mb-1">Appel direct à Groq</h5>
                    <p className="text-gray-400 text-sm">
                    Le contexte + question sont envoyés directement à Groq avec votre clé.
                    </p>
                </div>
                </div>
            </div>
            </div>

            {/* Sécurité */}
            <div className="border-l-4 border-red-500 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <Shield className="text-gray-300" size={20} />
                <h4 className="font-semibold text-white text-lg">Sécurité et confidentialité</h4>
            </div>
            <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Key className="text-gray-300 mt-1" size={16} />
                    <div>
                    <strong className="text-white">Votre clé API :</strong>
                    <span className="text-gray-300 ml-2">
                        Stockée uniquement dans votre navigateur, jamais transmise.
                    </span>
                    </div>
                </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <HelpCircle className="text-gray-300 mt-1" size={16} />
                    <div>
                    <strong className="text-white">Vos questions :</strong>
                    <span className="text-gray-300 ml-2">
                        Envoyées directement à Groq, je n'ai aucun accès ni historique.
                    </span>
                    </div>
                </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Globe className="text-gray-300 mt-1" size={16} />
                    <div>
                    <strong className="text-white">Mes données :</strong>
                    <span className="text-gray-300 ml-2">
                        Mon CV est public dans ce portfolio, aucune information sensible exposée.
                    </span>
                    </div>
                </div>
                </div>
            </div>
            </div>

            {/* Call to action */}
            <div className="border-l-4 border-yellow-500 pl-6">
            <div className="flex items-center gap-3 mb-4">
                <ExternalLink className="text-gray-300" size={20} />
                <h4 className="font-semibold text-white text-lg">Prêt à commencer ?</h4>
            </div>
            <p className="text-gray-300 mb-4">
                Créez votre clé gratuite en 30 secondes sur Groq Console
            </p>
            <a 
                href="https://console.groq.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
                <ExternalLink size={16} />
                Créer ma clé Groq
            </a>
            </div>
        </div>
        </Modal>
    </div>
  );
}