/**
 * Utilitaire de calcul complet pour le panier et les commandes
 * Intègre : poids volumétrique, réduction B2B, réduction quantité, décomposition prix
 */

import { calculateBilledWeight } from './volumetric-weight'
import { calculateCompleteFees, getServiceFeeTier, type CompleteFeesBreakdown } from './tiered-service-fees'
import { applyTierDiscount, type TierPricing } from './tiered-pricing'
import { getCNYToXOFRate, DEFAULT_EXCHANGE_RATE } from './exchange-rate'

export interface CartItem {
  id: string
  name: string
  price: number // Prix avec frais inclus (pour affichage)
  price1688?: number // Prix fournisseur en yuan
  qty: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  // Frais spécifiques au produit
  exchangeRate?: number
  serviceFeeRate?: number
  insuranceRate?: number
}

export interface ShippingCalculation {
  methodId: string
  methodLabel: string
  actualWeight: number
  volumetricWeight: number
  billedWeight: number
  billingMethod: 'actual' | 'volumetric'
  ratePerKg: number
  cost: number
  minimumCharge?: number
}

export interface CompleteCartCalculation {
  // Totaux physiques
  totalQuantity: number
  totalItems: number
  
  // Frais détaillés
  fees: {
    supplierCost: number        // Total fournisseurs (1688 converti)
    serviceFeeRate: number      // Taux appliqué (avec réduction B2B)
    serviceFeeStandardRate: number // 10%
    serviceFeeAmount: number
    serviceFeeSavings: number   // Économie B2B
    insuranceRate: number
    insuranceAmount: number
    totalFees: number
  }
  
  // Sous-totaux
  subtotalBeforeDiscounts: number  // Fournisseur + frais
  quantityDiscount: {
    percent: number
    amount: number
    tier: TierPricing | null
  }
  subtotal: number                  // Après réduction quantité
  
  // Transport
  shipping: ShippingCalculation | null
  
  // Total final
  total: number
  
  // Informations B2B
  b2bTier: {
    label: string
    minAmount: number
    maxAmount?: number
    feeRate: number
  }
  nextTierProgress: {
    hasNextTier: boolean
    amountNeeded?: number
    progressPercent: number
  }
}

/**
 * Calcule le total complet d'un panier avec toutes les réductions
 */
export async function calculateCartTotal(
  items: CartItem[],
  shippingMethodId: string,
  shippingRate: { rate: number; minimumCharge?: number; label: string },
  options: {
    insuranceRate?: number
  } = {}
): Promise<CompleteCartCalculation> {
  // 1. Récupérer le taux de change actuel
  const exchangeRate = await getCNYToXOFRate()
  
  // 2. Calculer le coût fournisseur total
  let supplierCost = 0
  let totalQuantity = 0
  let totalWeight = 0
  let totalVolumetricWeight = 0
  let totalVolume = 0
  
  for (const item of items) {
    const qty = item.qty || 1
    totalQuantity += qty
    
    // Coût fournisseur
    if (item.price1688 && item.price1688 > 0) {
      const itemExchangeRate = item.exchangeRate || exchangeRate
      supplierCost += item.price1688 * itemExchangeRate * qty
    }
    
    // Poids
    if (item.weightKg) {
      totalWeight += item.weightKg * qty
      
      // Calcul volumétrique si dimensions disponibles
      if (item.lengthCm && item.widthCm && item.heightCm) {
        const itemVolumetric = calculateBilledWeight({
          actualWeightKg: item.weightKg,
          lengthCm: item.lengthCm,
          widthCm: item.widthCm,
          heightCm: item.heightCm
        })
        totalVolumetricWeight += itemVolumetric.volumetricWeight * qty
      }
    }
    
    // Volume
    if (item.volumeM3) {
      totalVolume += item.volumeM3 * qty
    }
  }
  
  supplierCost = Math.round(supplierCost)
  
  // 3. Déterminer le palier B2B et calculer les frais
  const b2bTier = getServiceFeeTier(supplierCost)
  const insuranceRate = options.insuranceRate ?? 2.5
  
  const feesBreakdown = calculateCompleteFees(supplierCost, supplierCost, {
    insuranceRate
  })
  
  // 4. Calculer le sous-total avant réduction quantité
  const subtotalBeforeDiscounts = feesBreakdown.finalPrice
  
  // 5. Appliquer la réduction par quantité
  const quantityTier = applyTierDiscount(subtotalBeforeDiscounts, totalQuantity)
  
  // 6. Calculer le transport avec poids volumétrique
  let shipping: ShippingCalculation | null = null
  
  if (shippingMethodId === 'sea_freight') {
    // Maritime: par volume
    if (totalVolume > 0) {
      const cost = Math.max(
        totalVolume * shippingRate.rate,
        shippingRate.minimumCharge || 0
      )
      shipping = {
        methodId: shippingMethodId,
        methodLabel: shippingRate.label,
        actualWeight: totalWeight,
        volumetricWeight: 0,
        billedWeight: 0,
        billingMethod: 'actual',
        ratePerKg: shippingRate.rate,
        cost: Math.round(cost),
        minimumCharge: shippingRate.minimumCharge
      }
    }
  } else {
    // Aérien: prendre le max entre poids réel et volumétrique
    const weightInfo = calculateBilledWeight({
      actualWeightKg: totalWeight || 0.1,
      lengthCm: undefined, // On utilise déjà les totaux calculés
      widthCm: undefined,
      heightCm: undefined
    })
    
    // Recalculer le vrai poids facturable (max réel vs volumétrique)
    const billedWeight = Math.max(totalWeight, totalVolumetricWeight) || 0.1
    
    const baseCost = billedWeight * shippingRate.rate
    const cost = Math.max(baseCost, shippingRate.minimumCharge || 0)
    
    shipping = {
      methodId: shippingMethodId,
      methodLabel: shippingRate.label,
      actualWeight: totalWeight,
      volumetricWeight: totalVolumetricWeight,
      billedWeight,
      billingMethod: totalVolumetricWeight > totalWeight ? 'volumetric' : 'actual',
      ratePerKg: shippingRate.rate,
      cost: Math.round(cost),
      minimumCharge: shippingRate.minimumCharge
    }
  }
  
  // 7. Total final
  const subtotal = quantityTier.finalPrice
  const total = subtotal + (shipping?.cost || 0)
  
  return {
    totalQuantity,
    totalItems: items.length,
    fees: {
      supplierCost,
      serviceFeeRate: feesBreakdown.serviceFee.rate,
      serviceFeeStandardRate: 10,
      serviceFeeAmount: feesBreakdown.serviceFee.amount,
      serviceFeeSavings: feesBreakdown.serviceFee.savingsVsStandard,
      insuranceRate: feesBreakdown.insuranceFee.rate,
      insuranceAmount: feesBreakdown.insuranceFee.amount,
      totalFees: feesBreakdown.totalFees
    },
    subtotalBeforeDiscounts,
    quantityDiscount: {
      percent: quantityTier.discountPercent,
      amount: quantityTier.discountAmount,
      tier: quantityTier.tier
    },
    subtotal,
    shipping,
    total,
    b2bTier: {
      label: b2bTier.label,
      minAmount: b2bTier.minAmount,
      maxAmount: b2bTier.maxAmount,
      feeRate: b2bTier.feeRate
    },
    nextTierProgress: {
      hasNextTier: false, // Sera calculé côté client avec ServiceFeeTierProgress
      progressPercent: 0
    }
  }
}

/**
 * Version synchrone pour calcul rapide côté client (sans API call)
 * Utilise le taux de change par défaut
 */
export function calculateCartTotalSync(
  items: CartItem[],
  shippingMethodId: string,
  shippingRate: { rate: number; minimumCharge?: number; label: string },
  options: {
    insuranceRate?: number
    exchangeRate?: number // Taux fixe pour calcul synchrone
  } = {}
): CompleteCartCalculation {
  const exchangeRate = options.exchangeRate || DEFAULT_EXCHANGE_RATE
  
  // Simuler un appel async synchrone
  const syncResult: CompleteCartCalculation = {
    totalQuantity: 0,
    totalItems: items.length,
    fees: {
      supplierCost: 0,
      serviceFeeRate: 10,
      serviceFeeStandardRate: 10,
      serviceFeeAmount: 0,
      serviceFeeSavings: 0,
      insuranceRate: options.insuranceRate ?? 2.5,
      insuranceAmount: 0,
      totalFees: 0
    },
    subtotalBeforeDiscounts: 0,
    quantityDiscount: {
      percent: 0,
      amount: 0,
      tier: null
    },
    subtotal: 0,
    shipping: null,
    total: 0,
    b2bTier: {
      label: 'Standard',
      minAmount: 0,
      feeRate: 10
    },
    nextTierProgress: {
      hasNextTier: false,
      progressPercent: 0
    }
  }
  
  // Calcul simplifié pour le client
  let supplierCost = 0
  let totalQuantity = 0
  let totalWeight = 0
  
  for (const item of items) {
    const qty = item.qty || 1
    totalQuantity += qty
    
    if (item.price1688 && item.price1688 > 0) {
      supplierCost += item.price1688 * exchangeRate * qty
    }
    
    if (item.weightKg) {
      totalWeight += item.weightKg * qty
    }
  }
  
  supplierCost = Math.round(supplierCost)
  
  // Frais
  const serviceFeeRate = 10
  const insuranceRate = options.insuranceRate ?? 2.5
  const serviceFeeAmount = Math.round(supplierCost * (serviceFeeRate / 100))
  const insuranceAmount = Math.round(supplierCost * (insuranceRate / 100))
  
  syncResult.totalQuantity = totalQuantity
  syncResult.fees = {
    supplierCost,
    serviceFeeRate,
    serviceFeeStandardRate: 10,
    serviceFeeAmount,
    serviceFeeSavings: 0,
    insuranceRate,
    insuranceAmount,
    totalFees: serviceFeeAmount + insuranceAmount
  }
  
  // Réduction quantité
  const quantityTier = applyTierDiscount(supplierCost + serviceFeeAmount + insuranceAmount, totalQuantity)
  syncResult.quantityDiscount = {
    percent: quantityTier.discountPercent,
    amount: quantityTier.discountAmount,
    tier: quantityTier.tier
  }
  
  syncResult.subtotalBeforeDiscounts = supplierCost + serviceFeeAmount + insuranceAmount
  syncResult.subtotal = quantityTier.finalPrice
  
  // Transport simple
  const billedWeight = Math.max(totalWeight, 0.1)
  const baseCost = billedWeight * shippingRate.rate
  const shippingCost = Math.round(Math.max(baseCost, shippingRate.minimumCharge || 0))
  
  syncResult.shipping = {
    methodId: shippingMethodId,
    methodLabel: shippingRate.label,
    actualWeight: totalWeight,
    volumetricWeight: 0,
    billedWeight,
    billingMethod: 'actual',
    ratePerKg: shippingRate.rate,
    cost: shippingCost,
    minimumCharge: shippingRate.minimumCharge
  }
  
  syncResult.total = syncResult.subtotal + shippingCost
  
  return syncResult
}
