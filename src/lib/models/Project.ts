import mongoose, { Schema, Document } from 'mongoose'

export interface IProject extends Document {
  name: string
  description?: string
  address: string
  clientId: mongoose.Types.ObjectId
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
  startDate: Date
  endDate?: Date | null
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String },
  address: { type: String, required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD'], default: 'ACTIVE', index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
}, { timestamps: true })

ProjectSchema.index({ clientId: 1, createdAt: -1 })

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)
