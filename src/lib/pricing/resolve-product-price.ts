/**
 * Résolution du prix applicable à un produit selon la quantité commandée
 * et le tier marketplace de l'acheteur.
 *
 * Règles métier :
 * - Pro / Reseller / Partner → b2bPrice dès 1 pièce (si disponible)
 * - Standard + qty >= 5    → b2bPrice (si disponible)
 * - Standard + qty < 5     → price (prix retail)
 * - Si b2bPrice absent ou >= price → price retail dans tous les cas
 */

export type MarketplaceTier = 'standard' | 'pro' | 'reseller' | 'partner'

export interface ResolvedPrice {
  appliedPrice: number
  priceType: 'retail' | 'wholesale'
  wholesaleEligible: boolean
  savingsPercent: number
}

export function resolveProductPrice(params: {
  price: number
  b2bPrice?: number
  qty: number
  marketplaceTier?: MarketplaceTier
}): ResolvedPrice {
  const { price, b2bPrice, qty, marketplaceTier = 'standard' } = params

  const isProAccount = marketplaceTier !== 'standard'
  const isWholesaleQty = qty >= 5
  const hasWholesalePrice =
    typeof b2bPrice === 'number' && b2bPrice > 0 && b2bPrice < price

  const wholesaleEligible = hasWholesalePrice && (isProAccount || isWholesaleQty)
  const appliedPrice = wholesaleEligible ? b2bPrice! : price
  const savingsPercent =
    wholesaleEligible && price > 0
      ? Math.round((1 - b2bPrice! / price) * 100)
      : 0

  return {
    appliedPrice,
    priceType: wholesaleEligible ? 'wholesale' : 'retail',
    wholesaleEligible,
    savingsPercent,
  }
}

/**
 * Détermine si un user est éligible au prix wholesale sur un produit donné,
 * sans connaître la quantité (utilisé pour l'affichage conditionnel côté UI).
 */
export function isWholesaleAccount(tier: MarketplaceTier = 'standard'): boolean {
  return tier !== 'standard'
}

/**
 * Retourne le prix wholesale seuil (5 pcs) pour affichage sur la fiche produit.
 * Retourne null si aucun prix wholesale n'est défini.
 */
export function getWholesalePriceDisplay(
  price: number,
  b2bPrice?: number
): { price: number; savingsPercent: number } | null {
  if (typeof b2bPrice !== 'number' || b2bPrice <= 0 || b2bPrice >= price) {
    return null
  }
  return {
    price: b2bPrice,
    savingsPercent: Math.round((1 - b2bPrice / price) * 100),
  }
}
