// Routes publiques (pas de vérification)
export const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/market/creer-compte',
  '/forgot-password',
  '/reset-password',
  '/retrouver-ma-commande',
  '/api/auth',
  '/api/health',
  '/',
  '/about',
  '/services',
  '/produits',
  '/corporate-produits',
  '/contact',
  '/realisations',
  '/cgv',
  '/mentions-legales',
  '/politique-confidentialite',
  '/digitalisation',
  '/domotique',
  '/maintenance-digital',
  '/portail-valeur',
  '/generateur-devis',
  '/intervention',
  '/mobile-app',
  '/gestion-projets',
]

// Routes propres à la marketplace (accessible sur market.itvisionplus.sn)
export const MARKETPLACE_ROUTES = [
  '/panier',
  '/checkout',
  '/commandes',
  '/achats-groupes',
  '/retrouver-ma-commande',
  '/market',
  '/payment',
  '/paiement',
  '/grains',
]

// Routes API transversales (mobile / app) autorisées en CORS
export const MOBILE_API_PREFIXES = [
  '/api/services',
  '/api/auth/login',
  '/api/auth/mobile',
  '/api/auth/referral',
  '/api/wallet',
  '/api/notifications',
  '/api/client/profile',
  '/api/upload',
  '/api/payments',
  '/api/kyc',
  '/api/health',
]

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

export function isMarketplaceRoute(pathname: string): boolean {
  return MARKETPLACE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

export function isMobileApiRoute(pathname: string): boolean {
  return MOBILE_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export function getRequiredRole(pathname: string): string | null {
  if (pathname === '/messages' || pathname.startsWith('/messages/')) return 'AUTH'
  if (pathname === '/compte' || pathname.startsWith('/compte/')) return 'AUTH'
  if (pathname === '/market/compte' || pathname.startsWith('/market/compte/')) return 'AUTH'

  const adminRoutes = [
    '/admin',
    '/admin-reports',
    '/admin-factures',
    '/admin-prix',
    '/admin-produits',
    '/validation-rapports',
    '/workflows',
  ]

  for (const route of adminRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) return 'ADMIN'
  }

  if (pathname.startsWith('/client-portal')) return 'CLIENT'
  if (pathname.startsWith('/tech-interface')) return 'TECHNICIAN'
  if (pathname.startsWith('/portail-entreprise')) return 'CLIENT_ENTERPRISE'
  return null
}
