import mongoose, { Schema, Document } from 'mongoose'

export interface IIntervention extends Document {
  title: string
  description?: string
  client: {
    name: string
    address: string
    phone?: string
    zone?: string
  }
  service: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedDuration: number
  requiredSkills: string[]
  scheduledDate?: string
  scheduledTime?: string
  assignedTechnician?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

const InterventionSchema = new Schema<IIntervention>({
  title: { type: String, required: true },
  description: { type: String },
  client: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: String,
    zone: String
  },
  service: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  estimatedDuration: { type: Number, default: 2 },
  requiredSkills: [{ type: String }],
  scheduledDate: String,
  scheduledTime: String,
  assignedTechnician: { type: Schema.Types.ObjectId, ref: 'Technician' },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  status: { type: String, enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'], default: 'pending', index: true }
}, { timestamps: true })

InterventionSchema.index({ 'client.zone': 1 })
InterventionSchema.index({ service: 1 })
InterventionSchema.index({ scheduledDate: 1 })

export default mongoose.models.Intervention || mongoose.model<IIntervention>('Intervention', InterventionSchema)


