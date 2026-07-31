import mongoose, { Schema, Document } from 'mongoose'

export interface IGrainsTransaction extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  type: 'earned' | 'spent' | 'expired' | 'bonus'
  source: 'order' | 'group_join' | 'group_complete' | 'referral' | 'review' | 'redemption' | 'admin' | 'birthday' | 'favorite'
  sourceId?: mongoose.Types.ObjectId | string
  description: string
  expiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

const GrainsTransactionSchema = new Schema<IGrainsTransaction>({
  userId: { type: Schema.Types.ObjectId, required: true, },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['earned', 'spent', 'expired', 'bonus'], required: true },
  source: { type: String, enum: ['order', 'group_join', 'group_complete', 'referral', 'review', 'redemption', 'admin', 'birthday', 'favorite'], required: true },
  sourceId: { type: Schema.Types.Mixed },
  description: { type: String, required: true },
  expiresAt: { type: Date },
}, { timestamps: true })

GrainsTransactionSchema.index({ userId: 1, createdAt: -1 })
GrainsTransactionSchema.index({ userId: 1, type: 1 })

const GrainsTransaction = (mongoose.models.GrainsTransaction as mongoose.Model<IGrainsTransaction>) ||
  mongoose.model<IGrainsTransaction>('GrainsTransaction', GrainsTransactionSchema)

export async function getGrainsBalance(userId: mongoose.Types.ObjectId): Promise<number> {
  const result = await GrainsTransaction.aggregate([
    { $match: { userId, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] } },
    { $group: { _id: null, balance: { $sum: '$amount' } } },
  ])
  return result[0]?.balance || 0
}

export default GrainsTransaction
