import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  name: string
  category?: string
  description?: string
  tagline?: string
  price?: number
  baseCost?: number
  marginRate?: number
  currency?: string
  image?: string
  gallery?: string[]
  features?: string[]
  requiresQuote?: boolean
  deliveryDays?: number
  stockStatus?: 'in_stock' | 'preorder'
  stockQuantity?: number
  leadTimeDays?: number
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  packagingWeightKg?: number
  colorOptions?: string[]
  variantOptions?: string[]
  availabilityNote?: string
  isPublished?: boolean
  isFeatured?: boolean
  sourcing?: {
    platform?: string
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  // Informations 1688
  price1688?: number // Prix en Yuan (¥)
  price1688Currency?: string // Devise 1688 (par défaut 'CNY')
  exchangeRate?: number // Taux de change (par défaut 1 ¥ = 100 FCFA)
  serviceFeeRate?: number // Frais de service (5%, 10%, 15%)
  insuranceRate?: number // Frais d'assurance (en %)
  shippingOverrides?: Array<{
    methodId: string
    ratePerKg?: number
    ratePerM3?: number
    flatFee?: number
  }>
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  category: { type: String, index: true },
  description: { type: String },
  tagline: { type: String },
  price: { type: Number },
  baseCost: { type: Number },
  marginRate: { type: Number, default: 25 },
  currency: { type: String, default: 'Fcfa' },
  image: { type: String },
  gallery: { type: [String], default: [] },
  features: { type: [String], default: [] },
  requiresQuote: { type: Boolean, default: false },
  deliveryDays: { type: Number, default: 0 },
  stockStatus: { type: String, enum: ['in_stock', 'preorder'], default: 'preorder' },
  stockQuantity: { type: Number, default: 0 },
  leadTimeDays: { type: Number, default: 15 },
  weightKg: { type: Number },
  lengthCm: { type: Number },
  widthCm: { type: Number },
  heightCm: { type: Number },
  volumeM3: { type: Number },
  packagingWeightKg: { type: Number },
  colorOptions: { type: [String], default: [] },
  variantOptions: { type: [String], default: [] },
  availabilityNote: { type: String },
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  sourcing: {
    platform: { type: String },
    supplierName: { type: String },
    supplierContact: { type: String },
    productUrl: { type: String },
    notes: { type: String }
  },
  // Informations 1688
  price1688: { type: Number },
  price1688Currency: { type: String, default: 'CNY' },
  exchangeRate: { type: Number, default: 100 }, // 1 ¥ = 100 FCFA
  serviceFeeRate: { type: Number }, // 5, 10, ou 15
  insuranceRate: { type: Number }, // Pourcentage d'assurance
  shippingOverrides: {
    type: [new Schema({
      methodId: { type: String, required: true },
      ratePerKg: { type: Number },
      ratePerM3: { type: Number },
      flatFee: { type: Number }
    }, { _id: false })],
    default: []
  }
}, { timestamps: true })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)


