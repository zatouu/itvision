/**
 * Tarification à niveaux (progressive)
 * Les tarifs changent selon la quantité totale de produits
 */

export interface TierPricing {
  minQuantity: number
  maxQuantity?: number
  discountPercent: number
  label: string
}

// Tarifs progressifs: plus la quantité est élevée, plus la réduction est importante
export const QUANTITY_TIERS: TierPricing[] = [
  {
    minQuantity: 5,
    maxQuantity: 19,
    discountPercent: 0,
    label: '5-19 produits'
  },
  {
    minQuantity: 20,
    maxQuantity: 49,
    discountPercent: 5,
    label: '20-49 produits (5% de réduction)'
  },
  {
    minQuantity: 50,
    maxQuantity: 99,
    discountPercent: 10,
    label: '50-99 produits (10% de réduction)'
  },
  {
    minQuantity: 100,
    maxQuantity: undefined,
    discountPercent: 15,
    label: '100+ produits (15% de réduction)'
  }
]

/**
 * Trouve le tier de tarification applicable pour une quantité donnée
 */
export function getTierForQuantity(quantity: number): TierPricing | null {
  if (quantity < 5) return null // Quantité minimale non atteinte

  const tier = QUANTITY_TIERS.find(t => {
    if (t.maxQuantity === undefined) {
      return quantity >= t.minQuantity
    }
    return quantity >= t.minQuantity && quantity <= t.maxQuantity
  })

  return tier || null
}

/**
 * Applique la réduction de tarification sur le subtotal
 */
export function applyTierDiscount(subtotal: number, quantity: number): {
  originalPrice: number
  discountPercent: number
  discountAmount: number
  finalPrice: number
  tier: TierPricing | null
} {
  const tier = getTierForQuantity(quantity)
  const discountAmount = tier ? Math.round(subtotal * (tier.discountPercent / 100)) : 0
  const finalPrice = subtotal - discountAmount

  return {
    originalPrice: subtotal,
    discountPercent: tier?.discountPercent || 0,
    discountAmount,
    finalPrice,
    tier
  }
}
