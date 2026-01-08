/**
 * Base Event Producer - IT Vision
 * 
 * Producer générique pour émettre des événements vers Kafka.
 * Fournit des helpers typés pour chaque domaine.
 * 
 * @module lib/kafka/producer
 */

import { getProducer } from './client'
import { createEvent, BaseEvent, EventMetadata } from './types'
import type { TopicName } from './topics'

export interface ProducerOptions {
  /** ID de corrélation pour le tracing */
  correlationId?: string
  /** ID utilisateur à l'origine */
  userId?: string
  /** Source de l'événement */
  source?: string
  /** Contexte additionnel */
  context?: Record<string, unknown>
  /** Clé de partitionnement (par défaut: eventId) */
  key?: string
}

/**
 * Émet un événement vers un topic Kafka
 */
export async function emitEvent<T>(
  topic: TopicName,
  payload: T,
  options: ProducerOptions = {}
): Promise<void> {
  const producer = await getProducer()
  
  const event = createEvent(payload, {
    source: options.source || 'api',
    correlationId: options.correlationId,
    userId: options.userId,
    context: options.context,
  })
  
  const key = options.key || event.meta.eventId
  
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(event),
        headers: {
          'content-type': 'application/json',
          'event-id': event.meta.eventId,
          'event-source': event.meta.source,
          'event-version': event.meta.version,
          ...(event.meta.correlationId && { 'correlation-id': event.meta.correlationId }),
        },
      },
    ],
  })
  
  console.log(`[Kafka] Event emitted to ${topic}:`, event.meta.eventId)
}

/**
 * Émet plusieurs événements vers un topic
 */
export async function emitEvents<T>(
  topic: TopicName,
  payloads: T[],
  options: ProducerOptions = {}
): Promise<void> {
  const producer = await getProducer()
  
  const messages = payloads.map((payload) => {
    const event = createEvent(payload, {
      source: options.source || 'api',
      correlationId: options.correlationId,
      userId: options.userId,
      context: options.context,
    })
    
    return {
      key: options.key || event.meta.eventId,
      value: JSON.stringify(event),
      headers: {
        'content-type': 'application/json',
        'event-id': event.meta.eventId,
        'event-source': event.meta.source,
        'event-version': event.meta.version,
      },
    }
  })
  
  await producer.send({
    topic,
    messages,
  })
  
  console.log(`[Kafka] ${messages.length} events emitted to ${topic}`)
}

/**
 * Émet un événement avec retry automatique
 */
export async function emitEventWithRetry<T>(
  topic: TopicName,
  payload: T,
  options: ProducerOptions & { maxRetries?: number } = {}
): Promise<void> {
  const maxRetries = options.maxRetries ?? 3
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await emitEvent(topic, payload, options)
      return
    } catch (error) {
      lastError = error as Error
      console.warn(`[Kafka] Emit attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt < maxRetries) {
        // Backoff exponentiel: 100ms, 200ms, 400ms...
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)))
      }
    }
  }
  
  throw new Error(`Failed to emit event after ${maxRetries} attempts: ${lastError?.message}`)
}

// ============================================================================
// DOMAIN-SPECIFIC PRODUCERS
// ============================================================================

import {
  CATALOG_TOPICS,
  PRICING_TOPICS,
  ORDER_TOPICS,
  BILLING_TOPICS,
  INVENTORY_TOPICS,
  LOYALTY_TOPICS,
  GROUP_BUY_TOPICS,
  PAYMENT_TOPICS,
  SHIPPING_TOPICS,
  TECHNICIAN_TOPICS,
  NOTIFICATION_TOPICS,
  CUSTOMER_TOPICS,
  ANALYTICS_TOPICS,
  PROMOTION_TOPICS,
  REVIEW_TOPICS,
  FRAUD_TOPICS,
} from './topics'

import type {
  ProductCreatedPayload,
  ProductUpdatedPayload,
  ProductViewedPayload,
  PriceCalculatedPayload,
  PricingSettingsChangedPayload,
  CartUpdatedPayload,
  OrderPlacedPayload,
  OrderStatusChangedPayload,
  QuoteCreatedPayload,
  InvoiceGeneratedPayload,
  InvoicePaidPayload,
  StockUpdatedPayload,
  StockAlertPayload,
  PointsEarnedPayload,
  PointsRedeemedPayload,
  TierChangedPayload,
  GroupCreatedPayload,
  ParticipantJoinedPayload,
  ThresholdReachedPayload,
  GroupClosedPayload,
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
  ShipmentCreatedPayload,
  ShipmentStatusPayload,
  ShipmentDeliveredPayload,
  MissionCreatedPayload,
  BidPlacedPayload,
  MissionAssignedPayload,
  MissionCompletedPayload,
  NotificationPayload,
  CustomerRegisteredPayload,
  EventTrackedPayload,
  ConversionRecordedPayload,
  PromoActivatedPayload,
  PromoAppliedPayload,
  ReviewSubmittedPayload,
  RatingUpdatedPayload,
  TransactionScoredPayload,
  FraudAlertPayload,
} from './types'

// ----------------------------------------------------------------------------
// CATALOG PRODUCERS
// ----------------------------------------------------------------------------

export const CatalogProducer = {
  productCreated: (payload: ProductCreatedPayload, opts?: ProducerOptions) =>
    emitEvent(CATALOG_TOPICS.PRODUCT_CREATED, payload, { ...opts, key: payload.productId }),
  
  productUpdated: (payload: ProductUpdatedPayload, opts?: ProducerOptions) =>
    emitEvent(CATALOG_TOPICS.PRODUCT_UPDATED, payload, { ...opts, key: payload.productId }),
  
  productViewed: (payload: ProductViewedPayload, opts?: ProducerOptions) =>
    emitEvent(CATALOG_TOPICS.PRODUCT_VIEWED, payload, { ...opts, key: payload.productId }),
}

// ----------------------------------------------------------------------------
// PRICING PRODUCERS
// ----------------------------------------------------------------------------

export const PricingProducer = {
  priceCalculated: (payload: PriceCalculatedPayload, opts?: ProducerOptions) =>
    emitEvent(PRICING_TOPICS.PRICE_CALCULATED, payload, { ...opts, key: payload.productId }),
  
  settingsChanged: (payload: PricingSettingsChangedPayload, opts?: ProducerOptions) =>
    emitEvent(PRICING_TOPICS.SETTINGS_CHANGED, payload, opts),
}

// ----------------------------------------------------------------------------
// ORDER PRODUCERS
// ----------------------------------------------------------------------------

export const OrderProducer = {
  cartUpdated: (payload: CartUpdatedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.CART_UPDATED, payload, { ...opts, key: payload.cartId }),
  
  orderPlaced: (payload: OrderPlacedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.ORDER_PLACED, payload, { ...opts, key: payload.orderId }),
  
  orderConfirmed: (payload: OrderStatusChangedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.ORDER_CONFIRMED, payload, { ...opts, key: payload.orderId }),
  
  orderShipped: (payload: OrderStatusChangedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.ORDER_SHIPPED, payload, { ...opts, key: payload.orderId }),
  
  orderDelivered: (payload: OrderStatusChangedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.ORDER_DELIVERED, payload, { ...opts, key: payload.orderId }),
  
  orderCancelled: (payload: OrderStatusChangedPayload, opts?: ProducerOptions) =>
    emitEvent(ORDER_TOPICS.ORDER_CANCELLED, payload, { ...opts, key: payload.orderId }),
}

// ----------------------------------------------------------------------------
// BILLING PRODUCERS
// ----------------------------------------------------------------------------

export const BillingProducer = {
  quoteCreated: (payload: QuoteCreatedPayload, opts?: ProducerOptions) =>
    emitEvent(BILLING_TOPICS.QUOTE_CREATED, payload, { ...opts, key: payload.quoteId }),
  
  invoiceGenerated: (payload: InvoiceGeneratedPayload, opts?: ProducerOptions) =>
    emitEvent(BILLING_TOPICS.INVOICE_GENERATED, payload, { ...opts, key: payload.invoiceId }),
  
  invoicePaid: (payload: InvoicePaidPayload, opts?: ProducerOptions) =>
    emitEvent(BILLING_TOPICS.INVOICE_PAID, payload, { ...opts, key: payload.invoiceId }),
}

// ----------------------------------------------------------------------------
// INVENTORY PRODUCERS
// ----------------------------------------------------------------------------

export const InventoryProducer = {
  stockUpdated: (payload: StockUpdatedPayload, opts?: ProducerOptions) =>
    emitEvent(INVENTORY_TOPICS.STOCK_UPDATED, payload, { ...opts, key: payload.productId }),
  
  stockLow: (payload: StockAlertPayload, opts?: ProducerOptions) =>
    emitEvent(INVENTORY_TOPICS.STOCK_LOW, payload, { ...opts, key: payload.productId }),
  
  stockDepleted: (payload: StockAlertPayload, opts?: ProducerOptions) =>
    emitEvent(INVENTORY_TOPICS.STOCK_DEPLETED, payload, { ...opts, key: payload.productId }),
}

// ----------------------------------------------------------------------------
// LOYALTY PRODUCERS
// ----------------------------------------------------------------------------

export const LoyaltyProducer = {
  pointsEarned: (payload: PointsEarnedPayload, opts?: ProducerOptions) =>
    emitEvent(LOYALTY_TOPICS.POINTS_EARNED, payload, { ...opts, key: payload.customerId }),
  
  pointsRedeemed: (payload: PointsRedeemedPayload, opts?: ProducerOptions) =>
    emitEvent(LOYALTY_TOPICS.POINTS_REDEEMED, payload, { ...opts, key: payload.customerId }),
  
  tierChanged: (payload: TierChangedPayload, opts?: ProducerOptions) =>
    emitEvent(LOYALTY_TOPICS.TIER_UPGRADED, payload, { ...opts, key: payload.customerId }),
}

// ----------------------------------------------------------------------------
// GROUP BUY PRODUCERS
// ----------------------------------------------------------------------------

export const GroupBuyProducer = {
  groupCreated: (payload: GroupCreatedPayload, opts?: ProducerOptions) =>
    emitEvent(GROUP_BUY_TOPICS.GROUP_CREATED, payload, { ...opts, key: payload.groupId }),
  
  participantJoined: (payload: ParticipantJoinedPayload, opts?: ProducerOptions) =>
    emitEvent(GROUP_BUY_TOPICS.PARTICIPANT_JOINED, payload, { ...opts, key: payload.groupId }),
  
  thresholdReached: (payload: ThresholdReachedPayload, opts?: ProducerOptions) =>
    emitEvent(GROUP_BUY_TOPICS.THRESHOLD_REACHED, payload, { ...opts, key: payload.groupId }),
  
  groupClosed: (payload: GroupClosedPayload, opts?: ProducerOptions) =>
    emitEvent(GROUP_BUY_TOPICS.GROUP_CLOSED, payload, { ...opts, key: payload.groupId }),
}

// ----------------------------------------------------------------------------
// PAYMENT PRODUCERS
// ----------------------------------------------------------------------------

export const PaymentProducer = {
  paymentInitiated: (payload: PaymentInitiatedPayload, opts?: ProducerOptions) =>
    emitEvent(PAYMENT_TOPICS.PAYMENT_INITIATED, payload, { ...opts, key: payload.paymentId }),
  
  paymentCompleted: (payload: PaymentCompletedPayload, opts?: ProducerOptions) =>
    emitEvent(PAYMENT_TOPICS.PAYMENT_COMPLETED, payload, { ...opts, key: payload.paymentId }),
  
  paymentFailed: (payload: PaymentFailedPayload, opts?: ProducerOptions) =>
    emitEvent(PAYMENT_TOPICS.PAYMENT_FAILED, payload, { ...opts, key: payload.paymentId }),
}

// ----------------------------------------------------------------------------
// SHIPPING PRODUCERS
// ----------------------------------------------------------------------------

export const ShippingProducer = {
  shipmentCreated: (payload: ShipmentCreatedPayload, opts?: ProducerOptions) =>
    emitEvent(SHIPPING_TOPICS.SHIPMENT_CREATED, payload, { ...opts, key: payload.shipmentId }),
  
  shipmentStatus: (payload: ShipmentStatusPayload, opts?: ProducerOptions) =>
    emitEvent(SHIPPING_TOPICS.SHIPMENT_IN_TRANSIT, payload, { ...opts, key: payload.shipmentId }),
  
  shipmentDelivered: (payload: ShipmentDeliveredPayload, opts?: ProducerOptions) =>
    emitEvent(SHIPPING_TOPICS.SHIPMENT_DELIVERED, payload, { ...opts, key: payload.shipmentId }),
}

// ----------------------------------------------------------------------------
// TECHNICIAN PRODUCERS
// ----------------------------------------------------------------------------

export const TechnicianProducer = {
  missionCreated: (payload: MissionCreatedPayload, opts?: ProducerOptions) =>
    emitEvent(TECHNICIAN_TOPICS.MISSION_CREATED, payload, { ...opts, key: payload.missionId }),
  
  bidPlaced: (payload: BidPlacedPayload, opts?: ProducerOptions) =>
    emitEvent(TECHNICIAN_TOPICS.BID_PLACED, payload, { ...opts, key: payload.missionId }),
  
  missionAssigned: (payload: MissionAssignedPayload, opts?: ProducerOptions) =>
    emitEvent(TECHNICIAN_TOPICS.MISSION_ASSIGNED, payload, { ...opts, key: payload.missionId }),
  
  missionCompleted: (payload: MissionCompletedPayload, opts?: ProducerOptions) =>
    emitEvent(TECHNICIAN_TOPICS.MISSION_COMPLETED, payload, { ...opts, key: payload.missionId }),
}

// ----------------------------------------------------------------------------
// NOTIFICATION PRODUCERS
// ----------------------------------------------------------------------------

export const NotificationProducer = {
  queueEmail: (payload: NotificationPayload, opts?: ProducerOptions) =>
    emitEvent(NOTIFICATION_TOPICS.EMAIL_QUEUED, payload, { ...opts, key: payload.recipientId }),
  
  queueSms: (payload: NotificationPayload, opts?: ProducerOptions) =>
    emitEvent(NOTIFICATION_TOPICS.SMS_QUEUED, payload, { ...opts, key: payload.recipientId }),
  
  queuePush: (payload: NotificationPayload, opts?: ProducerOptions) =>
    emitEvent(NOTIFICATION_TOPICS.PUSH_QUEUED, payload, { ...opts, key: payload.recipientId }),
  
  queueWhatsapp: (payload: NotificationPayload, opts?: ProducerOptions) =>
    emitEvent(NOTIFICATION_TOPICS.WHATSAPP_QUEUED, payload, { ...opts, key: payload.recipientId }),
}

// ----------------------------------------------------------------------------
// CUSTOMER PRODUCERS
// ----------------------------------------------------------------------------

export const CustomerProducer = {
  customerRegistered: (payload: CustomerRegisteredPayload, opts?: ProducerOptions) =>
    emitEvent(CUSTOMER_TOPICS.CUSTOMER_REGISTERED, payload, { ...opts, key: payload.customerId }),
}

// ----------------------------------------------------------------------------
// ANALYTICS PRODUCERS
// ----------------------------------------------------------------------------

export const AnalyticsProducer = {
  trackEvent: (payload: EventTrackedPayload, opts?: ProducerOptions) =>
    emitEvent(ANALYTICS_TOPICS.EVENT_TRACKED, payload, { ...opts, key: payload.sessionId }),
  
  recordConversion: (payload: ConversionRecordedPayload, opts?: ProducerOptions) =>
    emitEvent(ANALYTICS_TOPICS.CONVERSION_RECORDED, payload, { ...opts, key: payload.sessionId }),
}

// ----------------------------------------------------------------------------
// PROMOTION PRODUCERS
// ----------------------------------------------------------------------------

export const PromotionProducer = {
  promoActivated: (payload: PromoActivatedPayload, opts?: ProducerOptions) =>
    emitEvent(PROMOTION_TOPICS.PROMO_ACTIVATED, payload, { ...opts, key: payload.promoId }),
  
  promoApplied: (payload: PromoAppliedPayload, opts?: ProducerOptions) =>
    emitEvent(PROMOTION_TOPICS.PROMO_APPLIED, payload, { ...opts, key: payload.promoId }),
}

// ----------------------------------------------------------------------------
// REVIEW PRODUCERS
// ----------------------------------------------------------------------------

export const ReviewProducer = {
  reviewSubmitted: (payload: ReviewSubmittedPayload, opts?: ProducerOptions) =>
    emitEvent(REVIEW_TOPICS.REVIEW_SUBMITTED, payload, { ...opts, key: payload.productId }),
  
  ratingUpdated: (payload: RatingUpdatedPayload, opts?: ProducerOptions) =>
    emitEvent(REVIEW_TOPICS.RATING_UPDATED, payload, { ...opts, key: payload.productId }),
}

// ----------------------------------------------------------------------------
// FRAUD PRODUCERS
// ----------------------------------------------------------------------------

export const FraudProducer = {
  transactionScored: (payload: TransactionScoredPayload, opts?: ProducerOptions) =>
    emitEvent(FRAUD_TOPICS.TRANSACTION_SCORED, payload, { ...opts, key: payload.transactionId }),
  
  alertRaised: (payload: FraudAlertPayload, opts?: ProducerOptions) =>
    emitEvent(FRAUD_TOPICS.ALERT_RAISED, payload, { ...opts, key: payload.alertId }),
}
