import mongoose, { Schema, Document } from 'mongoose'

// Participant à un achat groupé
export interface IGroupOrderParticipant {
  userId?: mongoose.Types.ObjectId
  name: string
  email?: string
  phone: string
  qty: number
  unitPrice: number        // Prix unitaire au moment de l'inscription
  totalAmount: number      // Montant total pour ce participant
  paidAmount: number       // Montant déjà payé
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded'
  joinedAt: Date
  notes?: string
}

export interface IGroupOrder extends Document {
  groupId: string              // Format: GRP-TIMESTAMP-RANDOM
  status: 'pending_approval' | 'draft' | 'open' | 'filled' | 'ordering' | 'ordered' | 'shipped' | 'delivered' | 'cancelled' | 'rejected'
  
  // Origine de la demande
  origin: 'admin' | 'client'   // Qui a créé cette demande
  
  // Produit concerné
  product: {
    productId: mongoose.Types.ObjectId
    name: string
    image?: string
    basePrice: number          // Prix de base (sans dégressif)
    currency: string
  }
  
  // Configuration quantités
  minQty: number               // Quantité min pour valider le groupe
  targetQty: number            // Quantité cible optimale
  currentQty: number           // Quantité actuelle réservée
  maxQty?: number              // Quantité max autorisée
  
  // Prix dégressifs (copie du produit au moment de création)
  priceTiers: Array<{
    minQty: number
    maxQty?: number
    price: number
    discount?: number
  }>
  currentUnitPrice: number     // Prix unitaire actuel basé sur currentQty
  
  // Participants
  participants: IGroupOrderParticipant[]
  maxParticipants?: number     // Nombre max de participants
  
  // Dates
  deadline: Date               // Date limite pour rejoindre
  estimatedDelivery?: Date     // Date estimée de livraison
  
  // Transport
  shippingMethod?: 'maritime_60j' | 'air_15j' | 'express_3j'
  shippingCostPerUnit?: number
  
  // Créateur (client qui propose ou admin qui crée)
  createdBy: {
    userId?: mongoose.Types.ObjectId
    name: string
    phone: string
    email?: string
  }
  
  // Proposition client (si origin === 'client')
  proposal?: {
    message: string            // Message du client expliquant sa demande
    desiredQty: number         // Quantité souhaitée par le client
    submittedAt: Date
    reviewedAt?: Date
    reviewedBy?: mongoose.Types.ObjectId
    rejectionReason?: string
  }
  
  // Commande finale liée
  linkedOrderId?: string
  
  // Métadonnées
  description?: string
  internalNotes?: string
  tags?: string[]
  
  createdAt: Date
  updatedAt: Date
}

const GroupOrderParticipantSchema = new Schema<IGroupOrderParticipant>({
  userId: { type: mongoose.Schema.Types.ObjectId, sparse: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'refunded'], 
    default: 'pending' 
  },
  joinedAt: { type: Date, default: () => new Date() },
  notes: { type: String }
}, { _id: true })

const GroupOrderSchema = new Schema<IGroupOrder>({
  groupId: { type: String, required: true, unique: true, index: true },
  status: { 
    type: String, 
    enum: ['pending_approval', 'draft', 'open', 'filled', 'ordering', 'ordered', 'shipped', 'delivered', 'cancelled', 'rejected'],
    default: 'draft',
    index: true
  },
  
  origin: {
    type: String,
    enum: ['admin', 'client'],
    default: 'admin'
  },
  
  product: {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    image: { type: String },
    basePrice: { type: Number, required: true },
    currency: { type: String, default: 'FCFA' }
  },
  
  minQty: { type: Number, required: true, min: 1 },
  targetQty: { type: Number, required: true },
  currentQty: { type: Number, default: 0 },
  maxQty: { type: Number },
  
  priceTiers: {
    type: [new Schema({
      minQty: { type: Number, required: true },
      maxQty: { type: Number },
      price: { type: Number, required: true },
      discount: { type: Number }
    }, { _id: false })],
    default: []
  },
  currentUnitPrice: { type: Number, required: true },
  
  participants: { type: [GroupOrderParticipantSchema], default: [] },
  maxParticipants: { type: Number },
  
  deadline: { type: Date, required: true, index: true },
  estimatedDelivery: { type: Date },
  
  shippingMethod: { 
    type: String, 
    enum: ['maritime_60j', 'air_15j', 'express_3j'],
    default: 'maritime_60j'
  },
  shippingCostPerUnit: { type: Number },
  
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, sparse: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String }
  },
  
  proposal: {
    message: { type: String },
    desiredQty: { type: Number },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId },
    rejectionReason: { type: String }
  },
  
  linkedOrderId: { type: String, sparse: true },
  
  description: { type: String },
  internalNotes: { type: String },
  tags: [{ type: String }]
}, { timestamps: true })

// Index composites
GroupOrderSchema.index({ status: 1, deadline: 1 })
GroupOrderSchema.index({ 'product.productId': 1, status: 1 })
GroupOrderSchema.index({ 'participants.phone': 1 })
GroupOrderSchema.index({ origin: 1, status: 1 }) // Pour filtrer les propositions clients

// Méthode pour calculer le prix unitaire basé sur la quantité
GroupOrderSchema.methods.calculateUnitPrice = function(qty: number): number {
  const tiers = this.priceTiers.sort((a: any, b: any) => b.minQty - a.minQty)
  for (const tier of tiers) {
    if (qty >= tier.minQty && (!tier.maxQty || qty <= tier.maxQty)) {
      return tier.price
    }
  }
  return this.product.basePrice
}

// Hook pour mettre à jour currentUnitPrice avant save
GroupOrderSchema.pre('save', function(next) {
  if (this.priceTiers && this.priceTiers.length > 0) {
    const sortedTiers = [...this.priceTiers].sort((a, b) => b.minQty - a.minQty)
    for (const tier of sortedTiers) {
      if (this.currentQty >= tier.minQty && (!tier.maxQty || this.currentQty <= tier.maxQty)) {
        this.currentUnitPrice = tier.price
        break
      }
    }
  }
  next()
})

export const GroupOrder = mongoose.models.GroupOrder || mongoose.model<IGroupOrder>('GroupOrder', GroupOrderSchema)
