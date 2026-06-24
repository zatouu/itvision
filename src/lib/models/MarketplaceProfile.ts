import mongoose, { Schema, Document } from 'mongoose'

export type MarketplaceTier = 'standard' | 'pro' | 'reseller' | 'partner'
export type LoyaltyTier = 'Bronze' | 'Argent' | 'Or' | 'Platine'

export interface IMarketplaceProfile extends Document {
  userId: mongoose.Types.ObjectId
  marketplaceTier: MarketplaceTier
  proRequestedAt?: Date
  proValidatedAt?: Date
  totalMarketplacePurchases: number
  marketplaceOrderCount: number
  favoriteProductIds: string[]
  loyaltyTier: LoyaltyTier
  referralCode?: string
  referredBy?: string
  referralBalance: number
  referralCount: number
  createdAt: Date
  updatedAt: Date
}

const MarketplaceProfileSchema = new Schema<IMarketplaceProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: 'User'
  },
  marketplaceTier: {
    type: String,
    enum: ['standard', 'pro', 'reseller', 'partner'],
    default: 'standard',
    index: true
  },
  proRequestedAt: { type: Date },
  proValidatedAt: { type: Date },
  totalMarketplacePurchases: { type: Number, default: 0, min: 0 },
  marketplaceOrderCount: { type: Number, default: 0, min: 0 },
  favoriteProductIds: { type: [String], default: [] },
  loyaltyTier: {
    type: String,
    enum: ['Bronze', 'Argent', 'Or', 'Platine'],
    default: 'Bronze'
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    index: true
  },
  referredBy: { type: String, uppercase: true, trim: true, index: true },
  referralBalance: { type: Number, default: 0, min: 0 },
  referralCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true })

export default (mongoose.models.MarketplaceProfile as mongoose.Model<IMarketplaceProfile>) ||
  mongoose.model<IMarketplaceProfile>('MarketplaceProfile', MarketplaceProfileSchema)
