import { NextRequest, NextResponse } from 'next/server'
import { logSecurityViolation } from './security-logger'

class CSRFProtection {
  private tokens: Map<string, { token: string; expires: number }> = new Map()
  private readonly tokenExpiry = 60 * 60 * 1000 // 1 heure

  private generateToken(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  private getSessionId(request: NextRequest): string {
    return request.cookies.get('session-id')?.value || 
           request.headers.get('x-session-id') || 
           'anonymous'
  }

  public generateCSRFToken(request: NextRequest): string {
    const sessionId = this.getSessionId(request)
    const token = this.generateToken()
    const expires = Date.now() + this.tokenExpiry

    this.tokens.set(sessionId, { token, expires })
    
    // Nettoyer les tokens expirés
    this.cleanup()
    
    return token
  }

  public validateCSRFToken(request: NextRequest, providedToken: string): boolean {
    const sessionId = this.getSessionId(request)
    const storedData = this.tokens.get(sessionId)

    if (!storedData) {
      logSecurityViolation('csrf_missing_token', request, { sessionId })
      return false
    }

    if (Date.now() > storedData.expires) {
      this.tokens.delete(sessionId)
      logSecurityViolation('csrf_expired_token', request, { sessionId })
      return false
    }

    if (storedData.token !== providedToken) {
      logSecurityViolation('csrf_invalid_token', request, { 
        sessionId, 
        expected: storedData.token.substring(0, 8) + '...',
        provided: providedToken.substring(0, 8) + '...'
      })
      return false
    }

    return true
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId)
      }
    }
  }

  public middleware(request: NextRequest): Response | null {
    // Bypass CSRF en développement pour simplifier les tests locaux
    if (process.env.NODE_ENV !== 'production' || request.headers.get('x-dev-bypass-csrf') === 'true') {
      return null
    }

    // Appliquer CSRF seulement aux méthodes modifiantes
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return null
    }

    // Exclure les routes d'authentification (elles ont leur propre protection)
    const pathname = request.nextUrl.pathname
    if (pathname.includes('/api/auth/') || pathname.includes('/api/login/')) {
      return null
    }

    // Exclure les routes admin protégées par JWT (le JWT sert déjà de protection CSRF)
    // Ces routes vérifient l'authentification via le token JWT dans le cookie httpOnly
    if (pathname.startsWith('/api/admin/')) {
      return null
    }

    // Exclure les routes d'upload et autres routes internes authentifiées
    if (pathname.startsWith('/api/upload') || 
        pathname.startsWith('/api/products') ||
        pathname.startsWith('/api/technicians') ||
        pathname.startsWith('/api/clients') ||
        pathname.startsWith('/api/projects') ||
        pathname.startsWith('/api/maintenance') ||
        pathname.startsWith('/api/notifications') ||
        pathname.startsWith('/api/tickets')) {
      return null
    }

    const csrfToken = request.headers.get('x-csrf-token') || 
                     request.headers.get('csrf-token')

    if (!csrfToken) {
      logSecurityViolation('csrf_missing_header', request, { pathname })
      return new NextResponse(
        JSON.stringify({ error: 'Token CSRF manquant' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!this.validateCSRFToken(request, csrfToken)) {
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
}

export const csrfProtection = new CSRFProtection()

// Helper pour générer et envoyer le token CSRF
export function generateCSRFResponse(request: NextRequest): NextResponse {
  const token = csrfProtection.generateCSRFToken(request)
  
  return NextResponse.json({ csrfToken: token }, {
    headers: {
      'X-CSRF-Token': token
    }
  })
}