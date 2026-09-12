/**
 * Utilitaire de calcul complet pour le panier et les commandes
 * Intègre : poids volumétrique, réduction B2B, réduction quantité, décomposition prix
 */

import { calculateBilledWeight } from './volumetric-weight'
import { calculateCompleteFees, getServiceFeeTier, type ServiceFeeTier } from './tiered-service-fees'
import { applyTierDiscount, type TierPricing } from './tiered-pricing'
import { getCNYToXOFRate, DEFAULT_EXCHANGE_RATE } from './exchange-rate'
import { resolveProductPrice, type MarketplaceTier } from './resolve-product-price'

export interface CartItem {
  id: string
  name: string
  price: number // Prix avec frais inclus (pour affichage)
  price1688?: number // Prix fournisseur en yuan
  baseCostFcfa?: number // Coût fournisseur déjà converti en FCFA (prioritaire sur price1688)
  marginRate?: number // Marge commerciale sur le coût sourcing (%, défaut 0) — reflète le salePrice affiché
  qty: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  b2bPrice?: number // Prix wholesale en FCFA (5+ pcs ou compte Pro)
  priceTiers?: { minQty?: number; price?: number }[] // Paliers dégressifs produit
  // Frais spécifiques au produit
  exchangeRate?: number
  serviceFeeRate?: number
  insuranceRate?: number
  // Tier marketplace de l'acheteur (passé depuis le JWT)
  marketplaceTier?: MarketplaceTier
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

  // true si aucun coût sourcing disponible → prix retail utilisés comme base
  usingRetailFallback: boolean

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
  // Pricing retail/wholesale appliqué
  appliedPricing: {
    hasWholesaleItems: boolean
    wholesaleItemCount: number
    retailItemCount: number
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
    serviceFeeTiers?: ServiceFeeTier[]
  } = {}
): Promise<CompleteCartCalculation> {
  // 1. Récupérer le taux de change actuel
  const exchangeRate = await getCNYToXOFRate()
  
  // 2. Calculer le coût fournisseur total
  let supplierCost = 0
  let retailOnlyItemsTotal = 0 // Produits sans coût sourcing → facturés au prix affiché
  let totalQuantity = 0
  let totalWeight = 0
  let totalVolumetricWeight = 0
  let totalVolume = 0
  let wholesaleItemCount = 0
  let retailItemCount = 0
  
  for (const item of items) {
    const qty = item.qty || 1
    totalQuantity += qty
    
    // Résoudre le prix applicable (retail vs wholesale)
    const resolved = resolveProductPrice({
      price: item.price,
      b2bPrice: item.b2bPrice,
      qty,
      marketplaceTier: item.marketplaceTier,
      priceTiers: item.priceTiers
    })
    if (resolved.priceType === 'wholesale') {
      wholesaleItemCount += qty
    } else {
      retailItemCount += qty
    }
    
    // Base facturée = prix unitaire affiché au catalogue (salePrice = coût
    // sourcing × (1 + marge) pour les imports, `price` sinon), modulé par les
    // paliers quantité et le prix wholesale. Ainsi le montant facturé est
    // exactement celui affiché au client.
    const hasSourcingCost =
      (typeof item.baseCostFcfa === 'number' && item.baseCostFcfa > 0) ||
      (typeof item.price1688 === 'number' && item.price1688 > 0)
    if (hasSourcingCost) {
      supplierCost += resolved.appliedPrice * qty
    } else {
      retailOnlyItemsTotal += resolved.appliedPrice * qty
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
    
    // Volume : volumeM3 explicite, sinon dérivé des dimensions (L×l×h en cm → m³)
    const itemVolumeM3 =
      (typeof item.volumeM3 === 'number' && item.volumeM3 > 0)
        ? item.volumeM3
        : (item.lengthCm && item.widthCm && item.heightCm)
          ? (item.lengthCm * item.widthCm * item.heightCm) / 1_000_000
          : 0
    if (itemVolumeM3 > 0) {
      totalVolume += itemVolumeM3 * qty
    }
  }
  
  supplierCost = Math.round(supplierCost)
  retailOnlyItemsTotal = Math.round(retailOnlyItemsTotal)

  // Fallback critique: si aucun coût sourcing disponible sur TOUT le panier,
  // les prix affichés (retail/wholesale) sont utilisés comme base sans frais d'import.
  // Panier mixte : les articles sans sourcing restent facturés au prix affiché
  // (retailOnlyItemsTotal) en plus du coût sourcing des articles importés.
  const usingRetailFallback = supplierCost === 0
  const merchandiseBase = supplierCost + retailOnlyItemsTotal

  // 3. Déterminer le palier B2B et calculer les frais
  //    Les frais de service/assurance (import) ne s'appliquent qu'au coût sourcing ;
  //    le palier est déterminé sur le total marchandises.
  const b2bTier = getServiceFeeTier(merchandiseBase, options.serviceFeeTiers)
  const standardServiceFeeRate = options.serviceFeeTiers?.[0]?.feeRate ?? 10
  const insuranceRate = options.insuranceRate ?? 2.5

  const feesBreakdown = usingRetailFallback
    ? {
        finalPrice: merchandiseBase,
        serviceFee: { rate: 0, amount: 0, savingsVsStandard: 0 },
        insuranceFee: { rate: 0, amount: 0 },
        totalFees: 0
      }
    : (() => {
        const f = calculateCompleteFees(supplierCost, merchandiseBase, {
          insuranceRate,
          serviceFeeTiers: options.serviceFeeTiers
        })
        return { ...f, finalPrice: f.finalPrice + retailOnlyItemsTotal }
      })()
  
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
      supplierCost: merchandiseBase,
      serviceFeeRate: feesBreakdown.serviceFee.rate,
      serviceFeeStandardRate: standardServiceFeeRate,
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
    usingRetailFallback,
    b2bTier: {
      label: b2bTier.label,
      minAmount: b2bTier.minAmount,
      maxAmount: b2bTier.maxAmount,
      feeRate: b2bTier.feeRate
    },
    nextTierProgress: {
      hasNextTier: false, // Sera calculé côté client avec ServiceFeeTierProgress
      progressPercent: 0
    },
    appliedPricing: {
      hasWholesaleItems: wholesaleItemCount > 0,
      wholesaleItemCount,
      retailItemCount
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
    serviceFeeTiers?: ServiceFeeTier[]
  } = {}
): CompleteCartCalculation {
  const exchangeRate = options.exchangeRate || DEFAULT_EXCHANGE_RATE
  const standardServiceFeeRate = options.serviceFeeTiers?.[0]?.feeRate ?? 10
  
  // Simuler un appel async synchrone
  const syncResult: CompleteCartCalculation = {
    totalQuantity: 0,
    totalItems: items.length,
    fees: {
      supplierCost: 0,
      serviceFeeRate: standardServiceFeeRate,
      serviceFeeStandardRate: standardServiceFeeRate,
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
    usingRetailFallback: false,
    b2bTier: {
      label: 'Standard',
      minAmount: 0,
      feeRate: standardServiceFeeRate
    },
    nextTierProgress: {
      hasNextTier: false,
      progressPercent: 0
    },
    appliedPricing: {
      hasWholesaleItems: false,
      wholesaleItemCount: 0,
      retailItemCount: 0
    }
  }
  
  // Calcul simplifié pour le client
  let supplierCost = 0
  let retailOnlyItemsTotal = 0
  let totalQuantity = 0
  let totalWeight = 0

  for (const item of items) {
    const qty = item.qty || 1
    totalQuantity += qty

    const unitSourcingCost =
      typeof item.baseCostFcfa === 'number' && item.baseCostFcfa > 0
        ? item.baseCostFcfa
        : item.price1688 && item.price1688 > 0
          ? item.price1688 * exchangeRate
          : 0
    const marginRate = typeof item.marginRate === 'number' && item.marginRate > 0 ? item.marginRate : 0
    supplierCost += unitSourcingCost * (1 + marginRate / 100) * qty
    if (unitSourcingCost === 0) {
      retailOnlyItemsTotal += (item.price || 0) * qty
    }

    if (item.weightKg) {
      totalWeight += item.weightKg * qty
    }
  }

  supplierCost = Math.round(supplierCost)
  retailOnlyItemsTotal = Math.round(retailOnlyItemsTotal)
  const merchandiseBase = supplierCost + retailOnlyItemsTotal
  syncResult.usingRetailFallback = supplierCost === 0

  // Frais (appliqués au coût sourcing uniquement ; palier sur le total marchandises)
  const serviceFeeTier = getServiceFeeTier(merchandiseBase, options.serviceFeeTiers)
  const serviceFeeRate = serviceFeeTier.feeRate
  const insuranceRate = options.insuranceRate ?? 2.5
  const serviceFeeAmount = Math.round(supplierCost * (serviceFeeRate / 100))
  const insuranceAmount = Math.round(supplierCost * (insuranceRate / 100))
  
  syncResult.totalQuantity = totalQuantity
  syncResult.fees = {
    supplierCost: merchandiseBase,
    serviceFeeRate,
    serviceFeeStandardRate: standardServiceFeeRate,
    serviceFeeAmount,
    serviceFeeSavings: Math.max(0, Math.round(supplierCost * ((standardServiceFeeRate - serviceFeeRate) / 100))),
    insuranceRate,
    insuranceAmount,
    totalFees: serviceFeeAmount + insuranceAmount
  }

  syncResult.b2bTier = {
    label: serviceFeeTier.label,
    minAmount: serviceFeeTier.minAmount,
    maxAmount: serviceFeeTier.maxAmount,
    feeRate: serviceFeeTier.feeRate
  }
  
  // Réduction quantité
  const quantityTier = applyTierDiscount(merchandiseBase + serviceFeeAmount + insuranceAmount, totalQuantity)
  syncResult.quantityDiscount = {
    percent: quantityTier.discountPercent,
    amount: quantityTier.discountAmount,
    tier: quantityTier.tier
  }
  
  syncResult.subtotalBeforeDiscounts = merchandiseBase + serviceFeeAmount + insuranceAmount
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
