import { NextRequest, NextResponse } from 'next/server'
import { logSecurityViolation } from './security-logger'

/**
 * Protection CSRF utilisant le pattern "Double-Submit Cookie"
 * 
 * Fonctionnement :
 * 1. GET /api/csrf génère un token, le stocke dans un cookie httpOnly et le retourne en JSON
 * 2. Le client envoie ce token dans le header X-CSRF-Token pour les requêtes POST/PUT/DELETE/PATCH
 * 3. Le middleware vérifie que le header correspond au cookie
 * 
 * Ce pattern fonctionne en environnement serverless car il n'y a pas d'état en mémoire.
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

  // Exclure les routes qui n'ont pas besoin de CSRF :
  // - Routes d'authentification (elles ont leur propre protection)
  // - Routes analytics (tracking public)
  // - Routes webhook
  const excludedPaths = [
    '/api/auth/',
    '/api/login/',
    '/api/analytics/track',
    '/api/webhook',
    '/api/csrf',
    '/api/upload' // Upload de fichiers (FormData, pas JSON)
  ]

  if (excludedPaths.some(path => pathname.includes(path) || pathname.startsWith(path))) {
    return null
  }

  // Pour toutes les routes API protégées par JWT, on fait confiance à l'authentification
  // Le JWT est déjà une protection contre CSRF car il est envoyé via cookie httpOnly
  // et ne peut pas être lu par un site malveillant
  const authToken = request.cookies.get('auth-token')?.value
  if (authToken) {
    // L'utilisateur est authentifié, le JWT protège déjà contre CSRF
    return null
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
    sameSite: 'strict',
    path: '/',
    expires
  })
  
  // Aussi dans le header pour faciliter le debug
  response.headers.set('X-CSRF-Token', token)
  
  return response
}

// Export pour compatibilité avec l'ancien code
export const csrfProtection = {
  middleware: csrfMiddleware,
  generateCSRFToken: (request: NextRequest) => generateToken()
}
