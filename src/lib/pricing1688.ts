import type { IProduct } from './models/Product'
import { BASE_SHIPPING_RATES, REAL_SHIPPING_COSTS, type ShippingMethodId } from './logistics'

// Taux de change par défaut : 1 ¥ = 100 FCFA
const DEFAULT_EXCHANGE_RATE = 100
export const DEFAULT_MANDATORY_INSURANCE_RATE = 2.5 // 2.5% d'assurance obligatoire par défaut

// Taux de commission de service possibles
export const SERVICE_FEE_RATES = [5, 10, 15] as const
export type ServiceFeeRate = typeof SERVICE_FEE_RATES[number]

export interface PricingSimulationInput {
  // Prix produit 1688
  price1688?: number // Prix en Yuan (¥)
  baseCost?: number // Prix déjà converti en FCFA (alternative)
  
  // Conversion
  exchangeRate?: number // Taux de change (défaut: 100)
  
  // Transport
  shippingMethod: ShippingMethodId
  weightKg?: number
  volumeM3?: number
  
  // Commissions
  serviceFeeRate?: ServiceFeeRate // 5, 10, ou 15
  insuranceRate?: number // Pourcentage d'assurance
  
  // Volume de commande (pour calcul de marge cumulée)
  orderQuantity?: number
  monthlyVolume?: number // Volume mensuel moyen pour estimation bénéfice
}

export interface PricingBreakdown {
  // Coûts
  productCostFCFA: number // Coût produit en FCFA
  shippingCostReal: number // Coût transport réel
  serviceFee: number // Frais de service
  insuranceFee: number // Frais d'assurance
  totalRealCost: number // Coût total réel
  
  // Prix client
  shippingCostClient: number // Prix transport déclaré client
  totalClientPrice: number // Prix total facturé client
  
  // Marges
  shippingMargin: number // Marge sur transport
  netMargin: number // Marge nette totale
  marginPercentage: number // Pourcentage de marge
  
  // Projections
  cumulativeMargin?: number // Marge cumulée selon volume commande
  estimatedMonthlyProfit?: number // Estimation bénéfice mensuel
}

export interface PricingSimulationResult {
  breakdown: PricingBreakdown
  currency: string
  shippingMethod: {
    id: ShippingMethodId
    label: string
    durationDays: number
  }
  volumeInfo?: {
    orderQuantity: number
    monthlyVolume: number
  }
}

/**
 * Calcule le coût du produit en FCFA à partir du prix 1688
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
  volumeM3?: number
): number {
  const realCost = REAL_SHIPPING_COSTS[method]
  if (!realCost) return 0

  let billedAmount = 0

  if (method === 'sea_freight') {
    // Maritime : facturé au m³
    if (typeof volumeM3 === 'number' && volumeM3 > 0) {
      billedAmount = volumeM3 * realCost.rate
    }
  } else {
    // Aérien : facturé au kg
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
  volumeM3?: number
): number {
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
 * Simule le pricing complet d'un produit 1688
 */
export function simulatePricing1688(input: PricingSimulationInput): PricingSimulationResult {
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
  const shippingCostReal = calculateRealShippingCost(shippingMethod, weightKg, volumeM3)
  const shippingCostClient = calculateClientShippingCost(shippingMethod, weightKg, volumeM3)

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

  // 6. Prix total facturé client
  const totalClientPrice = productCostFCFA + shippingCostClient

  // 7. Marges
  const shippingMargin = shippingCostClient - shippingCostReal
  const netMargin = totalClientPrice - totalRealCost
  const marginPercentage = totalRealCost > 0 
    ? (netMargin / totalRealCost) * 100 
    : 0

  // 8. Projections selon volume
  const cumulativeMargin = netMargin * orderQuantity
  const estimatedMonthlyProfit = monthlyVolume > 0 
    ? netMargin * monthlyVolume 
    : undefined

  const breakdown: PricingBreakdown = {
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
      : undefined
  }

  const shippingInfo = BASE_SHIPPING_RATES[shippingMethod]

  return {
    breakdown,
    currency: 'FCFA',
    shippingMethod: {
      id: shippingMethod,
      label: shippingInfo.label,
      durationDays: shippingInfo.durationDays
    },
    volumeInfo: orderQuantity > 1 || monthlyVolume > 0 ? {
      orderQuantity,
      monthlyVolume
    } : undefined
  }
}

/**
 * Simule le pricing à partir d'un produit existant
 */
export function simulatePricingFromProduct(
  product: Partial<IProduct>,
  input: Omit<PricingSimulationInput, 'price1688' | 'baseCost' | 'exchangeRate' | 'serviceFeeRate' | 'insuranceRate'>
): PricingSimulationResult {
  return simulatePricing1688({
    price1688: product.price1688,
    baseCost: product.baseCost,
    exchangeRate: product.exchangeRate || DEFAULT_EXCHANGE_RATE,
    serviceFeeRate: product.serviceFeeRate as ServiceFeeRate,
    insuranceRate: product.insuranceRate,
    ...input
  })
}

