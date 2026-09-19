/**
 * Liens externes vers les autres produits (DDM+ marketplace, site vitrine).
 * L'app n'importe rien du domaine market — tout passe par des URLs publiques.
 */
export const MARKET_BASE = 'https://market.itvisionplus.sn'

export const marketLinks = {
  /** Catalogue produits DDM+ */
  catalog: `${MARKET_BASE}/produits`,
  /** Page publique d'une boutique vendeur */
  shop: (slug: string) => `${MARKET_BASE}/boutiques/${slug}`,
  /** Espace vendeur (gestion de la boutique) */
  vendorDashboard: `${MARKET_BASE}/espace-vendeur`,
  /** Devenir vendeur sur DDM+ */
  becomeVendor: `${MARKET_BASE}/devenir-vendeur`,
}
