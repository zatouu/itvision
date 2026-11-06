import mongoose, { Schema, Document } from 'mongoose'

export interface IPromoSlide {
  title: string
  subtitle?: string
  ctaText: string
  ctaLink: string
  bgColor?: string
  accentColor?: string
  textColor?: string
  images?: string[]
  isActive: boolean
  order: number
  startDate?: Date
  endDate?: Date
}

export interface IPromoSlideDoc extends IPromoSlide, Document {}

const PromoSlideSchema = new Schema<IPromoSlideDoc>(
  {
    title: { type: String, required: true },
    subtitle: { type: String },
    ctaText: { type: String, default: 'En savoir plus' },
    ctaLink: { type: String, default: '/produits' },
    bgColor: { type: String, default: 'from-amber-50 via-yellow-50 to-orange-50' },
    accentColor: { type: String, default: 'bg-black' },
    textColor: { type: String, default: 'text-slate-900' },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
)

PromoSlideSchema.index({ isActive: 1, order: 1 })
PromoSlideSchema.index({ startDate: 1, endDate: 1 })

export default mongoose.models.PromoSlide || mongoose.model<IPromoSlideDoc>('PromoSlide', PromoSlideSchema)
