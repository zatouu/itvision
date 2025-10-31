import mongoose, { Schema, Document } from 'mongoose'

export interface IService extends Document {
  name: string
  code: string
  description?: string
  provider?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const ServiceSchema = new Schema<IService>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String },
  provider: { type: String },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true })

ServiceSchema.index({ name: 1 })

export default mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema)


