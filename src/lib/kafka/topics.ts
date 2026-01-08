/**
 * Kafka Topics Registry - IT Vision
 * 
 * Centralise tous les topics Kafka utilisés par l'application.
 * Chaque moteur a son propre namespace de topics.
 * 
 * Convention: {domain}.{entity}.{action}
 * 
 * @module lib/kafka/topics
 */

// ============================================================================
// CATALOG DOMAIN
// ============================================================================
export const CATALOG_TOPICS = {
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_DELETED: 'catalog.product.deleted',
  PRODUCT_VIEWED: 'catalog.product.viewed',
  VARIANT_CREATED: 'catalog.variant.created',
  VARIANT_UPDATED: 'catalog.variant.updated',
  CATEGORY_UPDATED: 'catalog.category.updated',
} as const

// ============================================================================
// PRICING DOMAIN
// ============================================================================
export const PRICING_TOPICS = {
  PRICE_CALCULATED: 'pricing.price.calculated',
  MARGIN_UPDATED: 'pricing.margin.updated',
  SETTINGS_CHANGED: 'pricing.settings.changed',
  TIER_ACTIVATED: 'pricing.tier.activated',
} as const

// ============================================================================
// ORDER DOMAIN
// ============================================================================
export const ORDER_TOPICS = {
  CART_UPDATED: 'order.cart.updated',
  ORDER_PLACED: 'order.order.placed',
  ORDER_CONFIRMED: 'order.order.confirmed',
  ORDER_PROCESSING: 'order.order.processing',
  ORDER_SHIPPED: 'order.order.shipped',
  ORDER_DELIVERED: 'order.order.delivered',
  ORDER_CANCELLED: 'order.order.cancelled',
  ORDER_REFUNDED: 'order.order.refunded',
} as const

// ============================================================================
// BILLING DOMAIN
// ============================================================================
export const BILLING_TOPICS = {
  QUOTE_CREATED: 'billing.quote.created',
  QUOTE_SENT: 'billing.quote.sent',
  QUOTE_ACCEPTED: 'billing.quote.accepted',
  QUOTE_REJECTED: 'billing.quote.rejected',
  INVOICE_GENERATED: 'billing.invoice.generated',
  INVOICE_SENT: 'billing.invoice.sent',
  INVOICE_PAID: 'billing.invoice.paid',
  INVOICE_OVERDUE: 'billing.invoice.overdue',
  CREDIT_ISSUED: 'billing.credit.issued',
} as const

// ============================================================================
// INVENTORY DOMAIN
// ============================================================================
export const INVENTORY_TOPICS = {
  STOCK_UPDATED: 'inventory.stock.updated',
  STOCK_LOW: 'inventory.stock.low',
  STOCK_DEPLETED: 'inventory.stock.depleted',
  STOCK_REPLENISHED: 'inventory.stock.replenished',
  REORDER_SUGGESTED: 'inventory.reorder.suggested',
} as const

// ============================================================================
// LOYALTY DOMAIN
// ============================================================================
export const LOYALTY_TOPICS = {
  POINTS_EARNED: 'loyalty.points.earned',
  POINTS_REDEEMED: 'loyalty.points.redeemed',
  POINTS_EXPIRED: 'loyalty.points.expired',
  TIER_UPGRADED: 'loyalty.tier.upgraded',
  TIER_DOWNGRADED: 'loyalty.tier.downgraded',
  REWARD_UNLOCKED: 'loyalty.reward.unlocked',
  REWARD_CLAIMED: 'loyalty.reward.claimed',
} as const

// ============================================================================
// GROUP BUY DOMAIN
// ============================================================================
export const GROUP_BUY_TOPICS = {
  GROUP_CREATED: 'groupbuy.group.created',
  PARTICIPANT_JOINED: 'groupbuy.participant.joined',
  PARTICIPANT_LEFT: 'groupbuy.participant.left',
  THRESHOLD_REACHED: 'groupbuy.threshold.reached',
  GROUP_CLOSED: 'groupbuy.group.closed',
  GROUP_EXPIRED: 'groupbuy.group.expired',
  GROUP_CANCELLED: 'groupbuy.group.cancelled',
} as const

// ============================================================================
// PAYMENT DOMAIN
// ============================================================================
export const PAYMENT_TOPICS = {
  PAYMENT_INITIATED: 'payment.payment.initiated',
  PAYMENT_PROCESSING: 'payment.payment.processing',
  PAYMENT_COMPLETED: 'payment.payment.completed',
  PAYMENT_FAILED: 'payment.payment.failed',
  PAYMENT_REFUNDED: 'payment.payment.refunded',
  PAYMENT_DISPUTED: 'payment.payment.disputed',
} as const

// ============================================================================
// SHIPPING DOMAIN
// ============================================================================
export const SHIPPING_TOPICS = {
  SHIPMENT_CREATED: 'shipping.shipment.created',
  SHIPMENT_PICKED_UP: 'shipping.shipment.pickedup',
  SHIPMENT_IN_TRANSIT: 'shipping.shipment.intransit',
  SHIPMENT_OUT_FOR_DELIVERY: 'shipping.shipment.outfordelivery',
  SHIPMENT_DELIVERED: 'shipping.shipment.delivered',
  SHIPMENT_RETURNED: 'shipping.shipment.returned',
  SHIPMENT_EXCEPTION: 'shipping.shipment.exception',
} as const

// ============================================================================
// TECHNICIAN DOMAIN
// ============================================================================
export const TECHNICIAN_TOPICS = {
  MISSION_CREATED: 'technician.mission.created',
  MISSION_PUBLISHED: 'technician.mission.published',
  BID_PLACED: 'technician.bid.placed',
  BID_ACCEPTED: 'technician.bid.accepted',
  BID_REJECTED: 'technician.bid.rejected',
  MISSION_ASSIGNED: 'technician.mission.assigned',
  MISSION_STARTED: 'technician.mission.started',
  MISSION_COMPLETED: 'technician.mission.completed',
  MISSION_CANCELLED: 'technician.mission.cancelled',
  FEEDBACK_SUBMITTED: 'technician.feedback.submitted',
} as const

// ============================================================================
// NOTIFICATION DOMAIN
// ============================================================================
export const NOTIFICATION_TOPICS = {
  EMAIL_QUEUED: 'notification.email.queued',
  EMAIL_SENT: 'notification.email.sent',
  EMAIL_FAILED: 'notification.email.failed',
  SMS_QUEUED: 'notification.sms.queued',
  SMS_SENT: 'notification.sms.sent',
  SMS_FAILED: 'notification.sms.failed',
  PUSH_QUEUED: 'notification.push.queued',
  PUSH_SENT: 'notification.push.sent',
  WHATSAPP_QUEUED: 'notification.whatsapp.queued',
  WHATSAPP_SENT: 'notification.whatsapp.sent',
} as const

// ============================================================================
// CUSTOMER DOMAIN
// ============================================================================
export const CUSTOMER_TOPICS = {
  CUSTOMER_REGISTERED: 'customer.customer.registered',
  CUSTOMER_UPDATED: 'customer.customer.updated',
  CUSTOMER_VERIFIED: 'customer.customer.verified',
  CUSTOMER_DEACTIVATED: 'customer.customer.deactivated',
  SEGMENT_ASSIGNED: 'customer.segment.assigned',
} as const

// ============================================================================
// ANALYTICS DOMAIN
// ============================================================================
export const ANALYTICS_TOPICS = {
  EVENT_TRACKED: 'analytics.event.tracked',
  PAGEVIEW_RECORDED: 'analytics.pageview.recorded',
  CONVERSION_RECORDED: 'analytics.conversion.recorded',
  SESSION_STARTED: 'analytics.session.started',
  SESSION_ENDED: 'analytics.session.ended',
} as const

// ============================================================================
// PROMOTION DOMAIN
// ============================================================================
export const PROMOTION_TOPICS = {
  PROMO_CREATED: 'promotion.promo.created',
  PROMO_ACTIVATED: 'promotion.promo.activated',
  PROMO_DEACTIVATED: 'promotion.promo.deactivated',
  PROMO_APPLIED: 'promotion.promo.applied',
  PROMO_EXPIRED: 'promotion.promo.expired',
  COUPON_GENERATED: 'promotion.coupon.generated',
  COUPON_REDEEMED: 'promotion.coupon.redeemed',
} as const

// ============================================================================
// REVIEW DOMAIN
// ============================================================================
export const REVIEW_TOPICS = {
  REVIEW_SUBMITTED: 'review.review.submitted',
  REVIEW_APPROVED: 'review.review.approved',
  REVIEW_REJECTED: 'review.review.rejected',
  REVIEW_FLAGGED: 'review.review.flagged',
  RATING_UPDATED: 'review.rating.updated',
} as const

// ============================================================================
// FRAUD DOMAIN
// ============================================================================
export const FRAUD_TOPICS = {
  TRANSACTION_SCORED: 'fraud.transaction.scored',
  ALERT_RAISED: 'fraud.alert.raised',
  ALERT_RESOLVED: 'fraud.alert.resolved',
  ACCOUNT_FLAGGED: 'fraud.account.flagged',
  ACCOUNT_BLOCKED: 'fraud.account.blocked',
} as const

// ============================================================================
// ALL TOPICS (pour création automatique)
// ============================================================================
export const ALL_TOPICS = {
  ...CATALOG_TOPICS,
  ...PRICING_TOPICS,
  ...ORDER_TOPICS,
  ...BILLING_TOPICS,
  ...INVENTORY_TOPICS,
  ...LOYALTY_TOPICS,
  ...GROUP_BUY_TOPICS,
  ...PAYMENT_TOPICS,
  ...SHIPPING_TOPICS,
  ...TECHNICIAN_TOPICS,
  ...NOTIFICATION_TOPICS,
  ...CUSTOMER_TOPICS,
  ...ANALYTICS_TOPICS,
  ...PROMOTION_TOPICS,
  ...REVIEW_TOPICS,
  ...FRAUD_TOPICS,
} as const

export type TopicName = typeof ALL_TOPICS[keyof typeof ALL_TOPICS]

// ============================================================================
// HELPER: Liste des topics par domaine
// ============================================================================
export const TOPICS_BY_DOMAIN = {
  catalog: Object.values(CATALOG_TOPICS),
  pricing: Object.values(PRICING_TOPICS),
  order: Object.values(ORDER_TOPICS),
  billing: Object.values(BILLING_TOPICS),
  inventory: Object.values(INVENTORY_TOPICS),
  loyalty: Object.values(LOYALTY_TOPICS),
  groupbuy: Object.values(GROUP_BUY_TOPICS),
  payment: Object.values(PAYMENT_TOPICS),
  shipping: Object.values(SHIPPING_TOPICS),
  technician: Object.values(TECHNICIAN_TOPICS),
  notification: Object.values(NOTIFICATION_TOPICS),
  customer: Object.values(CUSTOMER_TOPICS),
  analytics: Object.values(ANALYTICS_TOPICS),
  promotion: Object.values(PROMOTION_TOPICS),
  review: Object.values(REVIEW_TOPICS),
  fraud: Object.values(FRAUD_TOPICS),
} as const

export default ALL_TOPICS
