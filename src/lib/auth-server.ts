import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export interface AuthResult {
  isAuthenticated: boolean
  user?: {
    id: string
    role: string
    email?: string
    name?: string
  }
  error?: string
}

/**
 * Vérifie l'authentification côté serveur
 * Utilisable dans les Server Components et le middleware
 * 
 * @param request - NextRequest (obligatoire pour le middleware, optionnel pour Server Components)
 */
export async function verifyAuthServer(request?: NextRequest): Promise<AuthResult> {
  try {
    // Récupérer le token depuis les cookies
    let token: string | undefined
    
    if (request) {
      // Depuis le middleware (NextRequest) - accès direct aux cookies
      token = request.cookies.get('auth-token')?.value || 
              request.cookies.get('admin-auth-token')?.value ||
              request.headers.get('authorization')?.replace('Bearer ', '')
    } else {
      // Depuis un Server Component (cookies()) - nécessite await
      try {
        const cookieStore = await cookies()
        token = cookieStore.get('auth-token')?.value || cookieStore.get('admin-auth-token')?.value
      } catch (error) {
        // Si on est dans le middleware, cookies() ne fonctionne pas
        return { isAuthenticated: false, error: 'Contexte invalide' }
      }
    }

    if (!token) {
      return { isAuthenticated: false, error: 'Token manquant' }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    
    return {
      isAuthenticated: true,
      user: {
        id: decoded.userId || decoded.id,
        role: String(decoded.role || '').toUpperCase(),
        email: decoded.email,
        name: decoded.name
      }
    }
  } catch (error) {
    return { isAuthenticated: false, error: 'Token invalide' }
  }
}

/**
 * Vérifie que l'utilisateur a un rôle spécifique
 */
export async function requireRole(
  roles: string[],
  request?: NextRequest
): Promise<AuthResult | null> {
  try {
    const auth = await verifyAuthServer(request)
    
    if (!auth.isAuthenticated || !auth.user) {
      return null
    }

    const userRole = auth.user.role.toUpperCase()
    const allowedRoles = roles.map(r => r.toUpperCase())

    if (!allowedRoles.includes(userRole)) {
      // L'utilisateur est authentifié mais n'a pas le bon rôle
      return null
    }

    return auth
  } catch (error) {
    console.error('Error in requireRole:', error)
    return null
  }
}

/**
 * Redirige vers la page d'accueil si non authentifié
 */
export function redirectToHome(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  return NextResponse.redirect(url)
}

/**
 * Redirige vers la page de login avec un retour après connexion
 */
export function redirectToLogin(request: NextRequest, returnUrl?: string): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  if (returnUrl) {
    url.searchParams.set('return', returnUrl)
  }
  return NextResponse.redirect(url)
}

