import mongoose, { Schema, Document } from 'mongoose'

export interface ILocalizedString {
  fr: string
  en?: string
  ar?: string
  wo?: string
  [lang: string]: string | undefined
}

export interface ILocalizedKeywords {
  fr: string[]
  en?: string[]
  ar?: string[]
  wo?: string[]
  [lang: string]: string[] | undefined
}

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
  // Taxonomy v2 fields
  taxonomyId?: string
  level: number
  isLeaf: boolean
  image?: string
  seoTitle?: ILocalizedString
  seoDescription?: ILocalizedString
  keywords?: ILocalizedKeywords
  synonyms?: Partial<ILocalizedKeywords>
  typos?: string[]
  closeCategories?: string[]
  allowedUnits: string[]
  requiredAttributes: string[]
  optionalAttributes: string[]
  searchFilters: string[]
  supportsWholesale: boolean
  supportsDropshipping: boolean
  supportsGroupBuying: boolean
  commissionRate: number
  createdAt: Date
  updatedAt: Date
}

const LocalizedStringSchema = new Schema<ILocalizedString>({
  fr: { type: String, required: true },
  en: { type: String },
  ar: { type: String },
  wo: { type: String },
}, { _id: false })

const LocalizedKeywordsSchema = new Schema<ILocalizedKeywords>({
  fr: { type: [String], required: true },
  en: { type: [String] },
  ar: { type: [String] },
  wo: { type: [String] },
}, { _id: false })

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
  isActive: { type: Boolean, default: true },
  // Taxonomy v2 fields
  taxonomyId: { type: String, index: true },
  level: { type: Number, default: 1, index: true },
  isLeaf: { type: Boolean, default: false, index: true },
  image: { type: String },
  seoTitle: { type: LocalizedStringSchema },
  seoDescription: { type: LocalizedStringSchema },
  keywords: { type: LocalizedKeywordsSchema },
  synonyms: { type: LocalizedKeywordsSchema },
  typos: { type: [String], default: [] },
  closeCategories: { type: [String], default: [] },
  allowedUnits: { type: [String], default: ['piece'] },
  requiredAttributes: { type: [String], default: [] },
  optionalAttributes: { type: [String], default: [] },
  searchFilters: { type: [String], default: [] },
  supportsWholesale: { type: Boolean, default: true },
  supportsDropshipping: { type: Boolean, default: true },
  supportsGroupBuying: { type: Boolean, default: true },
  commissionRate: { type: Number, default: 0.08 }
}, { timestamps: true })

ProductCategorySchema.index({ isActive: 1, order: 1, name: 1 })
ProductCategorySchema.index({ isActive: 1, order: 1 })
ProductCategorySchema.index({ isActive: 1, parentSlug: 1 })
ProductCategorySchema.index({ isActive: 1, level: 1 })

export default mongoose.models.ProductCategory || mongoose.model<IProductCategory>('ProductCategory', ProductCategorySchema)
