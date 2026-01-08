/**
 * Base Consumer - IT Vision
 * 
 * Fournit une classe de base pour créer des consumers Kafka typés.
 * Gère automatiquement la connexion, les erreurs et le graceful shutdown.
 * 
 * @module lib/kafka/consumer
 */

import { Consumer, EachMessagePayload } from 'kafkajs'
import { createConsumer } from './client'
import { BaseEvent, isBaseEvent } from './types'
import type { TopicName } from './topics'

export interface ConsumerConfig {
  /** Nom unique du consumer (pour les logs) */
  name: string
  /** Group ID pour la consommation partagée */
  groupId: string
  /** Topics à consommer */
  topics: TopicName[]
  /** Commencer depuis le début si pas d'offset */
  fromBeginning?: boolean
  /** Activer l'auto-commit (défaut: true) */
  autoCommit?: boolean
  /** Handler d'erreur personnalisé */
  onError?: (error: Error, payload?: EachMessagePayload) => void
}

export type MessageHandler<T = unknown> = (
  event: BaseEvent<T>,
  metadata: {
    topic: string
    partition: number
    offset: string
    timestamp: string
    headers: Record<string, string | undefined>
  }
) => Promise<void>

/**
 * Classe de base pour les consumers Kafka
 */
export abstract class BaseConsumer {
  protected consumer: Consumer | null = null
  protected config: ConsumerConfig
  protected running = false
  protected handlers: Map<string, MessageHandler[]> = new Map()

  constructor(config: ConsumerConfig) {
    this.config = config
  }

  /**
   * Enregistre un handler pour un topic spécifique
   */
  on<T>(topic: TopicName, handler: MessageHandler<T>): this {
    const handlers = this.handlers.get(topic) || []
    handlers.push(handler as MessageHandler)
    this.handlers.set(topic, handlers)
    return this
  }

  /**
   * Démarre le consumer
   */
  async start(): Promise<void> {
    if (this.running) {
      console.warn(`[${this.config.name}] Consumer already running`)
      return
    }

    this.consumer = await createConsumer(this.config.groupId)
    
    await this.consumer.subscribe({
      topics: this.config.topics,
      fromBeginning: this.config.fromBeginning ?? false,
    })

    await this.consumer.run({
      autoCommit: this.config.autoCommit ?? true,
      eachMessage: async (payload) => {
        await this.handleMessage(payload)
      },
    })

    this.running = true
    console.log(`[${this.config.name}] Consumer started, listening to: ${this.config.topics.join(', ')}`)
  }

  /**
   * Arrête le consumer proprement
   */
  async stop(): Promise<void> {
    if (!this.running || !this.consumer) {
      return
    }

    console.log(`[${this.config.name}] Stopping consumer...`)
    await this.consumer.stop()
    await this.consumer.disconnect()
    this.consumer = null
    this.running = false
    console.log(`[${this.config.name}] Consumer stopped`)
  }

  /**
   * Traite un message reçu
   */
  protected async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload
    
    try {
      if (!message.value) {
        console.warn(`[${this.config.name}] Empty message received on ${topic}`)
        return
      }

      const value = message.value.toString()
      const event = JSON.parse(value)

      if (!isBaseEvent(event)) {
        console.warn(`[${this.config.name}] Invalid event format on ${topic}`)
        return
      }

      const handlers = this.handlers.get(topic) || []
      const metadata = {
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        headers: this.parseHeaders(message.headers as Record<string, Buffer | string | undefined> | undefined),
      }

      // Exécute tous les handlers enregistrés pour ce topic
      for (const handler of handlers) {
        await handler(event, metadata)
      }

      // Appelle le handler abstrait pour les sous-classes
      await this.processEvent(topic as TopicName, event, metadata)
      
    } catch (error) {
      console.error(`[${this.config.name}] Error processing message:`, error)
      
      if (this.config.onError) {
        this.config.onError(error as Error, payload)
      }
    }
  }

  /**
   * Parse les headers du message
   */
  private parseHeaders(headers?: Record<string, Buffer | string | undefined>): Record<string, string | undefined> {
    if (!headers) return {}
    
    const parsed: Record<string, string | undefined> = {}
    for (const [key, value] of Object.entries(headers)) {
      if (value instanceof Buffer) {
        parsed[key] = value.toString()
      } else if (typeof value === 'string') {
        parsed[key] = value
      } else {
        parsed[key] = undefined
      }
    }
    return parsed
  }

  /**
   * Méthode abstraite à implémenter dans les sous-classes
   * pour traiter les événements spécifiques au domaine
   */
  protected abstract processEvent(
    topic: TopicName,
    event: BaseEvent,
    metadata: {
      topic: string
      partition: number
      offset: string
      timestamp: string
      headers: Record<string, string | undefined>
    }
  ): Promise<void>
}

// ============================================================================
// EXEMPLE D'IMPLÉMENTATION - LOYALTY CONSUMER
// ============================================================================

import { ORDER_TOPICS, REVIEW_TOPICS, CUSTOMER_TOPICS } from './topics'
import type { OrderPlacedPayload, ReviewSubmittedPayload, CustomerRegisteredPayload } from './types'
import { LoyaltyProducer } from './producer'

/**
 * Consumer du moteur de fidélité
 * 
 * Écoute les événements:
 * - order.order.placed → attribue des points
 * - review.review.submitted → attribue des points bonus
 * - customer.customer.registered → attribue des points de bienvenue
 */
export class LoyaltyConsumer extends BaseConsumer {
  constructor() {
    super({
      name: 'LoyaltyEngine',
      groupId: 'loyalty-engine',
      topics: [
        ORDER_TOPICS.ORDER_PLACED,
        REVIEW_TOPICS.REVIEW_SUBMITTED,
        CUSTOMER_TOPICS.CUSTOMER_REGISTERED,
      ],
    })
  }

  protected async processEvent(
    topic: TopicName,
    event: BaseEvent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: { topic: string; partition: number; offset: string; timestamp: string; headers: Record<string, string | undefined> }
  ): Promise<void> {
    switch (topic) {
      case ORDER_TOPICS.ORDER_PLACED:
        await this.handleOrderPlaced(event as BaseEvent<OrderPlacedPayload>)
        break
      case REVIEW_TOPICS.REVIEW_SUBMITTED:
        await this.handleReviewSubmitted(event as BaseEvent<ReviewSubmittedPayload>)
        break
      case CUSTOMER_TOPICS.CUSTOMER_REGISTERED:
        await this.handleCustomerRegistered(event as BaseEvent<CustomerRegisteredPayload>)
        break
    }
  }

  /**
   * Attribue des points basés sur le montant de la commande
   * Règle: 1 point par tranche de 1000 FCFA
   */
  private async handleOrderPlaced(event: BaseEvent<OrderPlacedPayload>): Promise<void> {
    const { userId, orderId, total } = event.payload
    const points = Math.floor(total / 1000)
    
    if (points > 0) {
      // Ici, on mettrait à jour la base de données des points
      // puis on émettrait un événement de points gagnés
      const currentBalance = await this.getCustomerPoints(userId)
      
      await LoyaltyProducer.pointsEarned({
        customerId: userId,
        points,
        reason: 'purchase',
        reference: orderId,
        newBalance: currentBalance + points,
      }, {
        correlationId: event.meta.correlationId,
        userId,
      })
      
      console.log(`[Loyalty] ${points} points attribués au client ${userId} pour commande ${orderId}`)
    }
  }

  /**
   * Attribue des points bonus pour un avis
   * Règle: 50 points pour un avis vérifié, 25 sinon
   */
  private async handleReviewSubmitted(event: BaseEvent<ReviewSubmittedPayload>): Promise<void> {
    const { customerId, reviewId, verified } = event.payload
    const points = verified ? 50 : 25
    
    const currentBalance = await this.getCustomerPoints(customerId)
    
    await LoyaltyProducer.pointsEarned({
      customerId,
      points,
      reason: 'review',
      reference: reviewId,
      newBalance: currentBalance + points,
    }, {
      correlationId: event.meta.correlationId,
      userId: customerId,
    })
    
    console.log(`[Loyalty] ${points} points bonus pour avis ${reviewId}`)
  }

  /**
   * Attribue des points de bienvenue à un nouveau client
   * Règle: 100 points de bienvenue
   */
  private async handleCustomerRegistered(event: BaseEvent<CustomerRegisteredPayload>): Promise<void> {
    const { customerId, referredBy } = event.payload
    const points = 100
    const bonusPoints = referredBy ? 50 : 0 // Bonus parrainage
    
    await LoyaltyProducer.pointsEarned({
      customerId,
      points: points + bonusPoints,
      reason: 'signup',
      newBalance: points + bonusPoints,
    }, {
      correlationId: event.meta.correlationId,
      userId: customerId,
    })
    
    console.log(`[Loyalty] ${points + bonusPoints} points de bienvenue pour ${customerId}`)
    
    // Si parrainage, attribuer aussi des points au parrain
    if (referredBy) {
      const referrerBalance = await this.getCustomerPoints(referredBy)
      
      await LoyaltyProducer.pointsEarned({
        customerId: referredBy,
        points: 100,
        reason: 'referral',
        reference: customerId,
        newBalance: referrerBalance + 100,
      })
      
      console.log(`[Loyalty] 100 points de parrainage pour ${referredBy}`)
    }
  }

  /**
   * Récupère le solde de points d'un client
   * TODO: implémenter avec MongoDB
   */
  private async getCustomerPoints(customerId: string): Promise<number> {
    // À implémenter: requête MongoDB pour récupérer le solde
    console.log(`[Loyalty] Getting points for customer ${customerId}`)
    return 0 // Placeholder
  }
}

// ============================================================================
// FACTORY POUR CRÉER DES CONSUMERS SIMPLES
// ============================================================================

/**
 * Crée un consumer simple avec un seul handler
 */
export function createSimpleConsumer<T>(
  name: string,
  groupId: string,
  topic: TopicName,
  handler: MessageHandler<T>
): BaseConsumer {
  class SimpleConsumer extends BaseConsumer {
    constructor() {
      super({
        name,
        groupId,
        topics: [topic],
      })
      this.on(topic, handler)
    }

    protected async processEvent(): Promise<void> {
      // Les handlers sont déjà appelés via this.on()
    }
  }

  return new SimpleConsumer()
}

/**
 * Crée un consumer multi-topics
 */
export function createMultiTopicConsumer(
  name: string,
  groupId: string,
  topicHandlers: Map<TopicName, MessageHandler>
): BaseConsumer {
  class MultiConsumer extends BaseConsumer {
    constructor() {
      super({
        name,
        groupId,
        topics: Array.from(topicHandlers.keys()),
      })
      
      for (const [topic, handler] of topicHandlers) {
        this.on(topic, handler)
      }
    }

    protected async processEvent(): Promise<void> {
      // Les handlers sont déjà appelés via this.on()
    }
  }

  return new MultiConsumer()
}
