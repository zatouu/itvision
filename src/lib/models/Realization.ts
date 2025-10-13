import mongoose, { Schema, Document } from 'mongoose'

export interface IRealization extends Document {
  title: string
  location: string
  description: string
  services: string[]
  mainImage: string
  images: string[]
  featured: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

const RealizationSchema = new Schema<IRealization>({
  title: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  services: [{ type: String }],
  mainImage: { type: String, required: true },
  images: [{ type: String }],
  featured: { type: Boolean, default: false, index: true },
  order: { type: Number, default: 0, index: true }
}, { timestamps: true })

RealizationSchema.index({ featured: -1, order: 1, createdAt: -1 })

export default mongoose.models.Realization || mongoose.model<IRealization>('Realization', RealizationSchema)
