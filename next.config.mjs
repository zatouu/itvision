/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Désactiver ESLint pendant le build pour l'instant
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Désactiver les erreurs TypeScript pendant le build si nécessaire
    ignoreBuildErrors: false,
  },
  
  // Configuration de sécurité
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          }
        ]
      }
    ]
  },
  
  // Configuration de sécurité pour les redirections
  async redirects() {
    return [
      // Redirection supprimée - gérée par le middleware d'authentification
    ]
  },
  
  // Variables d'environnement publiques sécurisées
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
    NEXT_PUBLIC_APP_NAME: 'Sécurité Électronique',
    JWT_SECRET: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production-very-long-and-secure-key-123456789',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'your-nextauth-secret-change-in-production-also-very-long-and-secure'
  },
  
  // Optimisations de sécurité
  poweredByHeader: false, // Masquer le header "Powered by Next.js"
  
  // Configuration stricte pour la production
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    compress: true,
    trailingSlash: false
  })
};

export default nextConfig;