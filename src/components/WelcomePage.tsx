'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, MessageSquare, Key, Sparkles, Github, ExternalLink } from 'lucide-react';

interface WelcomePageProps {
  onNext: () => void;
}

export default function WelcomePage({ onNext }: WelcomePageProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showCards, setShowCards] = useState(false);
  
  const fullText = "Bienvenue sur mon portfolio !";
  
  // Effet de machine à écrire
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsTypingComplete(true);
        setTimeout(() => setShowCards(true), 500);
      }
    }, 30);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-y-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-screen flex flex-col justify-center">
        {/* Header avec effet streaming */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 min-h-[3rem] sm:min-h-[4rem] lg:min-h-[5rem]">
            <span className="text-white">
              {displayedText}
            </span>
            {!isTypingComplete && (
              <span className="animate-pulse text-gray-400">|</span>
            )}
          </h1>
          
          <div className={`transition-all duration-1000 ${isTypingComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed px-4">
              Je suis Patrick, développeur full stack et logiciels avec un intérêt particulier pour l'IA et l'automatisation. 
              Posez-moi vos questions sur mon parcours, mes compétences ou mes projets, mon assistant IA vous répondra avec plaisir !
            </p>
          </div>
        </header>

        {/* Feature Cards avec animation */}
        <div className={`transition-all duration-1000 delay-500 ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8 sm:mb-12">
            {[
              {
                icon: MessageSquare,
                title: "Chat Intelligent",
                description: "Posez vos questions en langage naturel et recevez des réponses personnalisées basées sur mon CV",
                delay: "0ms"
              },
              {
                icon: Key,
                title: "Gratuit & Privé",
                description: "Utilisez votre clé API Groq gratuite. Vos données restent privées, aucun coût pour moi",
                delay: "200ms"
              },
              {
                icon: Sparkles,
                title: "Streaming Real-time",
                description: "Réponses fluides avec streaming, sources citées et interface épurée",
                delay: "400ms"
              }
            ].map((card, index) => (
              <div
                key={index}
                className="bg-gray-800 p-4 sm:p-6 rounded-xl hover:bg-gray-750 transition-all duration-300 hover:transform hover:scale-105"
                style={{ animationDelay: card.delay }}
              >
                <div className="mb-4">
                  <card.icon className="text-gray-300" size={24} />
                </div>
                <h3 className="font-semibold text-white mb-3">{card.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`text-center transition-all duration-1000 delay-1000 ${showCards ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <button
            onClick={onNext}
            className="group inline-flex items-center gap-3 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105 text-sm sm:text-base"
          >
            Commencer l'expérience
            <ArrowRight 
              size={20} 
              className="group-hover:translate-x-1 transition-transform duration-300" 
            />
          </button>
          
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-gray-500">
            <a href="https://github.com" className="flex items-center gap-2 hover:text-gray-300 transition-colors">
              <Github size={16} />
              Code source
            </a>
            <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-gray-300 transition-colors">
              <ExternalLink size={16} />
              Créer clé Groq
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}