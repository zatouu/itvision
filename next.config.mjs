import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,
  customWorkerSrc: "worker",
});

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
            value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), fullscreen=(self)'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://pay.wave.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.alicdn.com https://*.aliexpress.com https://*.alibaba.com https://*.1688.com https://api.wave.com https://api.orange.com https://api.free.sn; frame-src https://js.stripe.com https://pay.wave.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
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
    // Note: do NOT expose server secrets (JWT_SECRET / NEXTAUTH_SECRET) here.
  },
  
  // Autoriser les images externes (CDN AliExpress / 1688 / Alibaba)
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: '**.aliexpress.com' },
      { protocol: 'https', hostname: '**.1688.com' },
      { protocol: 'https', hostname: '**.alibaba.com' },
      { protocol: 'https', hostname: 'ae*.alicdn.com' },
      { protocol: 'https', hostname: 'cbu*.alicdn.com' },
      { protocol: 'https', hostname: 'img.alicdn.com' },
      { protocol: 'https', hostname: 'gw.alicdn.com' },
      { protocol: 'http', hostname: '**.alicdn.com' },
    ],
  },

  // Augmenter la limite de taille du body pour les uploads vidéo (défaut ~4MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '150mb',
    },
  },

  outputFileTracingIncludes: {
    '/': ['./lib/**/*'],
  },

  // Packages serveur exclus du bundling (binaires natifs)
  serverExternalPackages: ['playwright', 'playwright-core'],
  
  // Optimisations de sécurité
  poweredByHeader: false, // Masquer le header "Powered by Next.js"
  
  // Configuration stricte pour la production
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    compress: true,
    trailingSlash: false
  })
};

export default withPWA(nextConfig);