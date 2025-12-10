/**
 * Module Pricing 1688 - Refactor complet
 * 
 * Calculs automatiques :
 * - Coût réel produit (1688 × taux de change)
 * - Transport réel (selon méthode)
 * - Frais de service (5%, 10%, 15%)
 * - Assurance obligatoire (2.5% par défaut)
 * - Prix client (produit + transport déclaré)
 * - Marge nette (prix client - coût total réel)
 * - Marge dynamique (selon volume et stratégie)
 * 
 * @module pricing1688
 */

import type { ShippingMethodId } from './logistics'
import { BASE_SHIPPING_RATES, REAL_SHIPPING_COSTS } from './logistics'
import type {
  Pricing1688Input,
  Pricing1688Breakdown,
  ServiceFeeRate,
  Currency
} from './types/product.types'

// ============================================================================
// CONSTANTES
// ============================================================================

export const DEFAULT_EXCHANGE_RATE = 100 // 1 ¥ = 100 FCFA
export const DEFAULT_MANDATORY_INSURANCE_RATE = 2.5 // 2.5% obligatoire
export const SERVICE_FEE_RATES = [5, 10, 15] as const

// Marges dynamiques selon volume
type MarginTier = {
  minQuantity: number
  maxQuantity?: number // Optionnel pour le tier bulk (pas de limite supérieure)
  marginMultiplier: number
}

export const DYNAMIC_MARGIN_TIERS: {
  readonly low: MarginTier
  readonly medium: MarginTier
  readonly high: MarginTier
  readonly bulk: MarginTier
} = {
  low: { minQuantity: 1, maxQuantity: 5, marginMultiplier: 1.0 },      // Marge standard
  medium: { minQuantity: 6, maxQuantity: 20, marginMultiplier: 0.95 },   // -5% pour volume moyen
  high: { minQuantity: 21, maxQuantity: 50, marginMultiplier: 0.90 },   // -10% pour volume élevé
  bulk: { minQuantity: 51, marginMultiplier: 0.85 }                      // -15% pour gros volume (pas de limite supérieure)
} as const

// ============================================================================
// CALCULS INTERNES
// ============================================================================

/**
 * Calcule le coût du produit en FCFA
 */
function calculateProductCostFCFA(
  price1688?: number,
  baseCost?: number,
  exchangeRate: number = DEFAULT_EXCHANGE_RATE
): number {
  if (typeof baseCost === 'number' && baseCost > 0) {
    return baseCost
  }
  if (typeof price1688 === 'number' && price1688 > 0) {
    return price1688 * exchangeRate
  }
  return 0
}

/**
 * Calcule le coût de transport réel
 */
function calculateRealShippingCost(
  method: ShippingMethodId,
  weightKg?: number,
  volumeM3?: number,
  shippingOverrides?: Array<{ methodId: string; ratePerKg?: number; ratePerM3?: number; flatFee?: number }>
): number {
  // Vérifier les overrides
  const override = shippingOverrides?.find(o => o.methodId === method)
  if (override) {
    if (override.flatFee !== undefined) {
      return override.flatFee
    }
    if (method === 'sea_freight' && override.ratePerM3 !== undefined && volumeM3) {
      return volumeM3 * override.ratePerM3
    }
    if (override.ratePerKg !== undefined && weightKg) {
      return weightKg * override.ratePerKg
    }
  }

  const realCost = REAL_SHIPPING_COSTS[method]
  if (!realCost) return 0

  let billedAmount = 0

  if (method === 'sea_freight') {
    if (typeof volumeM3 === 'number' && volumeM3 > 0) {
      billedAmount = volumeM3 * realCost.rate
    }
  } else {
    if (typeof weightKg === 'number' && weightKg > 0) {
      billedAmount = weightKg * realCost.rate
    }
  }

  const minimumCharge = realCost.minimumCharge || 0
  return Math.max(billedAmount, minimumCharge)
}

/**
 * Calcule le prix de transport déclaré au client
 */
function calculateClientShippingCost(
  method: ShippingMethodId,
  weightKg?: number,
  volumeM3?: number,
  shippingOverrides?: Array<{ methodId: string; ratePerKg?: number; ratePerM3?: number; flatFee?: number }>
): number {
  // Vérifier les overrides
  const override = shippingOverrides?.find(o => o.methodId === method)
  if (override) {
    if (override.flatFee !== undefined) {
      return override.flatFee
    }
    if (method === 'sea_freight' && override.ratePerM3 !== undefined && volumeM3) {
      return volumeM3 * override.ratePerM3
    }
    if (override.ratePerKg !== undefined && weightKg) {
      return weightKg * override.ratePerKg
    }
  }

  const clientRate = BASE_SHIPPING_RATES[method]
  if (!clientRate) return 0

  let billedAmount = 0

  if (clientRate.billing === 'per_cubic_meter') {
    if (typeof volumeM3 === 'number' && volumeM3 > 0) {
      billedAmount = volumeM3 * clientRate.rate
    }
  } else {
    if (typeof weightKg === 'number' && weightKg > 0) {
      billedAmount = weightKg * clientRate.rate
    }
  }

  const minimumCharge = clientRate.minimumCharge || 0
  return Math.max(billedAmount, minimumCharge)
}

/**
 * Calcule la marge dynamique selon le volume
 */
function calculateDynamicMargin(
  baseMargin: number,
  orderQuantity: number = 1
): number {
  let tier = DYNAMIC_MARGIN_TIERS.low

  if (orderQuantity >= DYNAMIC_MARGIN_TIERS.bulk.minQuantity) {
    tier = DYNAMIC_MARGIN_TIERS.bulk
  } else if (orderQuantity >= DYNAMIC_MARGIN_TIERS.high.minQuantity) {
    tier = DYNAMIC_MARGIN_TIERS.high
  } else if (orderQuantity >= DYNAMIC_MARGIN_TIERS.medium.minQuantity) {
    tier = DYNAMIC_MARGIN_TIERS.medium
  }

  return baseMargin * tier.marginMultiplier
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/**
 * Simule le pricing complet d'un produit 1688 avec marge dynamique
 * 
 * @param input - Paramètres de simulation
 * @returns Détail complet du pricing avec marges
 */
export function simulatePricing1688(
  input: Pricing1688Input,
  shippingOverrides?: Array<{ methodId: string; ratePerKg?: number; ratePerM3?: number; flatFee?: number }>
): Pricing1688Breakdown {
  const {
    price1688,
    baseCost,
    exchangeRate = DEFAULT_EXCHANGE_RATE,
    shippingMethod,
    weightKg,
    volumeM3,
    serviceFeeRate = 10,
    insuranceRate,
    orderQuantity = 1,
    monthlyVolume = 0
  } = input

  // 1. Coût produit en FCFA
  const productCostFCFA = calculateProductCostFCFA(price1688, baseCost, exchangeRate)

  // 2. Coûts de transport
  const shippingCostReal = calculateRealShippingCost(shippingMethod, weightKg, volumeM3, shippingOverrides)
  const shippingCostClient = calculateClientShippingCost(shippingMethod, weightKg, volumeM3, shippingOverrides)

  // 3. Frais de service (sur le coût produit)
  const serviceFee = productCostFCFA * (serviceFeeRate / 100)

  // 4. Frais d'assurance (sur le coût total produit + transport réel)
  // Assurance obligatoire par défaut si non spécifiée
  const finalInsuranceRate = insuranceRate !== undefined 
    ? insuranceRate 
    : DEFAULT_MANDATORY_INSURANCE_RATE
  const insuranceBase = productCostFCFA + shippingCostReal
  const insuranceFee = insuranceBase * (finalInsuranceRate / 100)

  // 5. Coût total réel
  const totalRealCost = productCostFCFA + shippingCostReal + serviceFee + insuranceFee

  // 6. Prix total facturé client (base)
  const baseClientPrice = productCostFCFA + shippingCostClient

  // 7. Marge de base
  const baseMargin = baseClientPrice - totalRealCost

  // 8. Marge dynamique selon volume
  const dynamicMargin = calculateDynamicMargin(baseMargin, orderQuantity)
  const totalClientPrice = totalRealCost + dynamicMargin

  // 9. Marges finales
  const shippingMargin = shippingCostClient - shippingCostReal
  const netMargin = totalClientPrice - totalRealCost
  const marginPercentage = totalRealCost > 0 
    ? (netMargin / totalRealCost) * 100 
    : 0

  // 10. Projections selon volume
  const cumulativeMargin = netMargin * orderQuantity
  const estimatedMonthlyProfit = monthlyVolume > 0 
    ? netMargin * monthlyVolume 
    : undefined

  const shippingInfo = BASE_SHIPPING_RATES[shippingMethod]

  return {
    productCostFCFA: Math.round(productCostFCFA),
    shippingCostReal: Math.round(shippingCostReal),
    serviceFee: Math.round(serviceFee),
    insuranceFee: Math.round(insuranceFee),
    totalRealCost: Math.round(totalRealCost),
    shippingCostClient: Math.round(shippingCostClient),
    totalClientPrice: Math.round(totalClientPrice),
    shippingMargin: Math.round(shippingMargin),
    netMargin: Math.round(netMargin),
    marginPercentage: Math.round(marginPercentage * 100) / 100,
    cumulativeMargin: Math.round(cumulativeMargin),
    estimatedMonthlyProfit: estimatedMonthlyProfit !== undefined 
      ? Math.round(estimatedMonthlyProfit) 
      : undefined,
    currency: 'FCFA' as Currency,
    shippingMethodLabel: shippingInfo.label,
    shippingMethodDuration: shippingInfo.durationDays
  }
}

/**
 * Simule le pricing à partir d'un produit existant
 */
export function simulatePricingFromProduct(
  product: {
    price1688?: number
    baseCost?: number
    exchangeRate?: number
    serviceFeeRate?: ServiceFeeRate
    insuranceRate?: number
    weightKg?: number
    volumeM3?: number
    shippingOverrides?: Array<{ methodId: string; ratePerKg?: number; ratePerM3?: number; flatFee?: number }>
  },
  input: Omit<Pricing1688Input, 'price1688' | 'baseCost' | 'exchangeRate' | 'serviceFeeRate' | 'insuranceRate'>
): Pricing1688Breakdown {
  return simulatePricing1688({
    price1688: product.price1688,
    baseCost: product.baseCost,
    exchangeRate: product.exchangeRate || DEFAULT_EXCHANGE_RATE,
    serviceFeeRate: product.serviceFeeRate,
    insuranceRate: product.insuranceRate,
    ...input
  }, product.shippingOverrides)
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calcule uniquement la marge dynamique selon le volume
 */
export function getDynamicMarginMultiplier(orderQuantity: number): number {
  if (orderQuantity >= DYNAMIC_MARGIN_TIERS.bulk.minQuantity) {
    return DYNAMIC_MARGIN_TIERS.bulk.marginMultiplier
  }
  if (orderQuantity >= DYNAMIC_MARGIN_TIERS.high.minQuantity) {
    return DYNAMIC_MARGIN_TIERS.high.marginMultiplier
  }
  if (orderQuantity >= DYNAMIC_MARGIN_TIERS.medium.minQuantity) {
    return DYNAMIC_MARGIN_TIERS.medium.marginMultiplier
  }
  return DYNAMIC_MARGIN_TIERS.low.marginMultiplier
}

/**
 * Formate le pricing pour affichage
 */
export function formatPricingBreakdown(breakdown: Pricing1688Breakdown) {
  return {
    ...breakdown,
    formatted: {
      productCost: `${breakdown.productCostFCFA.toLocaleString('fr-FR')} ${breakdown.currency}`,
      totalCost: `${breakdown.totalRealCost.toLocaleString('fr-FR')} ${breakdown.currency}`,
      clientPrice: `${breakdown.totalClientPrice.toLocaleString('fr-FR')} ${breakdown.currency}`,
      netMargin: `${breakdown.netMargin.toLocaleString('fr-FR')} ${breakdown.currency}`,
      marginPercentage: `${breakdown.marginPercentage.toFixed(2)}%`
    }
  }
}

