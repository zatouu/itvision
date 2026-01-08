/**
 * Kafka Module Index - IT Vision
 * 
 * Point d'entrée centralisé pour l'infrastructure Kafka.
 * 
 * @module lib/kafka
 */

// Client et connexion
export { getKafkaClient, getProducer, createConsumer, getAdmin, disconnectAll } from './client'

// Topics
export {
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
  ALL_TOPICS,
  TOPICS_BY_DOMAIN,
} from './topics'

export type { TopicName } from './topics'

// Types d'événements
export {
  createEvent,
  isBaseEvent,
} from './types'

export type {
  EventMetadata,
  BaseEvent,
  // Catalog
  ProductCreatedPayload,
  ProductUpdatedPayload,
  ProductDeletedPayload,
  ProductViewedPayload,
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductViewedEvent,
  // Pricing
  PriceCalculatedPayload,
  MarginUpdatedPayload,
  PricingSettingsChangedPayload,
  PriceCalculatedEvent,
  MarginUpdatedEvent,
  PricingSettingsChangedEvent,
  // Order
  CartItem,
  CartUpdatedPayload,
  OrderPlacedPayload,
  OrderStatusChangedPayload,
  CartUpdatedEvent,
  OrderPlacedEvent,
  OrderStatusChangedEvent,
  // Billing
  QuoteCreatedPayload,
  InvoiceGeneratedPayload,
  InvoicePaidPayload,
  QuoteCreatedEvent,
  InvoiceGeneratedEvent,
  InvoicePaidEvent,
  // Inventory
  StockUpdatedPayload,
  StockAlertPayload,
  ReorderSuggestedPayload,
  StockUpdatedEvent,
  StockAlertEvent,
  ReorderSuggestedEvent,
  // Loyalty
  PointsEarnedPayload,
  PointsRedeemedPayload,
  TierChangedPayload,
  RewardUnlockedPayload,
  PointsEarnedEvent,
  PointsRedeemedEvent,
  TierChangedEvent,
  RewardUnlockedEvent,
  // Group Buy
  GroupCreatedPayload,
  ParticipantJoinedPayload,
  ThresholdReachedPayload,
  GroupClosedPayload,
  GroupCreatedEvent,
  ParticipantJoinedEvent,
  ThresholdReachedEvent,
  GroupClosedEvent,
  // Payment
  PaymentInitiatedPayload,
  PaymentCompletedPayload,
  PaymentFailedPayload,
  PaymentInitiatedEvent,
  PaymentCompletedEvent,
  PaymentFailedEvent,
  // Shipping
  ShipmentCreatedPayload,
  ShipmentStatusPayload,
  ShipmentDeliveredPayload,
  ShipmentCreatedEvent,
  ShipmentStatusEvent,
  ShipmentDeliveredEvent,
  // Technician
  MissionCreatedPayload,
  BidPlacedPayload,
  MissionAssignedPayload,
  MissionCompletedPayload,
  MissionCreatedEvent,
  BidPlacedEvent,
  MissionAssignedEvent,
  MissionCompletedEvent,
  // Notification
  NotificationPayload,
  NotificationResultPayload,
  NotificationQueuedEvent,
  NotificationResultEvent,
  // Customer
  CustomerRegisteredPayload,
  CustomerUpdatedPayload,
  SegmentAssignedPayload,
  CustomerRegisteredEvent,
  CustomerUpdatedEvent,
  SegmentAssignedEvent,
  // Analytics
  EventTrackedPayload,
  ConversionRecordedPayload,
  EventTrackedEvent,
  ConversionRecordedEvent,
  // Promotion
  PromoActivatedPayload,
  PromoAppliedPayload,
  CouponRedeemedPayload,
  PromoActivatedEvent,
  PromoAppliedEvent,
  CouponRedeemedEvent,
  // Review
  ReviewSubmittedPayload,
  ReviewModerationPayload,
  RatingUpdatedPayload,
  ReviewSubmittedEvent,
  ReviewModerationEvent,
  RatingUpdatedEvent,
  // Fraud
  TransactionScoredPayload,
  FraudAlertPayload,
  TransactionScoredEvent,
  FraudAlertEvent,
} from './types'

// Producers par domaine
export {
  emitEvent,
  emitEvents,
  emitEventWithRetry,
  CatalogProducer,
  PricingProducer,
  OrderProducer,
  BillingProducer,
  InventoryProducer,
  LoyaltyProducer,
  GroupBuyProducer,
  PaymentProducer,
  ShippingProducer,
  TechnicianProducer,
  NotificationProducer,
  CustomerProducer,
  AnalyticsProducer,
  PromotionProducer,
  ReviewProducer,
  FraudProducer,
} from './producer'

export type { ProducerOptions } from './producer'

// Consumer base
export {
  BaseConsumer,
  LoyaltyConsumer,
  createSimpleConsumer,
  createMultiTopicConsumer,
} from './consumer'

export type { ConsumerConfig, MessageHandler } from './consumer'
