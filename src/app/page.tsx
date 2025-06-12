'use client';

import { useState } from 'react';
import WelcomePage from '@/components/WelcomePage';
import SetupPage from '@/components/SetupPage';
import ChatPage from '@/components/ChatPage';

export default function PortfolioApp() {
  const [step, setStep] = useState<'welcome' | 'setup' | 'chat'>('welcome');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.1-8b-instant');

  return (
    <div className="min-h-screen bg-gray-900">
      {step === 'welcome' && (
        <WelcomePage onNext={() => setStep('setup')} />
      )}
      
      {step === 'setup' && (
        <SetupPage
          onBack={() => setStep('welcome')}
          onNext={() => setStep('chat')}
          apiKey={apiKey}
          setApiKey={setApiKey}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />
      )}
      
      {step === 'chat' && (
        <ChatPage
          onBack={() => setStep('setup')}
          selectedModel={selectedModel}
        />
      )}
    </div>
  );
}