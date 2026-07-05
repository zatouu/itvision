import mongoose, { Schema, model, models, Document } from 'mongoose'

export type WithdrawalStatus = 'pending' | 'processed' | 'rejected'
export type WithdrawalMethod = 'wave' | 'orange_money' | 'free_money'

export interface IWithdrawalRequest extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  method: WithdrawalMethod
  phone: string
  status: WithdrawalStatus
  processedAt?: Date
  processedBy?: mongoose.Types.ObjectId
  rejectionReason?: string
  createdAt: Date
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1000 },
  method: { type: String, enum: ['wave', 'orange_money', 'free_money'], required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processed', 'rejected'], default: 'pending' },
  processedAt: { type: Date },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

WithdrawalRequestSchema.index({ userId: 1, createdAt: -1 })
WithdrawalRequestSchema.index({ status: 1, createdAt: -1 })

const WithdrawalRequest = (models.WithdrawalRequest as mongoose.Model<IWithdrawalRequest>) ||
  model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema)
export default WithdrawalRequest
