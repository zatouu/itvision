import { NextRequest, NextResponse } from 'next/server'
import { csrfProtection } from '@/lib/csrf-protection'

export function middleware(request: NextRequest) {
  // Créer la réponse
  const response = NextResponse.next()

  // Headers de sécurité essentiels
  const securityHeaders = {
    // Prévention XSS
    'X-XSS-Protection': '1; mode=block',
    
    // Prévention du sniffing MIME
    'X-Content-Type-Options': 'nosniff',
    
    // Prévention du clickjacking
    'X-Frame-Options': 'DENY',
    
    // Politique de référent
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (anciennement Feature Policy)
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Nécessaire pour Next.js
      "style-src 'self' 'unsafe-inline'", // Nécessaire pour Tailwind
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Strict Transport Security (HTTPS uniquement)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Headers personnalisés pour l'application
    'X-Application': 'Securite-Electronique',
    'X-Version': '1.0.0'
  }

  // Appliquer tous les headers de sécurité
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value)
    }
  })

  // Vérification CSRF pour les routes API
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const csrfResult = csrfProtection.middleware(request)
    if (csrfResult) {
      return csrfResult
    }
  }

  // Headers spécifiques selon le type de route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // API routes - headers JSON sécurisés
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  } else {
    // Pages web - cache contrôlé
    response.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
  }

  // Headers de sécurité spéciaux pour les pages sensibles
  if (request.nextUrl.pathname.includes('/admin') || 
      request.nextUrl.pathname.includes('/login')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }

  return response
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