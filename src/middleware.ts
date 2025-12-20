import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { csrfProtection } from '@/lib/csrf-protection'

// Routes protégées par rôle
const PROTECTED_ROUTES = {
  admin: [
    '/admin',
    '/admin-reports',
    '/admin-factures',
    '/admin-prix',
    '/admin-produits',
    '/validation-rapports',
    '/workflows'
  ],
  client: ['/client-portal', '/client-portal-v2'],
  technician: ['/tech-interface'],
}

// Routes publiques (pas de vérification)
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/',
  '/about',
  '/services',
  '/produits',
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

async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; role?: string }> {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return { authenticated: false }
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
    const { payload } = await jwtVerify(token, secret)
    const role = String(payload.role || '').toUpperCase()
    return { authenticated: true, role }
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
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
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

  // Routes publiques - pas de vérification
  if (isPublicRoute(pathname)) {
    const response = NextResponse.next()
    applySecurityHeaders(response, pathname)
    return response
  }

  // Vérification de l'authentification pour les routes protégées
  const requiredRole = getRequiredRole(pathname)
  
  if (requiredRole) {
    const { authenticated, role } = await verifyAuth(request)
    
    if (!authenticated) {
      // Rediriger vers la page de login appropriée
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Vérifier le rôle
    if (requiredRole === 'ADMIN' && role !== 'ADMIN') {
      // Rediriger les non-admins vers leur portail
      if (role === 'CLIENT') {
        return NextResponse.redirect(new URL('/client-portal', request.url))
      } else if (role === 'TECHNICIAN') {
        return NextResponse.redirect(new URL('/tech-interface', request.url))
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (requiredRole === 'CLIENT' && !['CLIENT', 'ADMIN'].includes(role || '')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    if (requiredRole === 'TECHNICIAN' && !['TECHNICIAN', 'ADMIN'].includes(role || '')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Créer la réponse
  const response = NextResponse.next()
  applySecurityHeaders(response, pathname)
  return response
}

function applySecurityHeaders(response: NextResponse, pathname: string) {
  // Headers de sécurité essentiels
  const securityHeaders: Record<string, string> = {
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' wss:",
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
  if (pathname.includes('/admin') || pathname.includes('/login') || pathname.includes('/client-portal') || pathname.includes('/tech-interface')) {
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