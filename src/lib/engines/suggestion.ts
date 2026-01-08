/**
 * Suggestion Engine - IT Vision
 * 
 * Moteur de recommandation produits basé sur:
 * - Historique de navigation
 * - Achats passés
 * - Produits similaires
 * - Popularité
 * - Achat groupé associatif
 * 
 * @module lib/engines/suggestion
 */

import { BaseConsumer } from '../kafka/consumer'
import { CATALOG_TOPICS, ORDER_TOPICS, ANALYTICS_TOPICS } from '../kafka/topics'
import type { TopicName } from '../kafka/topics'
import type { 
  BaseEvent, 
  ProductViewedPayload, 
  OrderPlacedPayload,
  EventTrackedPayload 
} from '../kafka/types'

// ============================================================================
// TYPES
// ============================================================================

export interface ProductScore {
  productId: string
  score: number
  reasons: SuggestionReason[]
}

export interface SuggestionReason {
  type: 'viewed' | 'purchased' | 'similar' | 'popular' | 'complementary' | 'trending'
  weight: number
  detail?: string
}

export interface SuggestionContext {
  userId?: string
  sessionId: string
  currentProductId?: string
  cartProductIds?: string[]
  limit?: number
}

export interface SuggestionResult {
  products: ProductScore[]
  context: SuggestionContext
  generatedAt: string
  algorithm: string
}

// ============================================================================
// IN-MEMORY STORES (à remplacer par Redis/MongoDB en production)
// ============================================================================

// Historique des vues par session
const viewHistory: Map<string, { productId: string; timestamp: number }[]> = new Map()

// Compteur de vues globales
const productViews: Map<string, number> = new Map()

// Achats par utilisateur
const userPurchases: Map<string, string[]> = new Map()

// Produits souvent achetés ensemble
const coPurchases: Map<string, Map<string, number>> = new Map()

// ============================================================================
// SUGGESTION ENGINE CLASS
// ============================================================================

export class SuggestionEngine {
  private static instance: SuggestionEngine | null = null

  private constructor() {}

  static getInstance(): SuggestionEngine {
    if (!SuggestionEngine.instance) {
      SuggestionEngine.instance = new SuggestionEngine()
    }
    return SuggestionEngine.instance
  }

  /**
   * Enregistre une vue de produit
   */
  recordView(sessionId: string, productId: string): void {
    // Ajouter à l'historique de session
    const history = viewHistory.get(sessionId) || []
    history.push({ productId, timestamp: Date.now() })
    
    // Garder seulement les 50 dernières vues
    if (history.length > 50) {
      history.shift()
    }
    viewHistory.set(sessionId, history)

    // Incrémenter le compteur global
    const views = productViews.get(productId) || 0
    productViews.set(productId, views + 1)
  }

  /**
   * Enregistre un achat
   */
  recordPurchase(userId: string, productIds: string[]): void {
    // Ajouter aux achats utilisateur
    const purchases = userPurchases.get(userId) || []
    purchases.push(...productIds)
    userPurchases.set(userId, purchases)

    // Mettre à jour les co-achats
    for (const productA of productIds) {
      for (const productB of productIds) {
        if (productA !== productB) {
          const coMap = coPurchases.get(productA) || new Map()
          const count = coMap.get(productB) || 0
          coMap.set(productB, count + 1)
          coPurchases.set(productA, coMap)
        }
      }
    }
  }

  /**
   * Génère des suggestions personnalisées
   */
  async getSuggestions(context: SuggestionContext): Promise<SuggestionResult> {
    const scores: Map<string, ProductScore> = new Map()
    const limit = context.limit || 8

    // 1. Suggestions basées sur l'historique de navigation
    if (context.sessionId) {
      const viewScores = this.getViewBasedScores(context.sessionId)
      this.mergeScores(scores, viewScores)
    }

    // 2. Suggestions basées sur les achats passés
    if (context.userId) {
      const purchaseScores = this.getPurchaseBasedScores(context.userId)
      this.mergeScores(scores, purchaseScores)
    }

    // 3. Produits complémentaires au panier
    if (context.cartProductIds?.length) {
      const complementaryScores = this.getComplementaryScores(context.cartProductIds)
      this.mergeScores(scores, complementaryScores)
    }

    // 4. Produits similaires au produit courant
    if (context.currentProductId) {
      const similarScores = this.getSimilarScores(context.currentProductId)
      this.mergeScores(scores, similarScores)
    }

    // 5. Produits populaires (fallback)
    const popularScores = this.getPopularScores()
    this.mergeScores(scores, popularScores, 0.5) // Poids réduit

    // Exclure les produits déjà dans le panier
    const excludeIds = new Set([
      ...(context.cartProductIds || []),
      context.currentProductId,
    ].filter(Boolean))

    // Trier par score et limiter
    const products = Array.from(scores.values())
      .filter(p => !excludeIds.has(p.productId))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return {
      products,
      context,
      generatedAt: new Date().toISOString(),
      algorithm: 'hybrid-v1',
    }
  }

  /**
   * Suggestions basées sur l'historique de navigation
   */
  private getViewBasedScores(sessionId: string): ProductScore[] {
    const history = viewHistory.get(sessionId) || []
    const now = Date.now()
    const scores: ProductScore[] = []

    // Compter les vues par produit avec décroissance temporelle
    const viewCounts: Map<string, number> = new Map()
    for (const { productId, timestamp } of history) {
      // Décroissance: poids = 1 pour récent, décroit avec le temps
      const ageHours = (now - timestamp) / (1000 * 60 * 60)
      const weight = Math.exp(-ageHours / 24) // Demi-vie de 24h
      const current = viewCounts.get(productId) || 0
      viewCounts.set(productId, current + weight)
    }

    for (const [productId, count] of viewCounts) {
      scores.push({
        productId,
        score: count * 10, // Base score pour les vues
        reasons: [{
          type: 'viewed',
          weight: count,
          detail: `Vu ${Math.round(count)} fois récemment`,
        }],
      })
    }

    return scores
  }

  /**
   * Suggestions basées sur les achats passés
   */
  private getPurchaseBasedScores(userId: string): ProductScore[] {
    const purchases = userPurchases.get(userId) || []
    const scores: ProductScore[] = []

    // Trouver les produits souvent achetés avec les achats passés
    const suggestions: Map<string, number> = new Map()
    
    for (const productId of purchases) {
      const coProducts = coPurchases.get(productId)
      if (coProducts) {
        for (const [coProductId, count] of coProducts) {
          if (!purchases.includes(coProductId)) {
            const current = suggestions.get(coProductId) || 0
            suggestions.set(coProductId, current + count)
          }
        }
      }
    }

    for (const [productId, count] of suggestions) {
      scores.push({
        productId,
        score: count * 15, // Score plus élevé pour les co-achats
        reasons: [{
          type: 'purchased',
          weight: count,
          detail: `Souvent acheté avec vos achats précédents`,
        }],
      })
    }

    return scores
  }

  /**
   * Suggestions de produits complémentaires au panier
   */
  private getComplementaryScores(cartProductIds: string[]): ProductScore[] {
    const scores: ProductScore[] = []
    const suggestions: Map<string, number> = new Map()

    for (const productId of cartProductIds) {
      const coProducts = coPurchases.get(productId)
      if (coProducts) {
        for (const [coProductId, count] of coProducts) {
          if (!cartProductIds.includes(coProductId)) {
            const current = suggestions.get(coProductId) || 0
            suggestions.set(coProductId, current + count)
          }
        }
      }
    }

    for (const [productId, count] of suggestions) {
      scores.push({
        productId,
        score: count * 20, // Score élevé pour compléments au panier
        reasons: [{
          type: 'complementary',
          weight: count,
          detail: `Complète votre panier`,
        }],
      })
    }

    return scores
  }

  /**
   * Suggestions de produits similaires
   * TODO: Implémenter avec embeddings ou catégories
   */
  private getSimilarScores(currentProductId: string): ProductScore[] {
    // Pour l'instant, utilise les co-achats comme proxy de similarité
    const coProducts = coPurchases.get(currentProductId)
    if (!coProducts) return []

    const scores: ProductScore[] = []
    for (const [productId, count] of coProducts) {
      scores.push({
        productId,
        score: count * 12,
        reasons: [{
          type: 'similar',
          weight: count,
          detail: `Similaire à ce que vous regardez`,
        }],
      })
    }

    return scores
  }

  /**
   * Produits populaires (fallback)
   */
  private getPopularScores(): ProductScore[] {
    const sorted = Array.from(productViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)

    return sorted.map(([productId, views]) => ({
      productId,
      score: Math.log(views + 1) * 5, // Score logarithmique
      reasons: [{
        type: 'popular',
        weight: views,
        detail: `Populaire (${views} vues)`,
      }],
    }))
  }

  /**
   * Fusionne des scores avec pondération
   */
  private mergeScores(
    target: Map<string, ProductScore>,
    source: ProductScore[],
    multiplier = 1
  ): void {
    for (const score of source) {
      const existing = target.get(score.productId)
      if (existing) {
        existing.score += score.score * multiplier
        existing.reasons.push(...score.reasons)
      } else {
        target.set(score.productId, {
          ...score,
          score: score.score * multiplier,
        })
      }
    }
  }

  /**
   * Retourne les statistiques du moteur
   */
  getStats(): {
    sessionsTracked: number
    productsTracked: number
    totalViews: number
    coPurchasePairs: number
  } {
    let totalViews = 0
    for (const views of productViews.values()) {
      totalViews += views
    }

    let coPurchasePairs = 0
    for (const coMap of coPurchases.values()) {
      coPurchasePairs += coMap.size
    }

    return {
      sessionsTracked: viewHistory.size,
      productsTracked: productViews.size,
      totalViews,
      coPurchasePairs,
    }
  }
}

// ============================================================================
// SUGGESTION CONSUMER (écoute Kafka)
// ============================================================================

export class SuggestionConsumer extends BaseConsumer {
  private engine: SuggestionEngine

  constructor() {
    super({
      name: 'SuggestionEngine',
      groupId: 'suggestion-engine',
      topics: [
        CATALOG_TOPICS.PRODUCT_VIEWED,
        ORDER_TOPICS.ORDER_PLACED,
        ANALYTICS_TOPICS.EVENT_TRACKED,
      ],
    })
    this.engine = SuggestionEngine.getInstance()
  }

  protected async processEvent(
    topic: TopicName,
    event: BaseEvent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: { topic: string; partition: number; offset: string; timestamp: string; headers: Record<string, string | undefined> }
  ): Promise<void> {
    switch (topic) {
      case CATALOG_TOPICS.PRODUCT_VIEWED:
        await this.handleProductViewed(event as BaseEvent<ProductViewedPayload>)
        break
      case ORDER_TOPICS.ORDER_PLACED:
        await this.handleOrderPlaced(event as BaseEvent<OrderPlacedPayload>)
        break
      case ANALYTICS_TOPICS.EVENT_TRACKED:
        await this.handleEventTracked(event as BaseEvent<EventTrackedPayload>)
        break
    }
  }

  private async handleProductViewed(event: BaseEvent<ProductViewedPayload>): Promise<void> {
    const { productId, sessionId } = event.payload
    this.engine.recordView(sessionId, productId)
    console.log(`[Suggestion] Recorded view: ${productId} for session ${sessionId}`)
  }

  private async handleOrderPlaced(event: BaseEvent<OrderPlacedPayload>): Promise<void> {
    const { userId, items } = event.payload
    const productIds = items.map(item => item.productId)
    this.engine.recordPurchase(userId, productIds)
    console.log(`[Suggestion] Recorded purchase: ${productIds.length} products for user ${userId}`)
  }

  private async handleEventTracked(event: BaseEvent<EventTrackedPayload>): Promise<void> {
    const { eventName, sessionId, properties } = event.payload
    
    // Tracking additionnel pour affiner les suggestions
    if (eventName === 'product_added_to_cart' && properties.productId) {
      // Les ajouts au panier sont un signal fort d'intérêt
      this.engine.recordView(sessionId, properties.productId as string)
      this.engine.recordView(sessionId, properties.productId as string) // Double le score
    }
  }
}

// ============================================================================
// API HELPER
// ============================================================================

/**
 * Récupère des suggestions pour une API route
 */
export async function getSuggestionsForApi(
  sessionId: string,
  options: {
    userId?: string
    currentProductId?: string
    cartProductIds?: string[]
    limit?: number
  } = {}
): Promise<SuggestionResult> {
  const engine = SuggestionEngine.getInstance()
  
  return engine.getSuggestions({
    sessionId,
    userId: options.userId,
    currentProductId: options.currentProductId,
    cartProductIds: options.cartProductIds,
    limit: options.limit || 8,
  })
}

// Export singleton
export const suggestionEngine = SuggestionEngine.getInstance()
