import type { SharedPricingSnapshot } from '@/lib/pricing/shared-settings'
import type { SourceCurrency } from '@/lib/pricing/constants'
import { getImportServiceFeeRate, getServiceFeeTier } from '@/lib/pricing/tiered-service-fees'
import { calculateBilledWeight } from '@/lib/pricing/volumetric-weight'

export function priceSourcingCandidate(product: {
  price1688?: number; price1688Currency?: string; exchangeRate?: number
  weightKg?: number; lengthCm?: number; widthCm?: number; heightCm?: number
}, qty: number, pricing: SharedPricingSnapshot) {
  const sourceCurrency = product.price1688Currency || 'CNY'
  const exchangeRate = pricing.config.sourceCurrencyRates[sourceCurrency as SourceCurrency]
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new Error('Devise source non configuree')
  const productCostFCFA = Math.round((product.price1688 || 0) * exchangeRate * qty)
  const defaults = pricing.config.defaults
  const serviceFeeRate = getImportServiceFeeRate(qty, getServiceFeeTier(productCostFCFA, defaults.serviceFeeTiers).feeRate, defaults.singleImportServiceFeeRate)
  const serviceFeeAmount = Math.round(productCostFCFA * serviceFeeRate / 100)
  const insuranceRate = defaults.defaultInsuranceRate
  const insuranceAmount = Math.round(productCostFCFA * insuranceRate / 100)
  const weightKg = calculateBilledWeight({ actualWeightKg: product.weightKg || 1, lengthCm: product.lengthCm, widthCm: product.widthCm, heightCm: product.heightCm }).billedWeight * qty
  const rate = pricing.config.shippingRates.air_15
  const shippingCost = Math.max(rate.minimumCharge || 0, Math.round(rate.rate * weightKg))
  const totalClientPrice = Math.round(productCostFCFA + serviceFeeAmount + insuranceAmount + shippingCost)
  return { sourceCurrency, exchangeRate, productCostFCFA, serviceFeeRate, serviceFeeAmount, insuranceRate, insuranceAmount, shippingCost, totalClientPrice }
}

export function resolveSourcingSingleImportRate(snapshot: unknown): number | undefined {
  if (snapshot === undefined) return undefined
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Tarif sourcing enregistre invalide')
  const rate = (snapshot as Record<string, unknown>).singleImportServiceFeeRate
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error('Tarif sourcing enregistre invalide')
  }
  return rate
}

export interface SourcingConstraints {
  qty: number
  budgetMaxFCFA?: number
  budgetScope?: 'unit' | 'total'
  deliveryNeededBy?: Date | string
}

export interface SourcingEvidence {
  logisticsExtracted?: boolean
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  moq?: number
  variantGroups?: unknown[]
}

export function assessSourcingProposal(request: SourcingConstraints, product: SourcingEvidence, total: number) {
  const riskFlags: string[] = []
  const validQty = Number.isSafeInteger(request.qty) && request.qty > 0
  if (!validQty) riskFlags.push('Quantité invalide')
  if (!Number.isFinite(total) || total <= 0) riskFlags.push('Prix total invalide')

  const budget = request.budgetMaxFCFA
  const budgetKnown = request.budgetScope === 'unit' || request.budgetScope === 'total'
  const hasBudget = budget !== undefined && budget !== null && budget !== 0
  const budgetTotal = hasBudget && budgetKnown && validQty && Number.isFinite(budget) && budget! > 0
    ? budget! * (request.budgetScope === 'unit' ? request.qty : 1)
    : null
  const withinBudget = !hasBudget || (budgetTotal !== null && Number.isFinite(budgetTotal) && total <= budgetTotal)
  if (hasBudget && !budgetKnown) riskFlags.push('Budget ancien : confirmer si le montant est unitaire ou total')
  else if (!withinBudget) riskFlags.push('Budget client dépassé ou invalide')

  if (product.logisticsExtracted !== true || ![product.weightKg, product.lengthCm, product.widthCm, product.heightCm]
    .every(value => typeof value === 'number' && Number.isFinite(value) && value > 0)) {
    riskFlags.push('Poids et dimensions du colis à confirmer : transport estimatif')
  }
  if (!Number.isSafeInteger(product.moq) || product.moq! < 1) riskFlags.push('Minimum fournisseur à confirmer')
  else if (request.qty < product.moq!) riskFlags.push(`Minimum fournisseur : ${product.moq} pièces`)
  if (product.variantGroups?.length) riskFlags.push('Variante et prix fournisseur à confirmer')
  if (request.deliveryNeededBy) riskFlags.push('Date de livraison demandée à confirmer avec le fournisseur')

  return { withinBudget, budgetTotal, riskFlags }
}