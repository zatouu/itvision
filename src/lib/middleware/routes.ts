/**
 * Routage middleware — DÉRIVÉ du registre src/lib/domains.ts.
 * Ne plus éditer les listes à la main : modifier le registre.
 * Les libellés de rôle ('CLIENT_ENTERPRISE', 'AUTH'...) sont conservés
 * pour compatibilité avec la logique de middleware.ts existante.
 */
import { PAGE_RULES, getPageRule, type RouteRule } from '@/lib/domains'

// Routes publiques = toutes les pages déclarées 'public' + entrées API transversales
export const PUBLIC_ROUTES: string[] = [
  ...PAGE_RULES.filter(r => r.access === 'public').map(r => r.prefix),
  '/market/creer-compte',
  '/api/auth',
  '/api/health',
]

// Routes propres à la marketplace (accessibles sur market.itvisionplus.sn)
// NOTE : liste explicitement figée — ne pas dériver du registre sans revue,
// car /produits et assimilés ont un comportement spécial sur le domaine principal.
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
  '/devenir-vendeur',
  '/espace-vendeur',
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

/**
 * Traduit l'accès déclaré du registre vers le libellé de rôle historique
 * attendu par middleware.ts. Retourne null si aucune vérification requise.
 */
function accessToRequiredRole(rule: RouteRule): string | null {
  const access = rule.access
  if (access === 'public') return null
  if (access === 'auth') return 'AUTH'
  if ('profile' in access) {
    switch (access.profile) {
      case 'companyClient': return 'CLIENT_ENTERPRISE'
      case 'vendor': return 'VENDOR'
      case 'provider': return 'PROVIDER'
      default: return 'AUTH'
    }
  }
  if ('staffRoles' in access) {
    return access.staffRoles.includes('TECHNICIAN') ? 'TECHNICIAN' : 'ADMIN'
  }
  return null
}

export function getRequiredRole(pathname: string): string | null {
  const rule = getPageRule(pathname)
  if (!rule) return null
  if (rule.domain === 'deprecated') return null // les routes mortes ne doivent plus résoudre
  return accessToRequiredRole(rule)
}
