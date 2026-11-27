/**
 * Prix DDM d'un produit acheté en direct usine, calé sur le prix de détail à Dakar (sans DB,
 * testé par scripts/test-supplier-pricelist.ts).
 *
 * Logique DDM : un prix de gros. Au lot minimum, le client paie (frais, remise quantité et transport
 * compris) `entryDiscount` de moins qu'à Dakar ; les paliers dégressifs vont jusqu'à `bulkDiscount`
 * pour les gros volumes. Au-delà, on brade : la marge laissée sur la table ne rend pas l'offre plus
 * attractive. La marge produit ne descend jamais sous `minMarginRate` : si le marché ne la permet pas,
 * le produit est signalé « non compétitif » (souvent : transport aérien trop lourd pour sa valeur).
 *
 * Le prix payé reproduit le calcul du panier (cart-calculator) : prix unitaire × (1 + frais de service
 * + assurance) × (1 − remise quantité globale) + transport.
 */
import { calculateCompleteFees, type ServiceFeeTier } from '@/lib/pricing/tiered-service-fees'
import { applyTierDiscount } from '@/lib/pricing/tiered-pricing'

export interface MarketPricingRules {
  /** Remise vs Dakar pour l'achat d'UNE pièce : le prix catalogue est ancré sur ce niveau —
   * l'acheteur à l'unité paie près du prix marché, la marge unitaire finance la logistique */
  unitDiscount: number
  entryDiscount: number
  bulkDiscount: number
  minMarginRate: number
  /** Plafond de marge produit à l'unité (%) : garde-fou contre les relevés aberrants,
   * assez haut pour ne pas écraser les produits chers du marché local */
  maxMarginRate: number
  /** Paliers en multiples du lot minimum (bornés au plus grand MOQ usine), avec la remise visée */
  tiers: Array<{ lotMultiple: number; discount: number }>
}

export const DDM_PRICING_RULES: MarketPricingRules = {
  unitDiscount: 0.1,
  entryDiscount: 0.2,
  bulkDiscount: 0.35,
  minMarginRate: 15,
  maxMarginRate: 250,
  tiers: [{ lotMultiple: 3, discount: 0.28 }, { lotMultiple: 10, discount: 0.35 }],
}

export interface FeeSettings {
  insuranceRate: number
  serviceFeeTiers?: ServiceFeeTier[]
  singleImportServiceFeeRate?: number
}

export interface PriceReference {
  /** Coût sourcing unitaire en FCFA (¥ × taux) */
  costFcfa: number
  /** Prix de détail médian à Dakar */
  marketFcfa: number
  /** Transport par unité pour une commande de q unités */
  shippingPerUnit: (qty: number) => number
}

/** Prix payé par unité (hors promo) pour un prix unitaire catalogue `unit` et q unités. */
export function paidPerUnit(unit: number, qty: number, fees: FeeSettings, shipping: number): number {
  const line = unit * qty
  const withFees = calculateCompleteFees(line, line, {
    insuranceRate: fees.insuranceRate,
    serviceFeeTiers: fees.serviceFeeTiers,
    singleImportServiceFeeRate: fees.singleImportServiceFeeRate,
    importQuantity: qty,
  }).finalPrice
  return applyTierDiscount(withFees, qty).finalPrice / qty + shipping
}

/** Prix unitaire catalogue qui donne un prix payé `target` pour q unités (les frais dépendent du montant). */
export function unitForPaid(target: number, qty: number, fees: FeeSettings, shipping: number): number {
  let unit = Math.max(1, target - shipping)
  for (let i = 0; i < 4; i++) {
    const paid = paidPerUnit(unit, qty, fees, shipping)
    const goods = paid - shipping
    if (goods <= 0) break
    unit = Math.max(1, unit * ((target - shipping) / goods))
  }
  return unit
}

export interface MarketPricingResult {
  source: 'marché' | 'comparable' | 'estimé'
  /** Marge produit au lot minimum (%) */
  marginRate: number
  /** Paliers dégressifs : quantité et marge produit (%) */
  tiers: Array<{ minQty: number; marginRate: number }>
  competitiveness: 'ok' | 'marge plancher' | 'plus cher que Dakar'
}

const round1 = (n: number) => Math.round(n * 10) / 10
const marginFor = (unit: number, cost: number) => (unit / cost - 1) * 100

export function tierQuantities(minOrderQty: number, maxFactoryMoq: number, rules: MarketPricingRules = DDM_PRICING_RULES) {
  const out: Array<{ minQty: number; discount: number }> = []
  for (const t of rules.tiers) {
    const qty = Math.min(minOrderQty * t.lotMultiple, maxFactoryMoq)
    if (qty > (out.at(-1)?.minQty ?? minOrderQty)) out.push({ minQty: qty, discount: t.discount })
  }
  return out
}

/**
 * Marges au lot minimum et aux paliers. Plusieurs relevés : on retient la marge la plus basse
 * (chaque relevé doit rester avantageux). Sans relevé : marge `fallbackMarginRate` (prudente, cf.
 * import.ts) et paliers proportionnels.
 */
export function marketPricing(input: {
  refs: PriceReference[]
  minOrderQty: number
  maxFactoryMoq: number
  fees: FeeSettings
  fallbackMarginRate: number
}, rules: MarketPricingRules = DDM_PRICING_RULES): MarketPricingResult {
  const { refs, minOrderQty, fees } = input
  const tierQtys = tierQuantities(minOrderQty, input.maxFactoryMoq, rules)
  const floor = rules.minMarginRate
  const cap = rules.maxMarginRate
  const clamp = (m: number) => Math.min(cap, Math.max(floor, m))

  if (!refs.length) {
    const entry = clamp(input.fallbackMarginRate)
    const tiers = tierQtys
      .map(t => ({ minQty: t.minQty, marginRate: round1(clamp(((1 + entry / 100) * (1 - t.discount) / (1 - rules.unitDiscount) - 1) * 100)) }))
      .filter(t => t.marginRate < entry)
    return { source: 'estimé', marginRate: round1(entry), tiers, competitiveness: 'ok' }
  }

  const marginAt = (qty: number, discount: number) => Math.min(...refs.map(r => {
    const shipping = r.shippingPerUnit(qty)
    return marginFor(unitForPaid(r.marketFcfa * (1 - discount), qty, fees, shipping), r.costFcfa)
  }))

  // Prix catalogue = ancrage à l'unité : une pièce achetée seule paie market × (1 − unitDiscount).
  const rawEntry = marginAt(1, rules.unitDiscount)
  const entry = clamp(rawEntry)
  const tiers: MarketPricingResult['tiers'] = []
  // Premier palier : le lot minimum à −entryDiscount vs Dakar (s'il est au-delà d'une pièce).
  if (minOrderQty > 1) {
    const m = clamp(marginAt(minOrderQty, rules.entryDiscount))
    if (m < entry - 0.5) tiers.push({ minQty: minOrderQty, marginRate: round1(m) })
  }
  for (const t of tierQtys) {
    const m = clamp(marginAt(t.minQty, t.discount))
    if (m < (tiers.at(-1)?.marginRate ?? entry) - 0.5) tiers.push({ minQty: t.minQty, marginRate: round1(m) })
  }

  const worstPaid = Math.max(...refs.map(r => {
    const unit = r.costFcfa * (1 + entry / 100)
    return paidPerUnit(unit, minOrderQty, fees, r.shippingPerUnit(minOrderQty)) / r.marketFcfa
  }))
  const competitiveness = rawEntry >= floor ? 'ok' : worstPaid < 1 ? 'marge plancher' : 'plus cher que Dakar'
  return { source: 'marché', marginRate: round1(entry), tiers, competitiveness }
}
