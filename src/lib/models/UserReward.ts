import mongoose, { Schema, Document } from 'mongoose'

export interface IUserReward extends Document {
  userId: mongoose.Types.ObjectId
  rewardId: mongoose.Types.ObjectId
  code: string
  status: 'active' | 'used' | 'expired'
  expiresAt: Date
  usedAt?: Date
  usedOrderId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const UserRewardSchema = new Schema<IUserReward>({
  userId: { type: Schema.Types.ObjectId, required: true, },
  rewardId: { type: Schema.Types.ObjectId, required: true, index: true, ref: 'Reward' },
  code: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['active', 'used', 'expired'], default: 'active' },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
  usedOrderId: { type: Schema.Types.ObjectId },
}, { timestamps: true })

UserRewardSchema.index({ userId: 1, status: 1 })

const UserReward = (mongoose.models.UserReward as mongoose.Model<IUserReward>) ||
  mongoose.model<IUserReward>('UserReward', UserRewardSchema)

export default UserReward
