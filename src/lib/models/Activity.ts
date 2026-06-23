import mongoose, { Schema, Document } from 'mongoose'

export type ActivityType =
  | 'order_placed'
  | 'order_delivered'
  | 'order_shipped'
  | 'group_joined'
  | 'group_created'
  | 'group_complete'
  | 'wallet_credit'
  | 'favorite_added'
  | 'grains_earned'
  | 'reward_redeemed'
  | 'referral_signup'
  | 'referral_first_order'
  | 'review_posted'

export interface IActivity extends Document {
  userId: mongoose.Types.ObjectId
  type: ActivityType
  description: string
  amount?: number
  unit?: 'FCFA' | 'grains'
  metadata: {
    orderId?: string
    groupId?: string
    productId?: string
    productImage?: string
    rewardId?: string
    referralCode?: string
  }
  createdAt: Date
  updatedAt: Date
}

const ActivitySchema = new Schema<IActivity>({
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  type: {
    type: String,
    enum: [
      'order_placed', 'order_delivered', 'order_shipped',
      'group_joined', 'group_created', 'group_complete',
      'wallet_credit', 'favorite_added', 'grains_earned',
      'reward_redeemed', 'referral_signup', 'referral_first_order', 'review_posted',
    ],
    required: true,
  },
  description: { type: String, required: true },
  amount: { type: Number },
  unit: { type: String, enum: ['FCFA', 'grains'] },
  metadata: {
    orderId: { type: String },
    groupId: { type: String },
    productId: { type: String },
    productImage: { type: String },
    rewardId: { type: String },
    referralCode: { type: String },
  },
}, { timestamps: true })

ActivitySchema.index({ userId: 1, createdAt: -1 })

export default (mongoose.models.Activity as mongoose.Model<IActivity>) ||
  mongoose.model<IActivity>('Activity', ActivitySchema)
