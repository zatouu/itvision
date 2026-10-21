import mongoose, { Schema, Document } from 'mongoose'
import type { SharedPricingSnapshot } from '@/lib/pricing/shared-settings'

export type OrderDomain = 'marketplace' | 'corporate' | 'services'

export interface IOrderAddOn {
  id: string
  name: string
  price: number
}

export interface IOrderItemDelivery {
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  estimatedDeliveryDate?: Date
  status?: string
  lastUpdate?: Date
}

export interface IOrderItem {
  id: string
  variantId?: string
  variantIds?: string[]
  variantLabels?: string[]
  name: string
  qty: number
  price: number // Prix avec frais inclus
  priceType?: 'retail' | 'wholesale'
  currency: string
  requiresQuote?: boolean
  shipping?: {
    id: string
    label: string
    durationDays: number
    cost: number
    currency: string
  }
  delivery?: IOrderItemDelivery
}

export interface IInventoryReservation {
  productId: string
  qty: number
  variantIds?: string[]
  restored?: boolean
  /** Quantité déjà restituée (retours partiels) — `restored` = tout restitué */
  restoredQty?: number
  decrementedAt?: Date
}

export interface IOrderShipping {
  method: string // 'express_3j', 'air_15j', 'maritime_60j'
  totalCost: number
  currency: string
  totalWeight?: number
  totalVolume?: number
  // Détail du calcul poids volumétrique (transparence)
  weightDetails?: {
    actualWeight: number
    volumetricWeight: number
    billedWeight: number
    billingMethod: 'actual' | 'volumetric'
  }
  // Segments de livraison locale — un forfait par boutique (produits en stock à Dakar)
  localShipments?: {
    shopId: string
    shopName?: string
    feeFcfa: number
    subtotal: number
  }[]
}

export interface IOrderFees {
  // Décomposition des frais pour transparence
  supplierCost: number        // Coût fournisseur (1688 converti)
  serviceFeeRate: number      // Taux appliqué (peut être réduit B2B)
  serviceFeeStandardRate: number // Taux standard (10%)
  serviceFeeAmount: number    // Montant frais service
  serviceFeeSavings: number   // Économie si réduction B2B
  insuranceRate: number     // Taux assurance (2.5%)
  insuranceAmount: number   // Montant assurance
  totalFees: number          // Total frais
  /** Taux CNY→FCFA plateforme au moment de la commande (produits sans taux propre) */
  exchangeRate?: number
  // Réduction par quantité (existante)
  quantityDiscount?: {
    percent: number
    amount: number
    label: string
  }
}

export interface IOrder extends Document {
  orderId: string // Format: CMD-TIMESTAMP-RANDOM
  pricingSnapshot?: SharedPricingSnapshot
  clientName: string
  clientEmail?: string
  clientPhone: string
  clientId?: mongoose.Types.ObjectId

  // Accès invité (suivi / modification adresse) via token secret
  trackingAccessTokenHash?: string
  trackingAccessTokenCreatedAt?: Date
  trackingAccessTokenExpiresAt?: Date
  
  // Domaine métier de la commande
  domain: OrderDomain
  projectId?: mongoose.Types.ObjectId // corporate
  serviceRequestId?: mongoose.Types.ObjectId // services
  
  items: IOrderItem[]
  inventoryReservations?: IInventoryReservation[]
  fees: IOrderFees                  // Décomposition des frais
  subtotal: number                   // Produits avec frais inclus
  subtotalBeforeDiscounts: number     // Avant réduction quantité
  shipping: IOrderShipping
  addOns?: IOrderAddOn[]             // Options ajoutées au checkout
  addOnsTotal?: number               // Total des options
  grainsDiscount?: number            // Remise Grains
  promoDiscount?: number             // Remise code promo
  promoCode?: string                 // Code promo appliqué
  promoRestored?: boolean            // Usage promo déjà restitué (annulation)
  grainsUsed?: number                // Grains utilisés
  total: number                      // Subtotal + transport + addOns - réductions
  
  address: {
    street?: string
    city?: string
    postalCode?: string
    country?: string
    notes?: string
  }
  
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'pending' | 'completed' | 'failed'
  paymentMethod?: string
  transactionId?: string
  /** Remboursement dû au client (commande payée annulée, retour accepté) */
  refundStatus?: 'none' | 'pending' | 'done'
  refundAmount?: number
  refundReference?: string
  refundedAt?: Date
  refundedBy?: string
  /** Garantie GAR-… créée au paiement (suivi public /suivi/[reference]) */
  guaranteeReference?: string
  /** Ambassadeur à l'origine de la vente (lien ?ref=) */
  referral?: { code: string; ambassadorUserId: mongoose.Types.ObjectId }
  /** Retrait en point relais au lieu d'une remise à l'adresse */
  pickupPoint?: { id: string; name: string; neighborhood?: string; address?: string }
  /** Colis disponible au point de retrait (client prévenu) */
  readyForPickupAt?: Date
  /** Régularisation du transport après pesée réelle à Guangzhou (amount > 0 : complément dû, < 0 : remboursé) */
  shippingAdjustment?: {
    realWeightKg: number
    realVolumeM3?: number
    estimatedCost: number
    realCost: number
    amount: number
    status: 'absorbed' | 'awaiting_payment' | 'paid' | 'refund'
    paymentReference?: string
    paidAmount?: number
    paidAt?: Date
    paymentMethod?: string
    transactionId?: string
    measuredAt: Date
    measuredBy?: string
  }
  
  notes?: string
  internalNotes?: string
  
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  updatedBy?: string
  /** Alertes envoyées par l'agent order_sla_watchdog (une seule fois chacune) */
  slaAlerts?: {
    unpaidReminderAt?: Date
    vendorNudgeAt?: Date
    adminEscalationAt?: Date
    deliveryOverdueAt?: Date
  }

  // Suivi transporteur
  delivery?: {
    carrier?: string
    trackingNumber?: string
    trackingUrl?: string
    estimatedDeliveryDate?: Date
    status?: string
    lastUpdate?: Date
  }
  
  // Métadonnées
  currency: string
  source: 'web' | 'app' | 'api' // Source de commande
  tags?: string[]
}

const OrderAddOnSchema = new Schema<IOrderAddOn>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
}, { _id: false })

const OrderItemSchema = new Schema<IOrderItem>({
  id: { type: String, required: true },
  variantId: { type: String },
  variantIds: { type: [String] },
  variantLabels: { type: [String] },
  name: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  priceType: { type: String, enum: ['retail', 'wholesale'] },
  currency: { type: String, default: 'FCFA' },
  requiresQuote: { type: Boolean, default: false },
  shipping: {
    id: { type: String },
    label: { type: String },
    durationDays: { type: Number },
    cost: { type: Number },
    currency: { type: String }
  },
  delivery: {
    carrier: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDeliveryDate: { type: Date },
    status: { type: String },
    lastUpdate: { type: Date }
  }
}, { _id: false })

const InventoryReservationSchema = new Schema<IInventoryReservation>({
  productId: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  variantIds: { type: [String] },
  restored: { type: Boolean, default: false },
  restoredQty: { type: Number, default: 0 },
  decrementedAt: { type: Date }
}, { _id: false })

const OrderShippingSchema = new Schema<IOrderShipping>({
  method: { type: String, required: true },
  totalCost: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
  totalWeight: { type: Number },
  totalVolume: { type: Number },
  weightDetails: {
    type: new Schema({
      actualWeight: { type: Number, required: true },
      volumetricWeight: { type: Number, required: true },
      billedWeight: { type: Number, required: true },
      billingMethod: { type: String, enum: ['actual', 'volumetric'], required: true }
    }, { _id: false }),
    required: false
  },
  localShipments: {
    type: [new Schema({
      shopId: { type: String, required: true },
      shopName: { type: String },
      feeFcfa: { type: Number, required: true, min: 0 },
      subtotal: { type: Number, required: true, min: 0 }
    }, { _id: false })],
    required: false
  }
}, { _id: false })

const OrderFeesSchema = new Schema<IOrderFees>({
  supplierCost: { type: Number, required: true },
  serviceFeeRate: { type: Number, required: true },
  serviceFeeStandardRate: { type: Number, required: true },
  serviceFeeAmount: { type: Number, required: true },
  serviceFeeSavings: { type: Number, default: 0 },
  insuranceRate: { type: Number, required: true },
  insuranceAmount: { type: Number, required: true },
  totalFees: { type: Number, required: true },
  exchangeRate: { type: Number },
  quantityDiscount: {
    type: new Schema({
      percent: { type: Number, required: true },
      amount: { type: Number, required: true },
      label: { type: String, required: true }
    }, { _id: false }),
    required: false
  }
}, { _id: false })

const OrderSchema = new Schema<IOrder>({
  orderId: { type: String, required: true, unique: true, index: true },
  pricingSnapshot: { type: Schema.Types.Mixed },
  clientName: { type: String, required: true },
  clientEmail: { type: String, sparse: true },
  clientPhone: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, sparse: true, },

  trackingAccessTokenHash: { type: String, sparse: true, index: true },
  trackingAccessTokenCreatedAt: { type: Date, sparse: true },
  trackingAccessTokenExpiresAt: { type: Date, sparse: true },
  
  // Domaine métier de la commande
  domain: {
    type: String,
    enum: ['marketplace', 'corporate', 'services'],
    default: 'marketplace',
    index: true
  },
  projectId: { type: mongoose.Schema.Types.ObjectId, sparse: true, index: true },
  serviceRequestId: { type: mongoose.Schema.Types.ObjectId, sparse: true, index: true },
  
  items: [OrderItemSchema],
  inventoryReservations: { type: [InventoryReservationSchema], default: [] },
  fees: { type: OrderFeesSchema, required: true },
  subtotal: { type: Number, required: true },
  subtotalBeforeDiscounts: { type: Number, required: true },
  shipping: { type: OrderShippingSchema, required: true },
  addOns: { type: [OrderAddOnSchema], default: [] },
  addOnsTotal: { type: Number, default: 0 },
  grainsDiscount: { type: Number, default: 0 },
  promoDiscount: { type: Number, default: 0 },
  promoCode: { type: String },
  promoRestored: { type: Boolean, default: false },
  grainsUsed: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  address: {
    street: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
    notes: { type: String }
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',

  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  refundStatus: { type: String, enum: ['none', 'pending', 'done'], default: 'none', index: true },
  refundAmount: { type: Number, min: 0 },
  refundReference: { type: String },
  refundedAt: { type: Date },
  refundedBy: { type: String },
  guaranteeReference: { type: String, sparse: true },
  referral: {
    type: new Schema({
      code: { type: String, required: true },
      ambassadorUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    }, { _id: false }),
    required: false,
  },
  pickupPoint: {
    type: new Schema({
      id: { type: String, required: true },
      name: { type: String, required: true },
      neighborhood: { type: String },
      address: { type: String },
    }, { _id: false }),
    required: false,
  },
  readyForPickupAt: { type: Date },
  shippingAdjustment: {
    type: new Schema({
      realWeightKg: { type: Number, required: true, min: 0 },
      realVolumeM3: { type: Number, min: 0 },
      estimatedCost: { type: Number, required: true },
      realCost: { type: Number, required: true },
      amount: { type: Number, required: true },
      status: { type: String, enum: ['absorbed', 'awaiting_payment', 'paid', 'refund'], required: true },
      paymentReference: { type: String, index: true, sparse: true },
      paidAmount: { type: Number },
      paidAt: { type: Date },
      paymentMethod: { type: String },
      transactionId: { type: String },
      measuredAt: { type: Date, required: true },
      measuredBy: { type: String },
    }, { _id: false }),
    required: false,
  },
  
  notes: { type: String },
  internalNotes: { type: String },
  
  createdAt: { type: Date, default: () => new Date(), },
  updatedAt: { type: Date, default: () => new Date() },
  confirmedAt: { type: Date, sparse: true },
  shippedAt: { type: Date, sparse: true },
  deliveredAt: { type: Date, sparse: true },
  updatedBy: { type: String },
  slaAlerts: {
    unpaidReminderAt: { type: Date },
    vendorNudgeAt: { type: Date },
    adminEscalationAt: { type: Date },
    deliveryOverdueAt: { type: Date },
  },

  delivery: {
    carrier: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDeliveryDate: { type: Date },
    status: { type: String },
    lastUpdate: { type: Date }
  },
  
  currency: { type: String, default: 'FCFA' },
  source: { type: String, enum: ['web', 'app', 'api'], default: 'web' },
  tags: [{ type: String }]
})

// Index pour recherche rapide
OrderSchema.index({ createdAt: -1 })
OrderSchema.index({ status: 1, createdAt: -1 })
OrderSchema.index({ clientId: 1, createdAt: -1 })

// Mettre à jour updatedAt avant chaque save
OrderSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

export const Order = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema)
