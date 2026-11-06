import mongoose, { Schema, model, models, Document } from 'mongoose'
import { ActorType } from '../domain/enums'

export interface IDisputeEvidence extends Document {
  disputeId: mongoose.Types.ObjectId
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other'
  url: string
  comment?: string
  uploadedBy: mongoose.Types.ObjectId
  uploadedByType: ActorType
  createdAt: Date
}

const DisputeEvidenceSchema = new Schema<IDisputeEvidence>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'pdf', 'other'],
      required: true,
    },
    url: { type: String, required: true },
    comment: { type: String, maxlength: 1000 },
    uploadedBy: { type: Schema.Types.ObjectId, required: true, index: true },
    uploadedByType: { type: String, enum: Object.values(ActorType), required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
)

DisputeEvidenceSchema.index({ disputeId: 1, createdAt: -1 })

export default (models.DisputeEvidence as mongoose.Model<IDisputeEvidence>) ||
  model<IDisputeEvidence>('DisputeEvidence', DisputeEvidenceSchema)
