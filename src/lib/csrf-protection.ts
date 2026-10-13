import { NextRequest, NextResponse } from 'next/server'
import { logSecurityViolation } from './security-logger'

/**
 * Protection CSRF : origine HTTPS identique pour les requêtes navigateur.
 * En absence d'origine/référent, GET /api/csrf fournit un jeton à renvoyer
 * dans X-CSRF-Token avec son cookie. Un Bearer seul n'utilise pas de session
 * ambiante. Les exceptions serveur gardent leur authentification propre.
 */

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const TOKEN_EXPIRY = 60 * 60 * 1000 // 1 heure

function generateToken(): string {
  // Générer un token aléatoire sécurisé
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function getCsrfCookieDomain(): string | undefined {
  if (process.env.NODE_ENV === 'production') {
    return process.env.AUTH_COOKIE_DOMAIN || '.itvisionplus.sn'
  }
  return undefined
}

/**
 * Middleware CSRF - Vérifie les tokens pour les requêtes modifiantes
 */
export function csrfMiddleware(request: NextRequest): Response | null {
  // Bypass en développement
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  // Appliquer CSRF seulement aux méthodes modifiantes
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return null
  }

  const pathname = request.nextUrl.pathname
  const hasSessionCookie = request.cookies.getAll().some(cookie =>
    /^(?:auth-token|admin-auth-token|(?:__Secure-)?next-auth\.session-token)(?:\.\d+)?$/.test(cookie.name))

  const excludedPaths = [
    '/api/analytics/track',
    '/api/csrf',
    '/api/payments/manual-review',
    '/api/payment/paydunya/callback',
    '/api/payments/webhook',
    '/api/wallet/webhook',
  ]

  if (excludedPaths.includes(pathname) || pathname.startsWith('/api/internal/') || pathname.startsWith('/api/auth/callback/')) {
    return null
  }

  if (pathname.startsWith('/api/auth/') && !hasSessionCookie &&
      !request.headers.has('origin') && !request.headers.has('referer') && !request.headers.has('sec-fetch-site')) {
    return null
  }

  const authHeader = request.headers.get('authorization') || ''
  if (!hasSessionCookie && /^Bearer\s+\S+$/i.test(authHeader)) {
    return null
  }

  const source = request.headers.get('origin') ?? request.headers.get('referer')
  const fetchSite = request.headers.get('sec-fetch-site')
  if (source || fetchSite === 'cross-site' || fetchSite === 'same-site') {
    let sameOrigin = false
    try {
      const host = request.headers.get('host') || request.nextUrl.host
      const targetOrigin = new URL(`https://${host}`).origin
      sameOrigin = !!source && new URL(source).origin === targetOrigin
    } catch {}
    if (sameOrigin && fetchSite !== 'cross-site' && fetchSite !== 'same-site') return null
    logSecurityViolation('csrf_origin', request, { pathname })
    return NextResponse.json({ error: 'Origine de la requête non autorisée' }, { status: 403 })
  }

  // Pour les autres routes, vérifier le token CSRF
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || 
                      request.headers.get('csrf-token')

  if (!cookieToken || !headerToken) {
    logSecurityViolation('csrf_missing', request, { 
      pathname,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken
    })
    return new NextResponse(
      JSON.stringify({ error: 'Token CSRF manquant' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  // Vérifier que les tokens correspondent (double-submit)
  if (cookieToken !== headerToken) {
    logSecurityViolation('csrf_mismatch', request, { pathname })
    return new NextResponse(
      JSON.stringify({ error: 'Token CSRF invalide' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return null
}

/**
 * Génère une réponse avec un nouveau token CSRF
 */
export function generateCSRFResponse(request: NextRequest): NextResponse {
  const token = generateToken()
  const expires = new Date(Date.now() + TOKEN_EXPIRY)
  
  const response = NextResponse.json({ 
    csrfToken: token,
    expiresAt: expires.toISOString()
  })
  
  // Définir le cookie avec le token
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: getCsrfCookieDomain(),
    expires
  })
  
  // Aussi dans le header pour faciliter le debug
  response.headers.set('X-CSRF-Token', token)
  response.headers.set('Cache-Control', 'no-store')
  
  return response
}

// Export pour compatibilité avec l'ancien code
export const csrfProtection = {
  middleware: csrfMiddleware,
  generateCSRFToken: (request: NextRequest) => generateToken()
}
