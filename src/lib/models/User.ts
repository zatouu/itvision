import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  passwordHash: string
  name: string
  avatarUrl?: string
  phone?: string
  favoriteProductIds?: string[]
  role: 'CLIENT' | 'TECHNICIAN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
  loginAttempts: number
  lockedUntil?: Date
  twoFactorEnabled?: boolean
  twoFactorCode?: string
  twoFactorExpires?: Date
  passwordResetToken?: string
  passwordResetExpires?: Date
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
  favoriteProductIds: { type: [String], default: [] },
  role: { type: String, enum: ['CLIENT', 'TECHNICIAN', 'PRODUCT_MANAGER', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN'], default: 'CLIENT', index: true },
  isActive: { type: Boolean, default: true, index: true },
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorCode: { type: String },
  twoFactorExpires: { type: Date },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
}, { timestamps: true })

// Index uniques déjà définis via unique:true dans les champs ci-dessus

export default (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema)
