import { Schema, model, models } from 'mongoose'

export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed'
export type PaymentProvider = 'wave' | 'orange_money' | 'free_money' | 'cash' | 'wave_qr'
export type PaymentPhase = 'deposit' | 'balance' | 'full'
export type PaymentDomain = 'services' | 'marketplace' | 'group'

const PaymentSchema = new Schema({
  // Lien vers une offre de service (services)
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest' },
  offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
  // Lien vers une commande marketplace/standard
  orderId: { type: String, index: true },
  orderType: { type: String, enum: ['marketplace', 'group'] },
  domain: { type: String, enum: ['services', 'marketplace', 'group'], default: 'services' },

  clientId: { type: String, required: true },
  providerId: { type: String },
  amount: { type: Number, required: true, min: 100 },
  depositAmount: { type: Number, default: 0, min: 0 },
  balanceAmount: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'XOF' },
  provider: { type: String, enum: ['wave', 'orange_money', 'free_money', 'cash', 'wave_qr'], required: true },
  phase: { type: String, enum: ['deposit', 'balance', 'full'], default: 'full' },
  status: { type: String, enum: ['pending', 'held', 'released', 'refunded', 'failed'], default: 'pending' },
  useEscrow: { type: Boolean, default: true },
  // Provider-specific reference IDs
  externalId: { type: String },
  checkoutUrl: { type: String },
  // Paiement manuel (QR statique) : en attente de validation admin
  manualConfirm: { type: Boolean, default: false },
  reference: { type: String }, // référence unique à indiquer par le client (ex: XEUY-AB12CD)
  // Points system
  escrowPointsCharged: { type: Number, default: 0, min: 0 },
  // Timestamps
  heldAt: { type: Date },
  releasedAt: { type: Date },
  releasedBy: { type: String },
  refundedAt: { type: Date },
  refundedBy: { type: String },
  refundAmount: { type: Number, default: 0, min: 0 },
  failedAt: { type: Date },
  failReason: { type: String },
  confirmedBy: { type: String, enum: ['webhook', 'client', 'system_reconcile', 'admin'], default: null },
}, { timestamps: true })

PaymentSchema.index({ requestId: 1, status: 1 })
PaymentSchema.index({ offerId: 1 })
PaymentSchema.index({ clientId: 1, createdAt: -1 })
PaymentSchema.index({ domain: 1, status: 1, createdAt: -1 })
PaymentSchema.index({ externalId: 1 }, { sparse: true })
PaymentSchema.index({ status: 1, createdAt: -1 })

const Payment = models.Payment || model('Payment', PaymentSchema)
export default Payment
