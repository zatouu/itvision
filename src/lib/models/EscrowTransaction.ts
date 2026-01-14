/**
 * Modèle EscrowTransaction
 * Système de garantie et suivi des paiements pour renforcer la confiance client
 * 
 * Ce n'est pas un escrow technique avec tiers, mais un système de transparence
 * qui montre au client exactement où en est son argent et ses garanties.
 */

import mongoose, { Schema, Document } from 'mongoose'

// États du cycle de vie d'une transaction garantie
export type EscrowStatus = 
  | 'pending_payment'    // En attente de paiement
  | 'payment_received'   // Paiement reçu et vérifié
  | 'funds_secured'      // Fonds sécurisés (garantie active)
  | 'order_placed'       // Commande passée au fournisseur
  | 'order_confirmed'    // Fournisseur a confirmé
  | 'in_transit'         // En cours de livraison
  | 'delivered'          // Livré au client
  | 'verification'       // Période de vérification (48-72h)
  | 'completed'          // Transaction finalisée avec succès
  | 'disputed'           // Litige ouvert par le client
  | 'refunded'           // Remboursé
  | 'cancelled'          // Annulé

// Historique d'une étape
export interface IEscrowEvent {
  status: EscrowStatus
  timestamp: Date
  note?: string
  notifiedClient: boolean
  adminId?: string
}

// Garanties offertes
export interface IGuarantee {
  type: 'money_back' | 'replacement' | 'repair' | 'partial_refund'
  description: string
  validUntil: Date
  conditions: string
}

// Document principal
export interface IEscrowTransaction extends Document {
  // Référence unique visible au client
  reference: string
  
  // Liens vers les entités
  groupOrderId?: mongoose.Types.ObjectId
  orderId?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  
  // Informations client
  client: {
    name: string
    phone: string
    email?: string
  }
  
  // Montants
  amount: number
  currency: string
  paidAmount: number
  
  // Statut actuel
  status: EscrowStatus
  
  // Historique complet (visible au client)
  timeline: IEscrowEvent[]
  
  // Garanties offertes
  guarantees: IGuarantee[]
  
  // Dates clés
  paymentReceivedAt?: Date
  orderPlacedAt?: Date
  deliveredAt?: Date
  verificationEndsAt?: Date
  completedAt?: Date
  
  // Informations de livraison
  delivery?: {
    method: string
    trackingNumber?: string
    carrier?: string
    estimatedDate?: Date
    actualDate?: Date
    proofUrl?: string // Photo de livraison
  }
  
  // Litige éventuel
  dispute?: {
    openedAt: Date
    reason: string
    description: string
    evidence: string[]
    resolution?: string
    resolvedAt?: Date
  }
  
  // Remboursement éventuel
  refund?: {
    amount: number
    reason: string
    method: 'wave' | 'orange_money' | 'bank' | 'other'
    processedAt?: Date
    transactionId?: string
  }
  
  // Métadonnées
  createdAt: Date
  updatedAt: Date
}

const EscrowEventSchema = new Schema<IEscrowEvent>({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  note: String,
  notifiedClient: { type: Boolean, default: false },
  adminId: String
}, { _id: false })

const GuaranteeSchema = new Schema<IGuarantee>({
  type: { type: String, enum: ['money_back', 'replacement', 'repair', 'partial_refund'], required: true },
  description: { type: String, required: true },
  validUntil: { type: Date, required: true },
  conditions: String
}, { _id: false })

const EscrowTransactionSchema = new Schema<IEscrowTransaction>({
  reference: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  groupOrderId: { type: Schema.Types.ObjectId, ref: 'GroupOrder' },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  client: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: String
  },
  
  amount: { type: Number, required: true },
  currency: { type: String, default: 'FCFA' },
  paidAmount: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: [
      'pending_payment', 'payment_received', 'funds_secured', 
      'order_placed', 'order_confirmed', 'in_transit', 
      'delivered', 'verification', 'completed', 
      'disputed', 'refunded', 'cancelled'
    ],
    default: 'pending_payment'
  },
  
  timeline: [EscrowEventSchema],
  guarantees: [GuaranteeSchema],
  
  paymentReceivedAt: Date,
  orderPlacedAt: Date,
  deliveredAt: Date,
  verificationEndsAt: Date,
  completedAt: Date,
  
  delivery: {
    method: String,
    trackingNumber: String,
    carrier: String,
    estimatedDate: Date,
    actualDate: Date,
    proofUrl: String
  },
  
  dispute: {
    openedAt: Date,
    reason: String,
    description: String,
    evidence: [String],
    resolution: String,
    resolvedAt: Date
  },
  
  refund: {
    amount: Number,
    reason: String,
    method: { type: String, enum: ['wave', 'orange_money', 'bank', 'other'] },
    processedAt: Date,
    transactionId: String
  }
}, {
  timestamps: true
})

// Index pour recherches fréquentes
EscrowTransactionSchema.index({ status: 1 })
EscrowTransactionSchema.index({ 'client.phone': 1 })
EscrowTransactionSchema.index({ userId: 1 })
EscrowTransactionSchema.index({ groupOrderId: 1 })

// Générer une référence unique
EscrowTransactionSchema.statics.generateReference = function(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `GAR-${year}${month}-${random}`
}

// Méthode pour ajouter un événement au timeline
EscrowTransactionSchema.methods.addEvent = function(
  status: EscrowStatus, 
  note?: string, 
  adminId?: string
): void {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    notifiedClient: false,
    adminId
  })
  this.status = status
}

// Méthode pour calculer les garanties par défaut
EscrowTransactionSchema.methods.setDefaultGuarantees = function(): void {
  const now = new Date()
  
  this.guarantees = [
    {
      type: 'money_back',
      description: 'Remboursement intégral si non livré',
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      conditions: 'Applicable si le produit n\'est pas livré dans les délais annoncés'
    },
    {
      type: 'replacement',
      description: 'Remplacement si produit défectueux',
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 jours après livraison
      conditions: 'Signaler dans les 48h suivant la réception avec photos à l\'appui'
    },
    {
      type: 'partial_refund',
      description: 'Remboursement partiel si non conforme',
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      conditions: 'En cas de différence mineure avec la description'
    }
  ]
}

export const EscrowTransaction = mongoose.models.EscrowTransaction || 
  mongoose.model<IEscrowTransaction>('EscrowTransaction', EscrowTransactionSchema)

// Labels et descriptions pour l'affichage client
export const escrowStatusLabels: Record<EscrowStatus, { label: string; description: string; icon: string }> = {
  pending_payment: {
    label: 'En attente de paiement',
    description: 'Effectuez votre paiement pour démarrer la commande',
    icon: '⏳'
  },
  payment_received: {
    label: 'Paiement reçu',
    description: 'Nous avons bien reçu votre paiement',
    icon: '✅'
  },
  funds_secured: {
    label: 'Fonds sécurisés',
    description: 'Votre argent est protégé. Nous préparons votre commande.',
    icon: '🔒'
  },
  order_placed: {
    label: 'Commande passée',
    description: 'Votre commande a été transmise au fournisseur',
    icon: '📝'
  },
  order_confirmed: {
    label: 'Commande confirmée',
    description: 'Le fournisseur a confirmé la disponibilité',
    icon: '✔️'
  },
  in_transit: {
    label: 'En cours de livraison',
    description: 'Votre colis est en route vers vous',
    icon: '🚚'
  },
  delivered: {
    label: 'Livré',
    description: 'Votre colis a été livré. Vérifiez-le !',
    icon: '📦'
  },
  verification: {
    label: 'Période de vérification',
    description: 'Vous avez 48h pour vérifier votre commande',
    icon: '🔍'
  },
  completed: {
    label: 'Terminé',
    description: 'Transaction complétée avec succès. Merci !',
    icon: '🎉'
  },
  disputed: {
    label: 'Litige en cours',
    description: 'Nous examinons votre réclamation',
    icon: '⚠️'
  },
  refunded: {
    label: 'Remboursé',
    description: 'Le remboursement a été effectué',
    icon: '💰'
  },
  cancelled: {
    label: 'Annulé',
    description: 'Cette transaction a été annulée',
    icon: '❌'
  }
}

export default EscrowTransaction
