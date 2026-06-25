import mongoose, { Schema, Document } from 'mongoose'

export interface IShop extends Document {
  name: string
  slug: string
  description?: string
  logo?: string
  coverImage?: string
  ownerId?: string
  ownerEmail?: string
  ownerPhone?: string
  status: 'active' | 'inactive' | 'suspended'
  isVerified: boolean
  commissionRate?: number
  categories?: string[]
  socialLinks?: {
    whatsapp?: string
    instagram?: string
    facebook?: string
    website?: string
  }
  address?: string
  city?: string
  country?: string
  createdAt: Date
  updatedAt: Date
}

const ShopSchema = new Schema<IShop>({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String },
  logo: { type: String },
  coverImage: { type: String },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  ownerEmail: { type: String },
  ownerPhone: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active', index: true },
  isVerified: { type: Boolean, default: false },
  commissionRate: { type: Number, default: 10 },
  categories: { type: [String], default: [] },
  socialLinks: {
    whatsapp: { type: String },
    instagram: { type: String },
    facebook: { type: String },
    website: { type: String }
  },
  address: { type: String },
  city: { type: String },
  country: { type: String, default: 'Sénégal' }
}, { timestamps: true })

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

ShopSchema.pre('save', async function (next) {
  if (this.isModified('name') || !this.slug) {
    const base = slugify(this.name)
    let slug = base
    let counter = 1
    while (await mongoose.models.Shop.findOne({ slug, _id: { $ne: this._id } }).lean()) {
      slug = `${base}-${counter++}`
    }
    this.slug = slug
  }
  next()
})

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', ShopSchema)
