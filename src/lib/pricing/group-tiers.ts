export interface GroupPriceTier {
  minQty: number
  maxQty?: number
  price: number
  discount: number
}

export interface GroupDiscountInputs {
  marginRate?: number
  serviceFeeRate?: number
  insuranceRate?: number
}

/** Paliers proposés par défaut : remises modestes, le gain d'un lot vient surtout du transport mutualisé. */
const DEFAULT_STEPS: Array<{ minQty: number; maxQty?: number; percent: number }> = [
  { minQty: 10, maxQty: 24, percent: 2 },
  { minQty: 25, maxQty: 49, percent: 4 },
  { minQty: 50, maxQty: 99, percent: 6 },
  { minQty: 100, percent: 8 },
]

/** Part maximale du bénéfice brut (marge + frais de service) cédée en remise de lot. */
export const MAX_PROFIT_SHARE = 0.5

const num = (value: unknown, fallback: number) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)

/**
 * Remise de lot maximale, en % du prix public. Le prix public d'un import vaut
 * coût × (1 + marge + frais + assurance) : seuls marge et frais sont du bénéfice,
 * dont on cède au plus la moitié. Ex. marge 0 %, frais 10 %, assurance 2,5 % ⇒ 4,4 %.
 */
export function maxGroupDiscount(inputs: GroupDiscountInputs = {}): number {
  const margin = Math.max(0, num(inputs.marginRate, 0))
  const fee = Math.max(0, num(inputs.serviceFeeRate, 10))
  const insurance = Math.max(0, num(inputs.insuranceRate, 2.5))
  const profitShareOfPrice = (margin + fee) / (100 + margin + fee + insurance)
  return Math.floor(profitShareOfPrice * MAX_PROFIT_SHARE * 1000) / 10
}

/** Paliers d'achat groupé sans vente à perte : chaque remise est plafonnée par maxGroupDiscount. */
export function defaultGroupTiers(basePrice: number, inputs: GroupDiscountInputs = {}): GroupPriceTier[] {
  const cap = maxGroupDiscount(inputs)
  return DEFAULT_STEPS.map(step => {
    const discount = Math.min(step.percent, cap)
    return {
      minQty: step.minQty,
      ...(step.maxQty ? { maxQty: step.maxQty } : {}),
      price: Math.round(basePrice * (1 - discount / 100)),
      discount,
    }
  })
}
