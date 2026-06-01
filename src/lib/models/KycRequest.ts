import { Schema, model, models } from 'mongoose'

export type KycStatus = 'pending' | 'approved' | 'rejected'

const KycRequestSchema = new Schema({
  providerId: { type: String, required: true, unique: true },
  idCardFrontUrl: { type: String, required: true },
  idCardBackUrl: { type: String },
  selfieUrl: { type: String, required: true },
  trade: { type: String, required: true },
  fullName: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true })

KycRequestSchema.index({ providerId: 1 })
KycRequestSchema.index({ status: 1, createdAt: -1 })

const KycRequest = models.KycRequest || model('KycRequest', KycRequestSchema)
export default KycRequest
