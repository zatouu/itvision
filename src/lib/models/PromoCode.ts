import mongoose, { Schema, model, models, Document } from 'mongoose'

export interface IPromoCode extends Document {
  code: string
  description?: string
  discountPercent?: number
  discountAmount?: number
  minOrderAmount: number
  maxDiscountAmount?: number
  maxUses: number
  usedCount: number
  validFrom?: Date
  validUntil?: Date
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const PromoCodeSchema = new Schema<IPromoCode>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  discountPercent: { type: Number, min: 0, max: 100 },
  discountAmount: { type: Number, min: 0 },
  minOrderAmount: { type: Number, default: 0, min: 0 },
  maxDiscountAmount: { type: Number, min: 0 },
  maxUses: { type: Number, default: Infinity },
  usedCount: { type: Number, default: 0, min: 0 },
  validFrom: { type: Date },
  validUntil: { type: Date },
  active: { type: Boolean, default: true },
}, { timestamps: true })

PromoCodeSchema.index({ code: 1 })
PromoCodeSchema.index({ active: 1, validFrom: 1, validUntil: 1 })

export default models.PromoCode || model<IPromoCode>('PromoCode', PromoCodeSchema)
