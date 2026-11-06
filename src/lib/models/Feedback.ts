import mongoose, { Schema, Document } from 'mongoose'

export interface IFeedback extends Document {
  projectId?: string
  technicianId?: string
  clientId?: string
  rating: number // 1..5
  comment?: string
  createdAt: Date
  updatedAt: Date
}

const FeedbackSchema = new Schema<IFeedback>({
  projectId: { type: String, index: true },
  technicianId: { type: String, index: true },
  clientId: { type: String, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true })

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema)
