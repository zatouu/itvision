/**
 * Lot minimum DDM des produits achetés en direct usine (sans DB, testé par scripts/test-supplier-pricelist.ts).
 *
 * Le lot minimum s'applique au TOTAL du produit dans le panier (variantes cumulées, cf. quote-cart).
 * Il est le plus grand de trois seuils, arrondi à un lot « rond » :
 *  1. valeur  — une ligne d'import doit valoir au moins `minLineFcfa` (sous ce montant, le minimum de
 *     facturation du fret aérien coûte plus cher que la marchandise) ;
 *  2. lot usine — `maxBuyersPerFactoryLot` acheteurs au plus doivent suffire à remplir le MOQ usine ;
 *  3. maritime — un article lourd (≥ `seaOnlyKg`, aérien hors de prix) voyage par mer : son lot doit
 *     atteindre seul le volume ou le poids minimal du groupage maritime.
 * Le seuil « lot usine » est plafonné à `maxLineFcfa` pour ne pas imposer un lot de revendeur sur un
 * article cher ; il ne dépasse jamais le MOQ usine.
 */

export interface MinOrderRules {
  minLineFcfa: number
  maxBuyersPerFactoryLot: number
  maxLineFcfa: number
  seaOnlyKg: number
  sea: { minVolumeM3: number; minBilledWeightKg: number }
}

export const DDM_MIN_ORDER_RULES: MinOrderRules = {
  minLineFcfa: 10_000,
  maxBuyersPerFactoryLot: 10,
  maxLineFcfa: 150_000,
  seaOnlyKg: 5,
  sea: { minVolumeM3: 0.05, minBilledWeightKg: 15 },
}

export interface MinOrderInput {
  /** Prix catalogue unitaire de la variante la moins chère (FCFA, transport exclu) */
  unitPriceFcfa: number
  /** Plus petit MOQ usine de la famille, en unités vendues */
  factoryMoq: number
  weightKg: number
  volumeM3?: number
}

export type MinOrderDriver = 'unité' | 'valeur' | 'lot usine' | 'maritime'

export interface MinOrderResult {
  qty: number
  driver: MinOrderDriver
  seaOnly: boolean
  explanation: string
}

const LOT_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200, 250, 300, 400, 500, 1000]

export function roundUpToLot(qty: number): number {
  return LOT_STEPS.find(step => step >= qty) ?? Math.ceil(qty / 100) * 100
}

export function ddmMinOrderQty(input: MinOrderInput, rules: MinOrderRules = DDM_MIN_ORDER_RULES): MinOrderResult {
  const price = Math.max(1, input.unitPriceFcfa)
  const factoryMoq = Math.max(1, Math.floor(input.factoryMoq))
  const seaOnly = input.weightKg >= rules.seaOnlyKg

  const byValue = Math.ceil(rules.minLineFcfa / price)
  const byFactory = Math.min(
    Math.ceil(factoryMoq / rules.maxBuyersPerFactoryLot),
    Math.max(1, Math.floor(rules.maxLineFcfa / price)),
  )
  const bySea = seaOnly
    ? Math.min(
      input.volumeM3 && input.volumeM3 > 0 ? Math.ceil(rules.sea.minVolumeM3 / input.volumeM3) : Infinity,
      Math.ceil(rules.sea.minBilledWeightKg / input.weightKg),
    )
    : 1

  const candidates: Array<[MinOrderDriver, number]> = [['unité', 1], ['valeur', byValue], ['lot usine', byFactory], ['maritime', bySea]]
  const [driver, raw] = candidates.reduce((best, c) => (c[1] > best[1] ? c : best))
  const qty = Math.min(roundUpToLot(raw), factoryMoq)

  const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`
  const explanation = {
    'unité': 'vendu à l’unité',
    'valeur': `ligne d’au moins ${fcfa(rules.minLineFcfa)} (${qty} × ${fcfa(price)})`,
    'lot usine': `MOQ usine ${factoryMoq} réparti sur ${rules.maxBuyersPerFactoryLot} acheteurs au plus`,
    'maritime': `article lourd, maritime seulement : ${rules.sea.minBilledWeightKg} kg ou ${rules.sea.minVolumeM3} m³ par lot`,
  }[driver]

  return { qty, driver, seaOnly, explanation }
}
