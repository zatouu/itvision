import mongoose, { Schema, Document } from 'mongoose'

export interface IVendorProfile extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  slug: string
  description?: string
  logo?: string
  banner?: string
  contactEmail?: string
  contactPhone?: string
  verified: boolean
  rating: number
  commissionRate: number
  createdAt: Date
  updatedAt: Date
}

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const VendorProfileSchema = new Schema<IVendorProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, index: true },
  description: { type: String, trim: true },
  logo: { type: String },
  banner: { type: String },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  verified: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  commissionRate: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true })

VendorProfileSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const base = slugify(this.name)
    let slug = base
    let counter = 1
    const existing = (slug: string) => mongoose.models.VendorProfile.findOne({ slug, _id: { $ne: this._id } }).lean()
    while (await existing(slug)) {
      slug = `${base}-${counter++}`
    }
    this.slug = slug
  }
  next()
})

const VendorProfile = mongoose.models.VendorProfile || mongoose.model<IVendorProfile>('VendorProfile', VendorProfileSchema)
export default VendorProfile
