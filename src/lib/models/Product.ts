import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  category?: string
  description?: string
  price?: number
  currency?: string
  image?: string
  requiresQuote?: boolean
  deliveryDays?: number
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  category: { type: String, index: true },
  description: { type: String },
  price: { type: Number },
  currency: { type: String, default: 'Fcfa' },
  image: { type: String },
  requiresQuote: { type: Boolean, default: false },
  deliveryDays: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)


