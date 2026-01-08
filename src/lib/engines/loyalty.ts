/**
 * Loyalty Engine - IT Vision
 * 
 * Moteur de fidélité pour gérer:
 * - Points de fidélité
 * - Niveaux/Tiers clients
 * - Récompenses
 * - Programmes de parrainage
 * 
 * @module lib/engines/loyalty
 */

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

export interface LoyaltyTier {
  id: string
  name: string
  minPoints: number
  benefits: {
    discountPercent: number
    freeShipping: boolean
    prioritySupport: boolean
    exclusiveAccess: boolean
    pointsMultiplier: number
  }
  color: string
  icon: string
}

export interface LoyaltyPoints {
  customerId: string
  currentBalance: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  tier: LoyaltyTier
  tierProgress: number // % vers le prochain tier
  nextTier?: LoyaltyTier
  pointsToNextTier?: number
}

export interface PointsTransaction {
  id: string
  customerId: string
  type: 'earn' | 'redeem' | 'expire' | 'adjust'
  points: number
  reason: string
  reference?: string
  createdAt: Date
  expiresAt?: Date
}

export interface Reward {
  id: string
  name: string
  description: string
  pointsCost: number
  type: 'discount' | 'product' | 'shipping' | 'experience'
  value: number // En FCFA pour discount/shipping, ID produit pour product
  minTier?: string
  stock?: number
  expiresAt?: Date
}

// ============================================================================
// CONFIGURATION DES TIERS
// ============================================================================

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    benefits: {
      discountPercent: 0,
      freeShipping: false,
      prioritySupport: false,
      exclusiveAccess: false,
      pointsMultiplier: 1,
    },
    color: '#CD7F32',
    icon: '🥉',
  },
  {
    id: 'silver',
    name: 'Argent',
    minPoints: 1000,
    benefits: {
      discountPercent: 5,
      freeShipping: false,
      prioritySupport: false,
      exclusiveAccess: false,
      pointsMultiplier: 1.25,
    },
    color: '#C0C0C0',
    icon: '🥈',
  },
  {
    id: 'gold',
    name: 'Or',
    minPoints: 5000,
    benefits: {
      discountPercent: 10,
      freeShipping: true,
      prioritySupport: true,
      exclusiveAccess: false,
      pointsMultiplier: 1.5,
    },
    color: '#FFD700',
    icon: '🥇',
  },
  {
    id: 'platinum',
    name: 'Platine',
    minPoints: 15000,
    benefits: {
      discountPercent: 15,
      freeShipping: true,
      prioritySupport: true,
      exclusiveAccess: true,
      pointsMultiplier: 2,
    },
    color: '#E5E4E2',
    icon: '💎',
  },
  {
    id: 'diamond',
    name: 'Diamant',
    minPoints: 50000,
    benefits: {
      discountPercent: 20,
      freeShipping: true,
      prioritySupport: true,
      exclusiveAccess: true,
      pointsMultiplier: 3,
    },
    color: '#B9F2FF',
    icon: '👑',
  },
]

// ============================================================================
// RÈGLES D'ATTRIBUTION DE POINTS
// ============================================================================

export const POINTS_RULES = {
  // Points par achat (1 point par tranche de 1000 FCFA)
  purchase: {
    pointsPer: 1,
    amountPer: 1000,
  },
  // Bonus inscription
  signup: 100,
  // Bonus premier achat
  firstPurchase: 200,
  // Bonus anniversaire
  birthday: 500,
  // Bonus parrainage (parrain)
  referralGiven: 100,
  // Bonus parrainage (filleul)
  referralReceived: 50,
  // Bonus avis vérifié
  verifiedReview: 50,
  // Bonus avis simple
  review: 25,
  // Bonus partage social
  socialShare: 10,
}

// ============================================================================
// IN-MEMORY STORES (à remplacer par MongoDB en production)
// ============================================================================

interface CustomerLoyalty {
  balance: number
  lifetimeEarned: number
  lifetimeRedeemed: number
  tierId: string
  transactions: PointsTransaction[]
}

const customerLoyalty: Map<string, CustomerLoyalty> = new Map()
const availableRewards: Map<string, Reward> = new Map()

// Initialiser quelques récompenses
availableRewards.set('discount-5000', {
  id: 'discount-5000',
  name: 'Bon de 5 000 FCFA',
  description: 'Réduction de 5 000 FCFA sur votre prochaine commande',
  pointsCost: 500,
  type: 'discount',
  value: 5000,
})

availableRewards.set('discount-10000', {
  id: 'discount-10000',
  name: 'Bon de 10 000 FCFA',
  description: 'Réduction de 10 000 FCFA sur votre prochaine commande',
  pointsCost: 900,
  type: 'discount',
  value: 10000,
  minTier: 'silver',
})

availableRewards.set('free-shipping', {
  id: 'free-shipping',
  name: 'Livraison gratuite',
  description: 'Livraison offerte sur votre prochaine commande',
  pointsCost: 300,
  type: 'shipping',
  value: 0,
})

availableRewards.set('discount-25000', {
  id: 'discount-25000',
  name: 'Bon de 25 000 FCFA',
  description: 'Réduction de 25 000 FCFA sur votre prochaine commande',
  pointsCost: 2000,
  type: 'discount',
  value: 25000,
  minTier: 'gold',
})

// ============================================================================
// LOYALTY ENGINE CLASS
// ============================================================================

export class LoyaltyEngine {
  private static instance: LoyaltyEngine | null = null

  private constructor() {}

  static getInstance(): LoyaltyEngine {
    if (!LoyaltyEngine.instance) {
      LoyaltyEngine.instance = new LoyaltyEngine()
    }
    return LoyaltyEngine.instance
  }

  /**
   * Récupère le statut de fidélité d'un client
   */
  getCustomerLoyalty(customerId: string): LoyaltyPoints {
    const data = this.getOrCreateCustomer(customerId)
    const tier = this.getTierForPoints(data.lifetimeEarned)
    const nextTier = this.getNextTier(tier.id)

    return {
      customerId,
      currentBalance: data.balance,
      lifetimeEarned: data.lifetimeEarned,
      lifetimeRedeemed: data.lifetimeRedeemed,
      tier,
      tierProgress: nextTier 
        ? ((data.lifetimeEarned - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100
        : 100,
      nextTier,
      pointsToNextTier: nextTier ? nextTier.minPoints - data.lifetimeEarned : 0,
    }
  }

  /**
   * Attribue des points à un client
   */
  earnPoints(
    customerId: string,
    points: number,
    reason: string,
    reference?: string
  ): PointsTransaction {
    const data = this.getOrCreateCustomer(customerId)
    const tier = this.getTierForPoints(data.lifetimeEarned)
    
    // Appliquer le multiplicateur de tier
    const adjustedPoints = Math.floor(points * tier.benefits.pointsMultiplier)

    const transaction: PointsTransaction = {
      id: crypto.randomUUID(),
      customerId,
      type: 'earn',
      points: adjustedPoints,
      reason,
      reference,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 an
    }

    data.balance += adjustedPoints
    data.lifetimeEarned += adjustedPoints
    data.transactions.push(transaction)

    // Vérifier changement de tier
    const newTier = this.getTierForPoints(data.lifetimeEarned)
    if (newTier.id !== tier.id) {
      console.log(`[Loyalty] ${customerId} upgraded from ${tier.name} to ${newTier.name}!`)
    }

    console.log(`[Loyalty] ${customerId} earned ${adjustedPoints} points (${reason})`)
    return transaction
  }

  /**
   * Attribue des points basés sur un achat
   */
  earnPointsFromPurchase(
    customerId: string,
    orderTotal: number,
    orderId: string,
    isFirstPurchase = false
  ): PointsTransaction[] {
    const transactions: PointsTransaction[] = []

    // Points de base
    const basePoints = Math.floor(orderTotal / POINTS_RULES.purchase.amountPer) * POINTS_RULES.purchase.pointsPer
    if (basePoints > 0) {
      transactions.push(this.earnPoints(customerId, basePoints, 'Achat', orderId))
    }

    // Bonus premier achat
    if (isFirstPurchase) {
      transactions.push(this.earnPoints(customerId, POINTS_RULES.firstPurchase, 'Premier achat', orderId))
    }

    return transactions
  }

  /**
   * Utilise des points pour une récompense
   */
  redeemPoints(customerId: string, rewardId: string): {
    success: boolean
    message: string
    reward?: Reward
    transaction?: PointsTransaction
  } {
    const data = this.getOrCreateCustomer(customerId)
    const reward = availableRewards.get(rewardId)

    if (!reward) {
      return { success: false, message: 'Récompense non trouvée' }
    }

    if (reward.stock !== undefined && reward.stock <= 0) {
      return { success: false, message: 'Récompense épuisée' }
    }

    if (reward.expiresAt && reward.expiresAt < new Date()) {
      return { success: false, message: 'Récompense expirée' }
    }

    if (data.balance < reward.pointsCost) {
      return { 
        success: false, 
        message: `Points insuffisants (${data.balance}/${reward.pointsCost})` 
      }
    }

    // Vérifier le tier minimum
    if (reward.minTier) {
      const currentTier = this.getTierForPoints(data.lifetimeEarned)
      const requiredTier = LOYALTY_TIERS.find(t => t.id === reward.minTier)
      if (requiredTier && currentTier.minPoints < requiredTier.minPoints) {
        return { 
          success: false, 
          message: `Niveau ${requiredTier.name} requis` 
        }
      }
    }

    // Effectuer la rédemption
    const transaction: PointsTransaction = {
      id: crypto.randomUUID(),
      customerId,
      type: 'redeem',
      points: -reward.pointsCost,
      reason: `Récompense: ${reward.name}`,
      reference: reward.id,
      createdAt: new Date(),
    }

    data.balance -= reward.pointsCost
    data.lifetimeRedeemed += reward.pointsCost
    data.transactions.push(transaction)

    if (reward.stock !== undefined) {
      reward.stock--
    }

    console.log(`[Loyalty] ${customerId} redeemed ${reward.pointsCost} points for ${reward.name}`)

    return {
      success: true,
      message: 'Récompense obtenue!',
      reward,
      transaction,
    }
  }

  /**
   * Liste les récompenses disponibles pour un client
   */
  getAvailableRewards(customerId: string): Array<Reward & { 
    canRedeem: boolean
    reason?: string 
  }> {
    const data = this.getOrCreateCustomer(customerId)
    const tier = this.getTierForPoints(data.lifetimeEarned)

    return Array.from(availableRewards.values()).map(reward => {
      let canRedeem = true
      let reason: string | undefined

      if (data.balance < reward.pointsCost) {
        canRedeem = false
        reason = `${reward.pointsCost - data.balance} points manquants`
      } else if (reward.minTier) {
        const requiredTier = LOYALTY_TIERS.find(t => t.id === reward.minTier)
        if (requiredTier && tier.minPoints < requiredTier.minPoints) {
          canRedeem = false
          reason = `Niveau ${requiredTier.name} requis`
        }
      } else if (reward.stock !== undefined && reward.stock <= 0) {
        canRedeem = false
        reason = 'Stock épuisé'
      } else if (reward.expiresAt && reward.expiresAt < new Date()) {
        canRedeem = false
        reason = 'Expirée'
      }

      return { ...reward, canRedeem, reason }
    })
  }

  /**
   * Historique des transactions d'un client
   */
  getTransactionHistory(
    customerId: string,
    limit = 20
  ): PointsTransaction[] {
    const data = this.getOrCreateCustomer(customerId)
    return data.transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * Traite le parrainage
   */
  processReferral(referrerId: string, referredId: string): void {
    // Points pour le parrain
    this.earnPoints(referrerId, POINTS_RULES.referralGiven, 'Parrainage', referredId)
    
    // Points pour le filleul
    this.earnPoints(referredId, POINTS_RULES.referralReceived, 'Bonus parrainage', referrerId)
  }

  /**
   * Applique la réduction tier à un montant
   */
  applyTierDiscount(customerId: string, amount: number): {
    originalAmount: number
    discount: number
    finalAmount: number
    tierName: string
  } {
    const data = this.getOrCreateCustomer(customerId)
    const tier = this.getTierForPoints(data.lifetimeEarned)
    const discount = Math.floor(amount * (tier.benefits.discountPercent / 100))

    return {
      originalAmount: amount,
      discount,
      finalAmount: amount - discount,
      tierName: tier.name,
    }
  }

  /**
   * Vérifie si le client a droit à la livraison gratuite
   */
  hasFreeShipping(customerId: string): boolean {
    const data = this.getOrCreateCustomer(customerId)
    const tier = this.getTierForPoints(data.lifetimeEarned)
    return tier.benefits.freeShipping
  }

  // ============================================================================
  // HELPERS PRIVÉS
  // ============================================================================

  private getOrCreateCustomer(customerId: string): CustomerLoyalty {
    let data = customerLoyalty.get(customerId)
    if (!data) {
      data = {
        balance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        tierId: 'bronze',
        transactions: [],
      }
      customerLoyalty.set(customerId, data)
    }
    return data
  }

  private getTierForPoints(points: number): LoyaltyTier {
    // Trouver le tier le plus élevé que le client a atteint
    for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
      if (points >= LOYALTY_TIERS[i].minPoints) {
        return LOYALTY_TIERS[i]
      }
    }
    return LOYALTY_TIERS[0]
  }

  private getNextTier(currentTierId: string): LoyaltyTier | undefined {
    const currentIndex = LOYALTY_TIERS.findIndex(t => t.id === currentTierId)
    if (currentIndex < LOYALTY_TIERS.length - 1) {
      return LOYALTY_TIERS[currentIndex + 1]
    }
    return undefined
  }

  /**
   * Statistiques globales du programme de fidélité
   */
  getStats(): {
    totalMembers: number
    totalPointsIssued: number
    totalPointsRedeemed: number
    tierDistribution: Record<string, number>
  } {
    let totalPointsIssued = 0
    let totalPointsRedeemed = 0
    const tierDistribution: Record<string, number> = {}

    for (const tier of LOYALTY_TIERS) {
      tierDistribution[tier.id] = 0
    }

    for (const [, data] of customerLoyalty) {
      totalPointsIssued += data.lifetimeEarned
      totalPointsRedeemed += data.lifetimeRedeemed
      
      const tier = this.getTierForPoints(data.lifetimeEarned)
      tierDistribution[tier.id]++
    }

    return {
      totalMembers: customerLoyalty.size,
      totalPointsIssued,
      totalPointsRedeemed,
      tierDistribution,
    }
  }
}

// Export singleton
export const loyaltyEngine = LoyaltyEngine.getInstance()
