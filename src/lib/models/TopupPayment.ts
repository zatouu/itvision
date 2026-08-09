import mongoose, { Schema, model, models, Document } from 'mongoose'

export interface ITopupPayment extends Document {
  userId: string
  points: number
  bonusCredits?: number
  amountFcfa: number
  provider: 'wave' | 'orange_money' | 'free_money' | 'wave_qr'
  status: 'pending' | 'successful' | 'failed'
  externalId?: string
  checkoutUrl?: string
  manualConfirm?: boolean
  reference?: string
  phone: string
  createdAt: Date
  completedAt?: Date
  failReason?: string
}

const TopupPaymentSchema = new Schema<ITopupPayment>({
  userId: { type: String, required: true, index: true },
  points: { type: Number, required: true, min: 1 },
  bonusCredits: { type: Number, default: 0 },
  amountFcfa: { type: Number, required: true, min: 100 },
  provider: { type: String, enum: ['wave', 'orange_money', 'free_money', 'wave_qr'], required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  externalId: { type: String },
  checkoutUrl: { type: String },
  manualConfirm: { type: Boolean, default: false },
  reference: { type: String },
  phone: { type: String, required: true },
  completedAt: { type: Date },
  failReason: { type: String },
}, { timestamps: true })

TopupPaymentSchema.index({ externalId: 1 }, { sparse: true })

const TopupPayment = (models.TopupPayment as mongoose.Model<ITopupPayment>) || model<ITopupPayment>('TopupPayment', TopupPaymentSchema)
export default TopupPayment
