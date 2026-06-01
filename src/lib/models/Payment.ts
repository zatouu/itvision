import { Schema, model, models } from 'mongoose'

export type PaymentStatus = 'pending' | 'held' | 'released' | 'refunded' | 'failed'
export type PaymentProvider = 'wave' | 'orange_money' | 'free_money'

const PaymentSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  clientId: { type: String, required: true },
  providerId: { type: String, required: true },
  amount: { type: Number, required: true, min: 100 },
  currency: { type: String, default: 'XOF' },
  provider: { type: String, enum: ['wave', 'orange_money', 'free_money'], required: true },
  status: { type: String, enum: ['pending', 'held', 'released', 'refunded', 'failed'], default: 'pending' },
  useEscrow: { type: Boolean, default: true },
  // Provider-specific reference IDs
  externalId: { type: String },
  checkoutUrl: { type: String },
  // Points system
  escrowPointsCharged: { type: Number, default: 0, min: 0 },
  // Timestamps
  heldAt: { type: Date },
  releasedAt: { type: Date },
  refundedAt: { type: Date },
  failedAt: { type: Date },
  failReason: { type: String },
}, { timestamps: true })

PaymentSchema.index({ requestId: 1 })
PaymentSchema.index({ externalId: 1 }, { sparse: true })
PaymentSchema.index({ status: 1, createdAt: -1 })

const Payment = models.Payment || model('Payment', PaymentSchema)
export default Payment
