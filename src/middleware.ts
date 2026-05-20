import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { csrfProtection } from '@/lib/csrf-protection'
import { getJwtSecretKey } from '@/lib/jwt-secret'

// Routes publiques (pas de vérification)
const PUBLIC_ROUTES = [
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

async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; role?: string; companyClientId?: string }> {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return { authenticated: false }
  }

  try {
    const secret = getJwtSecretKey()
    const { payload } = await jwtVerify(token, secret)
    const role = String(payload.role || '').toUpperCase()
    const companyClientId = typeof (payload as any).companyClientId === 'string' ? (payload as any).companyClientId : undefined
    return { authenticated: true, role, companyClientId }
  } catch {
    return { authenticated: false }
  }
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

function getRequiredRole(pathname: string): string | null {
  // Messagerie: accessible à tout utilisateur authentifié
  if (pathname === '/messages' || pathname.startsWith('/messages/')) {
    return 'AUTH'
  }

  // Espace compte catalogue: nécessite un utilisateur authentifié
  if (pathname === '/compte' || pathname.startsWith('/compte/')) return 'AUTH'

  // Point d'entrée Market vers le compte client
  if (pathname === '/market/compte' || pathname.startsWith('/market/compte/')) return 'AUTH'

  // Routes admin (y compris celles en dehors de /admin/)
  const adminRoutes = [
    '/admin',
    '/admin-reports',
    '/admin-factures',
    '/admin-prix',
    '/admin-produits',
    '/validation-rapports',
    '/workflows'
  ]
  
  for (const route of adminRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return 'ADMIN'
    }
  }
  
  if (pathname.startsWith('/client-portal')) return 'CLIENT'
  if (pathname.startsWith('/tech-interface')) return 'TECHNICIAN'
  if (pathname.startsWith('/portail-entreprise')) return 'CLIENT_ENTERPRISE'
  return null
}

// Routes propres à la marketplace (accessible uniquement sur market.itvisionplus.sn)
const MARKETPLACE_ROUTES = [
  '/panier',
  '/commandes',
  '/achats-groupes',
  '/retrouver-ma-commande',
  '/market',
  '/payment',
  '/paiement',
]

function isMarketplaceRoute(pathname: string): boolean {
  return MARKETPLACE_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )
}

function getHost(request: NextRequest): string {
  return request.headers.get('host') || request.nextUrl.host || ''
}

function isMarketDomain(request: NextRequest): boolean {
  const host = getHost(request)
  return host.startsWith('market.')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = getHost(request)
  const onMarketDomain = isMarketDomain(request)

  // Ignorer les fichiers statiques et les assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') // fichiers avec extension (images, etc.)
  ) {
    // Pour les API, on applique juste la protection CSRF
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.next()
      const csrfResult = csrfProtection.middleware(request)
      if (csrfResult) return csrfResult

      // Headers de sécurité pour API
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      return response
    }
    return NextResponse.next()
  }

  // ─── ROUTAGE PAR SOUS-DOMAINE ───

  // Sur market.itvisionplus.sn : rediriger les routes non-marketplace vers le site principal
  if (onMarketDomain) {
    if (pathname === '/') {
      const marketHomeUrl = new URL('/market', request.url)
      return NextResponse.rewrite(marketHomeUrl)
    }

    const isAllowedOnMarket =
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/produits') ||
      pathname.startsWith('/compte') ||
      pathname.startsWith('/messages') ||
      isMarketplaceRoute(pathname)

    if (!isAllowedOnMarket) {
      const marketHomeUrl = new URL('/market', request.url)
      return NextResponse.redirect(marketHomeUrl)
    }
  }

  // Sur itvisionplus.sn : rediriger les routes marketplace vers market.itvisionplus.sn
  if (!onMarketDomain) {
    if (isMarketplaceRoute(pathname)) {
      const marketUrl = new URL(pathname, request.url)
      marketUrl.host = `market.${host}`
      return NextResponse.redirect(marketUrl)
    }
    // /produits sur le site principal → vitrine corporate B2B/B2C
    if (pathname === '/produits' || pathname.startsWith('/produits/')) {
      const corporateUrl = new URL(pathname.replace('/produits', '/corporate-produits'), request.url)
      return NextResponse.rewrite(corporateUrl)
    }
  }

  // Routes publiques - pas de vérification
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next()
    applySecurityHeaders(response, pathname)
    return response
  }

  // Vérification de l'authentification pour les routes protégées
  const requiredRole = getRequiredRole(pathname)
  
  if (requiredRole) {
    const { authenticated, role, companyClientId } = await verifyAuth(request)
    
    if (!authenticated) {
      // Rediriger vers la page de login appropriée
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Portail entreprise : CLIENT + companyClientId obligatoire
    if (requiredRole === 'CLIENT_ENTERPRISE') {
      if (role !== 'CLIENT' && !['ADMIN', 'SUPER_ADMIN'].includes(role || '')) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      if (role === 'CLIENT' && !companyClientId) {
        // Client marketplace : rediriger vers son portail
        return NextResponse.redirect(new URL('/compte', request.url))
      }
      const response = NextResponse.next()
      applySecurityHeaders(response, pathname)
      // No-cache pour pages sensibles
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }

    // Compte marketplace : rediriger les clients entreprise vers leur portail
    if (requiredRole === 'AUTH' && (pathname === '/compte' || pathname.startsWith('/compte/'))) {
      if (role === 'CLIENT' && companyClientId) {
        return NextResponse.redirect(new URL('/portail-entreprise', request.url))
      }
    }

    // Messagerie: tout utilisateur authentifié
    if (requiredRole === 'AUTH') {
      const response = NextResponse.next()
      applySecurityHeaders(response, pathname)
      return response
    }
    
    // Rôles ayant accès admin
    const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']
    
    // Vérifier le rôle
    if (requiredRole === 'ADMIN' && !ADMIN_ROLES.includes(role || '')) {
      // Rediriger les non-admins vers leur portail
      if (role === 'CLIENT') {
        return NextResponse.redirect(new URL('/compte', request.url))
      } else if (role === 'TECHNICIAN') {
        return NextResponse.redirect(new URL('/tech-interface', request.url))
      } else if (role === 'PRODUCT_MANAGER') {
        return NextResponse.redirect(new URL('/admin/products', request.url))
      } else if (role === 'ACCOUNTANT') {
        return NextResponse.redirect(new URL('/admin/accounting', request.url))
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (requiredRole === 'CLIENT' && !['CLIENT', ...ADMIN_ROLES].includes(role || '')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (requiredRole === 'TECHNICIAN' && !['TECHNICIAN', ...ADMIN_ROLES].includes(role || '')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Créer la réponse
  const response = NextResponse.next()
  applySecurityHeaders(response, pathname)
  return response
}

function applySecurityHeaders(response: NextResponse, pathname: string) {
  const scriptSrc =
    process.env.NODE_ENV === 'production'
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  const connectSrc =
    process.env.NODE_ENV === 'production'
      ? "connect-src 'self' https: wss:"
      : "connect-src 'self' http: https: ws: wss:"

  // Headers de sécurité essentiels
  const securityHeaders: Record<string, string> = {
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      connectSrc,
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Application': 'IT-Vision-Plus',
    'X-Version': '1.0.0'
  }

  // HSTS en production
  if (process.env.NODE_ENV === 'production') {
    securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  // Appliquer les headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Cache control pour les pages sensibles
  if (
    pathname.includes('/admin') ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname.includes('/market/creer-compte') ||
    pathname.includes('/market/compte') ||
    pathname.includes('/client-portal') ||
    pathname.includes('/tech-interface') ||
    pathname.includes('/compte') ||
    pathname.includes('/panier')
  ) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
}

// Configuration des routes où appliquer le middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}