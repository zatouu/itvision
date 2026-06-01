import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  name: string
  avatarUrl?: string
  phone?: string
  // Profil entreprise (B2B)
  company?: string
  address?: string
  city?: string
  country?: string
  // Liaison optionnelle vers un enregistrement Client (entreprise)
  companyClientId?: mongoose.Types.ObjectId
  favoriteProductIds?: string[]
  role: 'CLIENT' | 'TECHNICIAN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'ADMIN' | 'SUPER_ADMIN'
  marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
  proRequestedAt?: Date
  proValidatedAt?: Date
  totalMarketplacePurchases?: number
  marketplaceOrderCount?: number
  isActive: boolean
  loginAttempts: number
  lockedUntil?: Date
  twoFactorEnabled?: boolean
  twoFactorCode?: string
  twoFactorExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
  forcePasswordReset?: boolean
  kycVerified?: boolean
  referralCode?: string
  referredBy?: string
  referralBalance?: number
  referralCount?: number
  // Provider reliability stats (utilisés pour le ranking et l'affichage côté client)
  providerStats?: {
    completedMissions: number
    cancelledByProvider: number
    cancelledByClient: number
    reliabilityScore: number // 0..100 (100 = jamais annulé, défaut 100)
    lastUpdatedAt?: Date
  }
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  avatarUrl: { type: String },
  phone: { type: String },
  company: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  country: { type: String, trim: true },
  companyClientId: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
  favoriteProductIds: { type: [String], default: [] },
  role: { type: String, enum: ['CLIENT', 'TECHNICIAN', 'PRODUCT_MANAGER', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'], default: 'CLIENT', index: true },
  marketplaceTier: { type: String, enum: ['standard', 'pro', 'reseller', 'partner'], default: 'standard', index: true },
  proRequestedAt: { type: Date },
  proValidatedAt: { type: Date },
  totalMarketplacePurchases: { type: Number, default: 0 },
  marketplaceOrderCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true, index: true },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  forcePasswordReset: { type: Boolean, default: false },
  kycVerified: { type: Boolean, default: false },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  referredBy: { type: String, uppercase: true, trim: true },
  referralBalance: { type: Number, default: 0, min: 0 },
  referralCount: { type: Number, default: 0, min: 0 },
  providerStats: {
    completedMissions: { type: Number, default: 0, min: 0 },
    cancelledByProvider: { type: Number, default: 0, min: 0 },
    cancelledByClient: { type: Number, default: 0, min: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    lastUpdatedAt: { type: Date },
  },
}, { timestamps: true })

UserSchema.index({ referralCode: 1 })
UserSchema.index({ referredBy: 1 })

// Index uniques déjà définis via unique:true dans les champs ci-dessus

export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema)
