/**
 * Résolution du prix applicable à un produit selon la quantité commandée
 * et le tier marketplace de l'acheteur.
 *
 * Règles métier :
 * - Pro / Reseller / Partner → b2bPrice dès 1 pièce (si disponible)
 * - Standard + qty >= 5 OU totalCartQty >= 5 → b2bPrice (si disponible)
 * - Standard + qty < 5 + totalCartQty < 5   → price (prix retail)
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
  totalCartQty?: number
  /** Paliers de prix dégressifs du produit ({ minQty, price }) — le palier
   *  applicable le plus avantageux l'emporte sur le prix retail/wholesale. */
  priceTiers?: { minQty?: number; price?: number }[]
}): ResolvedPrice {
  const { price, b2bPrice, qty, marketplaceTier = 'standard', totalCartQty, priceTiers } = params

  const isProAccount = marketplaceTier !== 'standard'
  const isWholesaleQty = qty >= 5 || (typeof totalCartQty === 'number' && totalCartQty >= 5)
  const hasWholesalePrice =
    typeof b2bPrice === 'number' && b2bPrice > 0 && b2bPrice < price

  const wholesaleEligible = hasWholesalePrice && (isProAccount || isWholesaleQty)
  let appliedPrice = wholesaleEligible ? b2bPrice! : price

  // Paliers quantité du produit : meilleur palier dont minQty <= qty.
  const tierPrice = Array.isArray(priceTiers)
    ? priceTiers
        .filter((t) => typeof t?.price === 'number' && t.price > 0 && qty >= (t.minQty ?? 1))
        .sort((a, b) => (b.minQty ?? 1) - (a.minQty ?? 1))[0]?.price
    : undefined
  if (typeof tierPrice === 'number' && tierPrice < appliedPrice) {
    appliedPrice = tierPrice
  }

  const savingsPercent =
    appliedPrice < price && price > 0
      ? Math.round((1 - appliedPrice / price) * 100)
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
