import mongoose, { Schema, model, models } from 'mongoose'

export type OfferStatus = 'submitted' | 'withdrawn' | 'accepted' | 'rejected'

const OfferSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  providerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  price: { type: Number, required: true, min: 0 },
  etaMinutes: { type: Number, min: 0 },
  comment: { type: String },
  status: { type: String, enum: ['submitted','withdrawn','accepted','rejected'], default: 'submitted' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

OfferSchema.index({ requestId: 1, createdAt: -1 })
OfferSchema.index({ providerId: 1, createdAt: -1 })

const Offer = models.Offer || model('Offer', OfferSchema)
export default Offer
