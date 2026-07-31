import mongoose, { Document, Schema } from 'mongoose'

export interface IProductQuestion extends Document {
  productId: string
  question: string
  askedByName: string
  askedByEmail?: string
  askedByUserId?: string
  answer?: string
  answeredBy?: string
  answeredByRole?: string
  answeredAt?: Date
  status: 'pending' | 'published' | 'rejected'
  helpful: number
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductQuestionSchema = new Schema<IProductQuestion>({
  productId: { type: String, required: true, },
  question: { type: String, required: true, trim: true },
  askedByName: { type: String, required: true, trim: true },
  askedByEmail: { type: String, trim: true },
  askedByUserId: { type: String, index: true },
  answer: { type: String, trim: true },
  answeredBy: { type: String },
  answeredByRole: { type: String },
  answeredAt: { type: Date },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
  helpful: { type: Number, default: 0, min: 0 },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true })

ProductQuestionSchema.index({ productId: 1, status: 1, createdAt: -1 })

const ProductQuestion = mongoose.models.ProductQuestion || mongoose.model<IProductQuestion>('ProductQuestion', ProductQuestionSchema)

export default ProductQuestion
