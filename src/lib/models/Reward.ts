import mongoose, { Schema, Document } from 'mongoose'

export type RewardType = 'discount' | 'free_shipping' | 'gift' | 'group_buy_bonus'

export interface IReward extends Document {
  title: string
  description: string
  icon: string
  cost: number
  type: RewardType
  value: Record<string, any>
  minOrderAmount?: number
  validForDays: number
  active: boolean
  maxPerUser?: number
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}

const RewardSchema = new Schema<IReward>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true, default: '🎁' },
  cost: { type: Number, required: true, min: 0 },
  type: { type: String, enum: ['discount', 'free_shipping', 'gift', 'group_buy_bonus'], required: true },
  value: { type: Schema.Types.Mixed, default: {} },
  minOrderAmount: { type: Number },
  validForDays: { type: Number, required: true, default: 30 },
  active: { type: Boolean, default: true },
  maxPerUser: { type: Number },
  imageUrl: { type: String },
}, { timestamps: true })

export default (mongoose.models.Reward as mongoose.Model<IReward>) ||
  mongoose.model<IReward>('Reward', RewardSchema)
