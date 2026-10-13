/**
 * Utilitaire de calcul complet pour le panier et les commandes
 * Intègre : poids volumétrique, réduction B2B, réduction quantité, décomposition prix
 */

import { calculateVolumetricWeight, VOLUMETRIC_DIVISOR } from './volumetric-weight'
import { calculateCompleteFees, getServiceFeeTier, type ServiceFeeTier } from './tiered-service-fees'
import { applyTierDiscount, type TierPricing } from './tiered-pricing'
import { DEFAULT_EXCHANGE_RATE } from './exchange-rate'
import { resolveProductPrice, type MarketplaceTier } from './resolve-product-price'

/**
 * Poids retenu pour un article importé sans poids ni dimensions renseignés.
 * Sans cette valeur, l'article voyageait gratuitement (0 kg / 0 m³).
 */
const DEFAULT_ITEM_WEIGHT_KG = Number(process.env.DEFAULT_ITEM_WEIGHT_KG) > 0 ? Number(process.env.DEFAULT_ITEM_WEIGHT_KG) : 0.5
/** Règle maritime « poids ou volume » : 1 tonne = 1 m³ payant */
const SEA_KG_PER_M3 = 1000

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
  /** Produit boutique en stock local (Dakar) — livré par coursier ≤24h, exclu du fret import */
  localDelivery?: boolean
  /** Boutique d'origine d'un produit local — sert à facturer un forfait par boutique */
  localShopId?: string
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
  /** Forfait coursier local inclus dans `cost` (panier mixte : produits boutique + import) */
  localFee?: number
  /** Volume facturé (maritime) en m³ */
  billedVolumeM3?: number
  /** Nombre d'unités dont le poids est estimé (fiche produit sans poids ni dimensions) */
  estimatedWeightUnits?: number
  /** Détail par boutique — un forfait par boutique, réglable par le vendeur */
  localShipments?: { shopId: string; shopName?: string; feeFcfa: number; subtotal: number }[]
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
    singleImportServiceFeeRate?: number
    /** Forfait livraison locale (≤24h) par défaut — appliqué par boutique */
    localDeliveryFlatFee?: number
    /** Config livraison par boutique : forfait propre + seuil « offerte dès » */
    localDeliveryShops?: { shopId: string; shopName?: string; feeFcfa?: number; freeAboveFcfa?: number }[]
  } = {}
): Promise<CompleteCartCalculation> {
  // 1. Les prix unitaires arrivent déjà convertis en FCFA (buildCalculatorItems)
  
  // 2. Calculer le coût fournisseur total
  let supplierCost = 0
  let retailOnlyItemsTotal = 0 // Produits sans coût sourcing → facturés au prix affiché
  let totalQuantity = 0
  let totalWeight = 0
  let totalVolumetricWeight = 0
  let totalVolume = 0
  let importQuantity = 0
  let estimatedWeightUnits = 0
  let wholesaleItemCount = 0
  let retailItemCount = 0
  // Sous-total marchandise par boutique (produits locaux) — base du seuil « offerte dès »
  const localShopSums = new Map<string, number>()

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
    if (hasSourcingCost && !item.localDelivery) {
      supplierCost += resolved.appliedPrice * qty
    } else {
      retailOnlyItemsTotal += resolved.appliedPrice * qty
    }

    if (item.localDelivery) {
      const key = item.localShopId || '_'
      localShopSums.set(key, (localShopSums.get(key) || 0) + resolved.appliedPrice * qty)
    }

    // Poids — les produits en stock local ne passent pas par le fret import :
    // leur poids/volume est exclu de la facturation transport aérien/maritime.
    if (!item.localDelivery) {
      importQuantity += qty
      const hasDims = !!(item.lengthCm && item.widthCm && item.heightCm)
      const hasVolume = typeof item.volumeM3 === 'number' && item.volumeM3 > 0

      // Poids volumétrique dès que les dimensions (ou le volume) sont connues, même sans poids réel
      if (hasDims) {
        totalVolumetricWeight += calculateVolumetricWeight(item.lengthCm!, item.widthCm!, item.heightCm!) * qty
      } else if (hasVolume) {
        totalVolumetricWeight += (item.volumeM3! * 1_000_000 / VOLUMETRIC_DIVISOR) * qty
      }

      if (item.weightKg && item.weightKg > 0) {
        totalWeight += item.weightKg * qty
      } else if (!hasDims && !hasVolume) {
        totalWeight += DEFAULT_ITEM_WEIGHT_KG * qty
        estimatedWeightUnits += qty
      }
    }
    
    // Volume : volumeM3 explicite, sinon dérivé des dimensions (L×l×h en cm → m³)
    const itemVolumeM3 = item.localDelivery
      ? 0
      : (typeof item.volumeM3 === 'number' && item.volumeM3 > 0)
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
          serviceFeeTiers: options.serviceFeeTiers,
          singleImportServiceFeeRate: options.singleImportServiceFeeRate,
          importQuantity
        })
        return { ...f, finalPrice: f.finalPrice + retailOnlyItemsTotal }
      })()
  
  // 4. Calculer le sous-total avant réduction quantité
  const subtotalBeforeDiscounts = feesBreakdown.finalPrice
  
  // 5. Appliquer la réduction par quantité
  const quantityTier = applyTierDiscount(subtotalBeforeDiscounts, totalQuantity)
  
  // 6. Calculer le transport avec poids volumétrique
  let shipping: ShippingCalculation | null = null

  // Livraison locale : un forfait PAR boutique (chaque boutique expédie
  // séparément). Le forfait de la boutique prime ; à défaut, le tarif
  // plateforme s'applique. Seuil « livraison offerte dès » par boutique.
  const shopFees = new Map((options.localDeliveryShops || []).map(s => [s.shopId, s]))
  let localFee = 0
  const localShipments: NonNullable<ShippingCalculation['localShipments']> = []
  for (const [sid, sub] of localShopSums) {
    const cfg = shopFees.get(sid)
    const fee = cfg?.feeFcfa ?? options.localDeliveryFlatFee ?? 0
    const applied = (cfg?.freeAboveFcfa && cfg.freeAboveFcfa > 0 && sub >= cfg.freeAboveFcfa) ? 0 : Math.max(0, Math.round(fee))
    localFee += applied
    localShipments.push({ shopId: sid, shopName: cfg?.shopName, feeFcfa: applied, subtotal: sub })
  }

  if (shippingMethodId === 'local_24h') {
    // Livraison locale : somme des forfaits boutiques (≤24h, poids ignoré)
    shipping = {
      methodId: shippingMethodId,
      methodLabel: shippingRate.label,
      actualWeight: totalWeight,
      volumetricWeight: 0,
      billedWeight: 0,
      billingMethod: 'actual',
      ratePerKg: shippingRate.rate,
      cost: Math.max(localFee, shippingRate.minimumCharge || 0),
      minimumCharge: shippingRate.minimumCharge,
      localFee: localFee || undefined,
      localShipments: localShipments.length > 0 ? localShipments : undefined
    }
  } else if (shippingMethodId === 'sea_freight') {
    // Maritime : volume ou poids (1 t = 1 m³), le plus élevé — avec minimum de perception.
    // Un panier importé sans volume renseigné n'est plus expédié gratuitement.
    if (importQuantity > 0) {
      const billedVolumeM3 = Math.max(totalVolume, totalWeight / SEA_KG_PER_M3)
      const cost = Math.max(
        billedVolumeM3 * shippingRate.rate,
        shippingRate.minimumCharge || 0
      )
      shipping = {
        methodId: shippingMethodId,
        methodLabel: shippingRate.label,
        actualWeight: totalWeight,
        volumetricWeight: 0,
        billedWeight: 0,
        billingMethod: totalVolume >= totalWeight / SEA_KG_PER_M3 ? 'volumetric' : 'actual',
        ratePerKg: shippingRate.rate,
        cost: Math.round(cost) + localFee,
        minimumCharge: shippingRate.minimumCharge,
        localFee: localFee || undefined,
        localShipments: localShipments.length > 0 ? localShipments : undefined,
        billedVolumeM3: Number(billedVolumeM3.toFixed(4)),
        estimatedWeightUnits: estimatedWeightUnits || undefined
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
      cost: Math.round(cost) + localFee,
      minimumCharge: shippingRate.minimumCharge,
      localFee: localFee || undefined,
      localShipments: localShipments.length > 0 ? localShipments : undefined,
      estimatedWeightUnits: estimatedWeightUnits || undefined
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

