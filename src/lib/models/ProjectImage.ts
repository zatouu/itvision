import mongoose, { Schema, Document } from 'mongoose'

export interface IProjectImage extends Document {
  projectId: mongoose.Types.ObjectId
  filename: string
  url: string
  title?: string
  description?: string
  isMain: boolean
  order: number
  clientVisible?: boolean
  createdAt: Date
}

const ProjectImageSchema = new Schema<IProjectImage>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String },
  description: { type: String },
  isMain: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  // Affichée sur le portail du client (les photos peuvent aussi servir à la vitrine, d'où le choix explicite)
  clientVisible: { type: Boolean, default: false }
}, { timestamps: { createdAt: true, updatedAt: false } })

ProjectImageSchema.index({ projectId: 1, order: 1 })

export default mongoose.models.ProjectImage || mongoose.model<IProjectImage>('ProjectImage', ProjectImageSchema)
