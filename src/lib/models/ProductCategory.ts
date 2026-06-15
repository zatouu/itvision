import mongoose, { Schema, Document } from 'mongoose'

export interface IProductCategory extends Document {
  slug: string
  name: string
  labelFr: string
  labelEn?: string
  labelWo?: string
  icon: string // lucide icon name ou emoji
  color: string // tailwind color class ou hex
  description?: string
  parentSlug?: string // pour sous-catégories
  subCategories: Array<{
    slug: string
    name: string
    labelFr: string
    icon: string
  }>
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductCategorySchema = new Schema<IProductCategory>({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, index: true },
  labelFr: { type: String, required: true },
  labelEn: { type: String },
  labelWo: { type: String },
  icon: { type: String, default: 'tag' },
  color: { type: String, default: '#f97316' },
  description: { type: String },
  parentSlug: { type: String, index: true },
  subCategories: {
    type: [new Schema({
      slug: { type: String, required: true },
      name: { type: String, required: true },
      labelFr: { type: String, required: true },
      icon: { type: String, default: 'tag' }
    }, { _id: false })],
    default: []
  },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

export default mongoose.models.ProductCategory || mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema)
