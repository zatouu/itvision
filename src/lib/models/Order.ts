import mongoose, { Schema, Document } from 'mongoose'

export interface IOrderItem {
  id: string
  variantId?: string
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
  // Réduction par quantité (existante)
  quantityDiscount?: {
    percent: number
    amount: number
    label: string
  }
}

export interface IOrder extends Document {
  orderId: string // Format: CMD-TIMESTAMP-RANDOM
  clientName: string
  clientEmail?: string
  clientPhone: string
  clientId?: mongoose.Types.ObjectId

  // Accès invité (suivi / modification adresse) via token secret
  trackingAccessTokenHash?: string
  trackingAccessTokenCreatedAt?: Date
  
  items: IOrderItem[]
  fees: IOrderFees                  // Décomposition des frais
  subtotal: number                   // Produits avec frais inclus
  subtotalBeforeDiscounts: number     // Avant réduction quantité
  shipping: IOrderShipping
  total: number                      // Subtotal + transport
  
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
  
  notes?: string
  internalNotes?: string
  
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
  
  // Métadonnées
  currency: string
  source: 'web' | 'app' | 'api' // Source de commande
  tags?: string[]
}

const OrderItemSchema = new Schema<IOrderItem>({
  id: { type: String, required: true },
  variantId: { type: String },
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
  }
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
  clientName: { type: String, required: true },
  clientEmail: { type: String, sparse: true },
  clientPhone: { type: String, required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, sparse: true, index: true },

  trackingAccessTokenHash: { type: String, sparse: true, index: true },
  trackingAccessTokenCreatedAt: { type: Date, sparse: true },
  
  items: [OrderItemSchema],
  fees: { type: OrderFeesSchema, required: true },
  subtotal: { type: Number, required: true },
  subtotalBeforeDiscounts: { type: Number, required: true },
  shipping: { type: OrderShippingSchema, required: true },
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
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentMethod: { type: String },
  transactionId: { type: String },
  
  notes: { type: String },
  internalNotes: { type: String },
  
  createdAt: { type: Date, default: () => new Date(), index: true },
  updatedAt: { type: Date, default: () => new Date() },
  confirmedAt: { type: Date, sparse: true },
  shippedAt: { type: Date, sparse: true },
  deliveredAt: { type: Date, sparse: true },
  
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
