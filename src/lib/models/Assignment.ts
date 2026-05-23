import mongoose, { Schema, model, models } from 'mongoose'

export type AssignmentStatus = 'accepted' | 'en_route' | 'arrived' | 'started' | 'paused' | 'completed' | 'cancelled'

const AssignmentSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  offerId: { type: Schema.Types.ObjectId, ref: 'Offer', required: true },
  status: { type: String, enum: ['accepted','en_route','arrived','started','paused','completed','cancelled'], default: 'accepted' },
  acceptedAt: { type: Date, default: Date.now },
  updates: { type: [{ at: Date, status: String, note: String }], default: [] }
}, { timestamps: true })

AssignmentSchema.index({ requestId: 1, providerId: 1 })

const Assignment = models.Assignment || model('Assignment', AssignmentSchema)
export default Assignment
