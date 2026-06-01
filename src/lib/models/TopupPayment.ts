import mongoose, { Schema, model, Document } from 'mongoose'

export interface ITopupPayment extends Document {
  userId: string
  points: number
  amountFcfa: number
  provider: 'wave' | 'orange_money' | 'free_money'
  status: 'pending' | 'successful' | 'failed'
  externalId?: string
  checkoutUrl?: string
  phone: string
  createdAt: Date
  completedAt?: Date
  failReason?: string
}

const TopupPaymentSchema = new Schema<ITopupPayment>({
  userId: { type: String, required: true, index: true },
  points: { type: Number, required: true, min: 1 },
  amountFcfa: { type: Number, required: true, min: 100 },
  provider: { type: String, enum: ['wave', 'orange_money', 'free_money'], required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'pending' },
  externalId: { type: String },
  checkoutUrl: { type: String },
  phone: { type: String, required: true },
  completedAt: { type: Date },
  failReason: { type: String },
}, { timestamps: true })

TopupPaymentSchema.index({ externalId: 1 }, { sparse: true })

const TopupPayment = (models.TopupPayment as mongoose.Model<ITopupPayment>) || model<ITopupPayment>('TopupPayment', TopupPaymentSchema)
export default TopupPayment
