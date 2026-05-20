/**
 * Système de paliers de frais de service pour clients B2B
 * Réductions progressives basées sur le volume de commande
 */

export interface ServiceFeeTier {
  minAmount: number // Montant minimum de commande en FCFA
  maxAmount?: number // Montant maximum (undefined = illimité)
  feeRate: number // Taux de frais de service (%)
  label: string // Libellé pour affichage
  description: string // Description du palier
}

// Configuration des paliers de frais de service
export const SERVICE_FEE_TIERS: ServiceFeeTier[] = [
  {
    minAmount: 0,
    maxAmount: 500_000,
    feeRate: 10,
    label: 'Standard',
    description: 'Frais standard pour commandes < 500 000 FCFA'
  },
  {
    minAmount: 500_000,
    maxAmount: 2_000_000,
    feeRate: 8,
    label: 'Volume',
    description: 'Réduction volume pour commandes 500k - 2M FCFA'
  },
  {
    minAmount: 2_000_000,
    maxAmount: 5_000_000,
    feeRate: 6,
    label: 'Pro',
    description: 'Tarif professionnel pour commandes 2M - 5M FCFA'
  },
  {
    minAmount: 5_000_000,
    feeRate: 5,
    label: 'Entreprise',
    description: 'Tarif entreprise pour commandes > 5M FCFA'
  }
]

function resolveServiceFeeTiers(tiers?: ServiceFeeTier[]): ServiceFeeTier[] {
  if (!Array.isArray(tiers) || tiers.length === 0) return SERVICE_FEE_TIERS
  const normalized = tiers
    .filter((t) => Number.isFinite(t.minAmount) && t.minAmount >= 0 && Number.isFinite(t.feeRate))
    .sort((a, b) => a.minAmount - b.minAmount)

  if (normalized.length === 0) return SERVICE_FEE_TIERS

  return normalized.map((tier, index) => ({
    ...tier,
    minAmount: Math.round(tier.minAmount),
    maxAmount: index < normalized.length - 1 ? normalized[index + 1].minAmount : undefined
  }))
}

/**
 * Détermine le palier applicable pour un montant de commande donné
 */
export function getServiceFeeTier(orderAmount: number, tiers?: ServiceFeeTier[]): ServiceFeeTier {
  const sourceTiers = resolveServiceFeeTiers(tiers)
  const tier = sourceTiers.find(
    t => orderAmount >= t.minAmount && (t.maxAmount === undefined || orderAmount < t.maxAmount)
  )
  return tier ?? sourceTiers[0]
}

/**
 * Calcule le taux de frais de service applicable
 */
export function calculateServiceFeeRate(orderAmount: number, tiers?: ServiceFeeTier[]): number {
  return getServiceFeeTier(orderAmount, tiers).feeRate
}

/**
 * Calcule les frais de service pour une commande
 */
export function calculateServiceFee(
  productCost: number,
  orderAmount: number,
  customRate?: number,
  tiers?: ServiceFeeTier[]
): {
  baseAmount: number
  feeRate: number
  feeAmount: number
  tier: ServiceFeeTier
  savingsVsStandard: number // Économie par rapport au taux standard (10%)
} {
  const resolvedTiers = resolveServiceFeeTiers(tiers)
  const tier = getServiceFeeTier(orderAmount, resolvedTiers)
  const feeRate = customRate ?? tier.feeRate
  const feeAmount = Math.round(productCost * (feeRate / 100))
  
  // Calcul de l'économie vs taux standard (premier palier)
  const standardRate = resolvedTiers[0]?.feeRate ?? 10
  const standardFee = Math.round(productCost * (standardRate / 100))
  const savingsVsStandard = standardFee - feeAmount

  return {
    baseAmount: productCost,
    feeRate,
    feeAmount,
    tier,
    savingsVsStandard: Math.max(0, savingsVsStandard)
  }
}

/**
 * Interface pour le résumé complet des frais (service + assurance)
 */
export interface CompleteFeesBreakdown {
  productCost: number
  orderAmount: number
  serviceFee: {
    rate: number
    amount: number
    tier: ServiceFeeTier
    savingsVsStandard: number
  }
  insuranceFee: {
    rate: number
    amount: number
  }
  totalFees: number
  finalPrice: number
}

/**
 * Calcule le détail complet des frais pour une commande
 */
export function calculateCompleteFees(
  productCost: number,
  orderAmount: number,
  options: {
    serviceFeeRate?: number // Force un taux personnalisé
    insuranceRate?: number
    serviceFeeTiers?: ServiceFeeTier[]
  } = {}
): CompleteFeesBreakdown {
  const insuranceRate = options.insuranceRate ?? 2.5
  
  const serviceFeeCalc = calculateServiceFee(
    productCost,
    orderAmount,
    options.serviceFeeRate,
    options.serviceFeeTiers
  )
  
  const insuranceFeeAmount = Math.round(productCost * (insuranceRate / 100))

  return {
    productCost,
    orderAmount,
    serviceFee: {
      rate: serviceFeeCalc.feeRate,
      amount: serviceFeeCalc.feeAmount,
      tier: serviceFeeCalc.tier,
      savingsVsStandard: serviceFeeCalc.savingsVsStandard
    },
    insuranceFee: {
      rate: insuranceRate,
      amount: insuranceFeeAmount
    },
    totalFees: serviceFeeCalc.feeAmount + insuranceFeeAmount,
    finalPrice: productCost + serviceFeeCalc.feeAmount + insuranceFeeAmount
  }
}

/**
 * Informations sur les paliers pour affichage client
 */
export function getTiersInfo(tiers?: ServiceFeeTier[]): Array<{
  minAmount: number
  maxAmount?: number
  feeRate: number
  label: string
  description: string
  current: boolean
}> {
  return resolveServiceFeeTiers(tiers).map(t => ({
    minAmount: t.minAmount,
    maxAmount: t.maxAmount,
    feeRate: t.feeRate,
    label: t.label,
    description: t.description,
    current: false // Sera mis à jour côté client avec le montant de commande
  }))
}

/**
 * Calcule le montant restant pour atteindre le prochain palier
 */
export function getNextTierProgress(
  currentAmount: number,
  tiers?: ServiceFeeTier[]
): {
  hasNextTier: boolean
  nextTier?: ServiceFeeTier
  amountNeeded?: number
  progressPercent: number
} {
  // Trier les paliers par minAmount croissant
  const sortedTiers = [...resolveServiceFeeTiers(tiers)].sort((a, b) => a.minAmount - b.minAmount)
  
  // Trouver le palier actuel
  const currentTierIndex = sortedTiers.findIndex(
    t => currentAmount >= t.minAmount && (t.maxAmount === undefined || currentAmount < t.maxAmount)
  )
  
  if (currentTierIndex === -1 || currentTierIndex === sortedTiers.length - 1) {
    return {
      hasNextTier: false,
      progressPercent: 100
    }
  }
  
  const nextTier = sortedTiers[currentTierIndex + 1]
  const amountNeeded = nextTier.minAmount - currentAmount
  const currentTierMin = sortedTiers[currentTierIndex].minAmount
  const progressTotal = nextTier.minAmount - currentTierMin
  const progressMade = currentAmount - currentTierMin
  const progressPercent = Math.min(100, Math.round((progressMade / progressTotal) * 100))
  
  return {
    hasNextTier: true,
    nextTier,
    amountNeeded,
    progressPercent
  }
}
