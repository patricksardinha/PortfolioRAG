// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Configuration expérimentale
  experimental: {
    serverComponentsExternalPackages: []
  },
  
  // Configuration Webpack pour gérer les imports JSON et fallbacks
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Fallbacks pour le navigateur (éviter erreurs Node.js modules)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    
    // Permettre import de fichiers JSON statiques
    config.module.rules.push({
      test: /\.json$/,
      type: 'json'
    });

    return config;
  },

  // Configuration pour les imports statiques
  transpilePackages: [],
  
  // Optimisations de build
  swcMinify: true,
  
  // Configuration des images (si besoin plus tard)
  images: {
    domains: [],
    unoptimized: false
  },

  // Headers de sécurité et performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  },

  // Redirection pour API routes (si nécessaire)
  async rewrites() {
    return [];
  },

  // Variables d'environnement publiques
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Configuration TypeScript stricte
  typescript: {
    // Pendant le développement, vous pouvez mettre false pour ignorer certaines erreurs
    ignoreBuildErrors: false,
  },

  // Configuration ESLint
  eslint: {
    // Pendant le développement, vous pouvez mettre true pour ignorer les erreurs ESLint au build
    ignoreDuringBuilds: false,
  },

  // Configuration de sortie (pour déploiement statique si besoin)
  // output: 'export', // Décommenter pour export statique
  // trailingSlash: true, // Décommenter pour export statique
  // images: { unoptimized: true }, // Décommenter pour export statique
}

export default nextConfig