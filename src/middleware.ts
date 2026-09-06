import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { csrfProtection } from '@/lib/csrf-protection'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import { isMarketDomain, getHost } from '@/lib/middleware/domain'
import { isPublicRoute, isMarketplaceRoute, isMobileApiRoute, getRequiredRole } from '@/lib/middleware/routes'
import { handleCorsPreflight, getMobileCorsHeaders, injectCorsHeaders } from '@/lib/middleware/cors'
import { applySecurityHeaders, applyApiSecurityHeaders } from '@/lib/middleware/security'

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
      const isMobileRoute = isMobileApiRoute(pathname)
      const corsHeaders = getMobileCorsHeaders()

      // Répondre aux preflight OPTIONS immédiatement
      const preflight = handleCorsPreflight(request, isMobileRoute)
      if (preflight) return preflight

      const response = NextResponse.next()
      const csrfResult = csrfProtection.middleware(request)
      if (csrfResult) return csrfResult

      applyApiSecurityHeaders(response)

      // Injecter les headers CORS sur la réponse
      if (isMobileRoute) injectCorsHeaders(response, corsHeaders)

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
      pathname.startsWith('/register-corporate') ||
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

    if (requiredRole === 'VENDOR' && !['VENDOR', ...ADMIN_ROLES].includes(role || '')) {
      return NextResponse.redirect(new URL('/compte', request.url))
    }

    if (requiredRole === 'PROVIDER' && !['PROVIDER', ...ADMIN_ROLES].includes(role || '')) {
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