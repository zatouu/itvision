import mongoose, { Schema, model, models } from 'mongoose'

export const DISPUTE_EVIDENCE_TYPES = ['image', 'video', 'audio', 'file'] as const
export type DisputeEvidenceType = typeof DISPUTE_EVIDENCE_TYPES[number]

const DisputeEvidenceSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  uploadedBy: { type: String, required: true },
  uploadedByRole: { type: String, enum: ['client', 'provider', 'admin'], required: true },
  type: { type: String, enum: DISPUTE_EVIDENCE_TYPES, required: true },
  url: { type: String, required: true },
  title: { type: String },
  description: { type: String, maxlength: 1000 },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
})

DisputeEvidenceSchema.index({ requestId: 1, createdAt: -1 })

const DisputeEvidence = models.DisputeEvidence || model('DisputeEvidence', DisputeEvidenceSchema)
export default DisputeEvidence
