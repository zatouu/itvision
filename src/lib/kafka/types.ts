/**
 * Kafka Event Types - IT Vision
 * 
 * Définitions TypeScript pour tous les événements Kafka.
 * Ces types garantissent la cohérence entre producers et consumers.
 * 
 * @module lib/kafka/types
 */

// ============================================================================
// BASE TYPES
// ============================================================================

/**
 * Métadonnées communes à tous les événements
 */
export interface EventMetadata {
  /** Identifiant unique de l'événement (UUID v4) */
  eventId: string
  /** Timestamp de création (ISO 8601) */
  timestamp: string
  /** Version du schéma de l'événement */
  version: string
  /** Source de l'événement (ex: 'api', 'cron', 'admin') */
  source: string
  /** ID de corrélation pour le tracing */
  correlationId?: string
  /** ID utilisateur à l'origine de l'événement */
  userId?: string
  /** Contexte additionnel */
  context?: Record<string, unknown>
}

/**
 * Structure de base de tous les événements Kafka
 */
export interface BaseEvent<T = unknown> {
  meta: EventMetadata
  payload: T
}

// ============================================================================
// CATALOG EVENTS
// ============================================================================

export interface ProductCreatedPayload {
  productId: string
  name: string
  sourceUrl?: string
  baseCost: number
  currency: string
  categoryId?: string
  variants: Array<{
    variantId: string
    sku?: string
    price: number
    attributes: Record<string, string>
  }>
}

export interface ProductUpdatedPayload {
  productId: string
  changes: Partial<{
    name: string
    description: string
    baseCost: number
    status: string
    categoryId: string
    images: string[]
    variants: unknown[]
  }>
  previousValues: Record<string, unknown>
}

export interface ProductDeletedPayload {
  productId: string
  deletedAt: string
  reason?: string
}

export interface ProductViewedPayload {
  productId: string
  userId?: string
  sessionId: string
  referrer?: string
  duration?: number
}

export type ProductCreatedEvent = BaseEvent<ProductCreatedPayload>
export type ProductUpdatedEvent = BaseEvent<ProductUpdatedPayload>
export type ProductDeletedEvent = BaseEvent<ProductDeletedPayload>
export type ProductViewedEvent = BaseEvent<ProductViewedPayload>

// ============================================================================
// PRICING EVENTS
// ============================================================================

export interface PriceCalculatedPayload {
  productId: string
  variantId?: string
  baseCost: number
  marginRate: number
  marginAmount: number
  serviceFeeRate: number
  serviceFeeAmount: number
  insuranceRate: number
  insuranceAmount: number
  shippingCost: number
  totalPrice: number
  currency: string
}

export interface MarginUpdatedPayload {
  productId: string
  previousMargin: number
  newMargin: number
  reason?: string
}

export interface PricingSettingsChangedPayload {
  changedBy: string
  changes: Partial<{
    defaultMarginRate: number
    serviceFeeRate: number
    insuranceRate: number
    exchangeRate: number
  }>
  previousValues: Record<string, number>
}

export type PriceCalculatedEvent = BaseEvent<PriceCalculatedPayload>
export type MarginUpdatedEvent = BaseEvent<MarginUpdatedPayload>
export type PricingSettingsChangedEvent = BaseEvent<PricingSettingsChangedPayload>

// ============================================================================
// ORDER EVENTS
// ============================================================================

export interface CartItem {
  productId: string
  variantId?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface CartUpdatedPayload {
  cartId: string
  userId?: string
  sessionId: string
  action: 'item_added' | 'item_removed' | 'quantity_changed' | 'cart_cleared'
  items: CartItem[]
  subtotal: number
  itemCount: number
}

export interface OrderPlacedPayload {
  orderId: string
  userId: string
  items: Array<CartItem & { name: string }>
  shippingAddress: {
    fullName: string
    phone: string
    address: string
    city: string
    country: string
  }
  shippingMethod: string
  shippingCost: number
  subtotal: number
  taxes: number
  discount: number
  total: number
  paymentMethod?: string
  notes?: string
}

export interface OrderStatusChangedPayload {
  orderId: string
  previousStatus: string
  newStatus: string
  changedBy: string
  reason?: string
  metadata?: Record<string, unknown>
}

export type CartUpdatedEvent = BaseEvent<CartUpdatedPayload>
export type OrderPlacedEvent = BaseEvent<OrderPlacedPayload>
export type OrderStatusChangedEvent = BaseEvent<OrderStatusChangedPayload>

// ============================================================================
// BILLING EVENTS
// ============================================================================

export interface QuoteCreatedPayload {
  quoteId: string
  customerId: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  taxes: number
  total: number
  validUntil: string
  terms?: string
}

export interface InvoiceGeneratedPayload {
  invoiceId: string
  quoteId?: string
  orderId?: string
  customerId: string
  invoiceNumber: string
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  subtotal: number
  taxes: number
  total: number
  dueDate: string
  pdfUrl?: string
}

export interface InvoicePaidPayload {
  invoiceId: string
  paymentId: string
  amountPaid: number
  paidAt: string
  paymentMethod: string
}

export type QuoteCreatedEvent = BaseEvent<QuoteCreatedPayload>
export type InvoiceGeneratedEvent = BaseEvent<InvoiceGeneratedPayload>
export type InvoicePaidEvent = BaseEvent<InvoicePaidPayload>

// ============================================================================
// INVENTORY EVENTS
// ============================================================================

export interface StockUpdatedPayload {
  productId: string
  variantId?: string
  warehouseId?: string
  previousQuantity: number
  newQuantity: number
  reason: 'sale' | 'restock' | 'adjustment' | 'return' | 'damaged' | 'transfer'
  reference?: string
}

export interface StockAlertPayload {
  productId: string
  variantId?: string
  currentQuantity: number
  threshold: number
  alertType: 'low' | 'depleted' | 'replenished'
}

export interface ReorderSuggestedPayload {
  productId: string
  currentStock: number
  suggestedQuantity: number
  averageSales: number
  leadTime: number
  suggestedSupplier?: string
}

export type StockUpdatedEvent = BaseEvent<StockUpdatedPayload>
export type StockAlertEvent = BaseEvent<StockAlertPayload>
export type ReorderSuggestedEvent = BaseEvent<ReorderSuggestedPayload>

// ============================================================================
// LOYALTY EVENTS
// ============================================================================

export interface PointsEarnedPayload {
  customerId: string
  points: number
  reason: 'purchase' | 'referral' | 'review' | 'bonus' | 'birthday' | 'signup'
  reference?: string
  newBalance: number
}

export interface PointsRedeemedPayload {
  customerId: string
  points: number
  rewardId?: string
  rewardName?: string
  newBalance: number
  monetaryValue?: number
}

export interface TierChangedPayload {
  customerId: string
  previousTier: string
  newTier: string
  reason: 'upgrade' | 'downgrade' | 'manual'
  benefits: string[]
}

export interface RewardUnlockedPayload {
  customerId: string
  rewardId: string
  rewardName: string
  pointsCost: number
  expiresAt?: string
}

export type PointsEarnedEvent = BaseEvent<PointsEarnedPayload>
export type PointsRedeemedEvent = BaseEvent<PointsRedeemedPayload>
export type TierChangedEvent = BaseEvent<TierChangedPayload>
export type RewardUnlockedEvent = BaseEvent<RewardUnlockedPayload>

// ============================================================================
// GROUP BUY EVENTS
// ============================================================================

export interface GroupCreatedPayload {
  groupId: string
  productId: string
  creatorId: string
  targetQuantity: number
  minQuantity: number
  discountPercent: number
  unitPrice: number
  groupPrice: number
  expiresAt: string
}

export interface ParticipantJoinedPayload {
  groupId: string
  participantId: string
  quantity: number
  currentTotal: number
  targetQuantity: number
  progressPercent: number
}

export interface ThresholdReachedPayload {
  groupId: string
  productId: string
  participantCount: number
  totalQuantity: number
  groupPrice: number
  savings: number
}

export interface GroupClosedPayload {
  groupId: string
  success: boolean
  finalQuantity: number
  participantCount: number
  totalAmount: number
  ordersGenerated?: string[]
}

export type GroupCreatedEvent = BaseEvent<GroupCreatedPayload>
export type ParticipantJoinedEvent = BaseEvent<ParticipantJoinedPayload>
export type ThresholdReachedEvent = BaseEvent<ThresholdReachedPayload>
export type GroupClosedEvent = BaseEvent<GroupClosedPayload>

// ============================================================================
// PAYMENT EVENTS
// ============================================================================

export interface PaymentInitiatedPayload {
  paymentId: string
  orderId: string
  customerId: string
  amount: number
  currency: string
  provider: string
  method: 'mobile_money' | 'card' | 'bank_transfer' | 'cash'
  metadata?: Record<string, unknown>
}

export interface PaymentCompletedPayload {
  paymentId: string
  orderId: string
  transactionId: string
  amount: number
  fees: number
  netAmount: number
  completedAt: string
}

export interface PaymentFailedPayload {
  paymentId: string
  orderId: string
  errorCode: string
  errorMessage: string
  retryable: boolean
}

export type PaymentInitiatedEvent = BaseEvent<PaymentInitiatedPayload>
export type PaymentCompletedEvent = BaseEvent<PaymentCompletedPayload>
export type PaymentFailedEvent = BaseEvent<PaymentFailedPayload>

// ============================================================================
// SHIPPING EVENTS
// ============================================================================

export interface ShipmentCreatedPayload {
  shipmentId: string
  orderId: string
  carrier: string
  trackingNumber?: string
  origin: {
    warehouse: string
    country: string
  }
  destination: {
    fullName: string
    address: string
    city: string
    country: string
    phone: string
  }
  estimatedDelivery?: string
  items: Array<{
    productId: string
    quantity: number
    weight?: number
  }>
}

export interface ShipmentStatusPayload {
  shipmentId: string
  orderId: string
  status: string
  location?: string
  timestamp: string
  description?: string
}

export interface ShipmentDeliveredPayload {
  shipmentId: string
  orderId: string
  deliveredAt: string
  signedBy?: string
  photoProof?: string
}

export type ShipmentCreatedEvent = BaseEvent<ShipmentCreatedPayload>
export type ShipmentStatusEvent = BaseEvent<ShipmentStatusPayload>
export type ShipmentDeliveredEvent = BaseEvent<ShipmentDeliveredPayload>

// ============================================================================
// TECHNICIAN EVENTS
// ============================================================================

export interface MissionCreatedPayload {
  missionId: string
  type: 'installation' | 'repair' | 'maintenance' | 'consultation'
  productId?: string
  customerId: string
  address: string
  city: string
  description: string
  scheduledDate?: string
  budget?: {
    min: number
    max: number
  }
}

export interface BidPlacedPayload {
  bidId: string
  missionId: string
  technicianId: string
  amount: number
  estimatedDuration: string
  message?: string
  availableDate: string
}

export interface MissionAssignedPayload {
  missionId: string
  technicianId: string
  bidId: string
  agreedAmount: number
  scheduledDate: string
  customerConfirmed: boolean
}

export interface MissionCompletedPayload {
  missionId: string
  technicianId: string
  completedAt: string
  duration: string
  rating?: number
  feedback?: string
  photos?: string[]
}

export type MissionCreatedEvent = BaseEvent<MissionCreatedPayload>
export type BidPlacedEvent = BaseEvent<BidPlacedPayload>
export type MissionAssignedEvent = BaseEvent<MissionAssignedPayload>
export type MissionCompletedEvent = BaseEvent<MissionCompletedPayload>

// ============================================================================
// NOTIFICATION EVENTS
// ============================================================================

export interface NotificationPayload {
  notificationId: string
  recipientId: string
  channel: 'email' | 'sms' | 'push' | 'whatsapp'
  template: string
  variables: Record<string, string | number>
  priority: 'low' | 'normal' | 'high' | 'critical'
  scheduledAt?: string
}

export interface NotificationResultPayload {
  notificationId: string
  channel: string
  success: boolean
  sentAt?: string
  error?: string
  externalId?: string
}

export type NotificationQueuedEvent = BaseEvent<NotificationPayload>
export type NotificationResultEvent = BaseEvent<NotificationResultPayload>

// ============================================================================
// CUSTOMER EVENTS
// ============================================================================

export interface CustomerRegisteredPayload {
  customerId: string
  email: string
  phone?: string
  name: string
  source: string
  referredBy?: string
}

export interface CustomerUpdatedPayload {
  customerId: string
  changes: Record<string, unknown>
  previousValues: Record<string, unknown>
}

export interface SegmentAssignedPayload {
  customerId: string
  segmentId: string
  segmentName: string
  criteria: Record<string, unknown>
}

export type CustomerRegisteredEvent = BaseEvent<CustomerRegisteredPayload>
export type CustomerUpdatedEvent = BaseEvent<CustomerUpdatedPayload>
export type SegmentAssignedEvent = BaseEvent<SegmentAssignedPayload>

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export interface EventTrackedPayload {
  eventName: string
  userId?: string
  sessionId: string
  properties: Record<string, unknown>
  pageUrl?: string
  userAgent?: string
  ip?: string
}

export interface ConversionRecordedPayload {
  conversionType: 'purchase' | 'signup' | 'subscription' | 'lead'
  userId?: string
  sessionId: string
  value: number
  currency: string
  attribution?: {
    source: string
    medium: string
    campaign?: string
  }
}

export type EventTrackedEvent = BaseEvent<EventTrackedPayload>
export type ConversionRecordedEvent = BaseEvent<ConversionRecordedPayload>

// ============================================================================
// PROMOTION EVENTS
// ============================================================================

export interface PromoActivatedPayload {
  promoId: string
  code?: string
  type: 'percentage' | 'fixed' | 'bogo' | 'free_shipping'
  value: number
  minPurchase?: number
  maxUsage?: number
  startDate: string
  endDate: string
  applicableTo: 'all' | 'category' | 'product' | 'customer_segment'
  targetIds?: string[]
}

export interface PromoAppliedPayload {
  promoId: string
  orderId: string
  customerId: string
  discount: number
  originalTotal: number
  finalTotal: number
}

export interface CouponRedeemedPayload {
  couponId: string
  couponCode: string
  customerId: string
  orderId: string
  discount: number
}

export type PromoActivatedEvent = BaseEvent<PromoActivatedPayload>
export type PromoAppliedEvent = BaseEvent<PromoAppliedPayload>
export type CouponRedeemedEvent = BaseEvent<CouponRedeemedPayload>

// ============================================================================
// REVIEW EVENTS
// ============================================================================

export interface ReviewSubmittedPayload {
  reviewId: string
  productId: string
  customerId: string
  orderId?: string
  rating: number
  title?: string
  content?: string
  photos?: string[]
  verified: boolean
}

export interface ReviewModerationPayload {
  reviewId: string
  action: 'approved' | 'rejected' | 'flagged'
  moderatorId?: string
  reason?: string
}

export interface RatingUpdatedPayload {
  productId: string
  newRating: number
  totalReviews: number
  ratingDistribution: Record<number, number>
}

export type ReviewSubmittedEvent = BaseEvent<ReviewSubmittedPayload>
export type ReviewModerationEvent = BaseEvent<ReviewModerationPayload>
export type RatingUpdatedEvent = BaseEvent<RatingUpdatedPayload>

// ============================================================================
// FRAUD EVENTS
// ============================================================================

export interface TransactionScoredPayload {
  transactionId: string
  type: 'order' | 'payment' | 'account_change'
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  signals: Array<{
    signal: string
    weight: number
    details: string
  }>
  recommendation: 'approve' | 'review' | 'block'
}

export interface FraudAlertPayload {
  alertId: string
  entityType: 'customer' | 'order' | 'payment'
  entityId: string
  alertType: string
  severity: 'warning' | 'critical'
  details: Record<string, unknown>
}

export type TransactionScoredEvent = BaseEvent<TransactionScoredPayload>
export type FraudAlertEvent = BaseEvent<FraudAlertPayload>

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Crée un événement avec les métadonnées par défaut
 */
export function createEvent<T>(
  payload: T,
  options: Partial<EventMetadata> = {}
): BaseEvent<T> {
  return {
    meta: {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      source: options.source || 'api',
      correlationId: options.correlationId,
      userId: options.userId,
      context: options.context,
    },
    payload,
  }
}

/**
 * Type guard pour vérifier si un objet est un BaseEvent
 */
export function isBaseEvent(obj: unknown): obj is BaseEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'meta' in obj &&
    'payload' in obj &&
    typeof (obj as BaseEvent).meta.eventId === 'string' &&
    typeof (obj as BaseEvent).meta.timestamp === 'string'
  )
}
