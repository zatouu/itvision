import mongoose, { Schema, model, models } from 'mongoose'

export type OfferStatus = 'submitted' | 'withdrawn' | 'accepted' | 'rejected' | 'expired'

const OfferSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  providerId: { type: String, required: true },
  providerName: { type: String },
  price: { type: Number, required: true, min: 0 },
  etaMinutes: { type: Number, min: 0 },
  comment: { type: String },
  validityMinutes: { type: Number, min: 1, max: 1440, default: 30 }, // durée validité offre (1min..24h)
  validUntil: { type: Date, required: true }, // calculé à la création
  status: { type: String, enum: ['submitted','withdrawn','accepted','rejected','expired'], default: 'submitted' },
  // Contre-offre client (négociation InDriver-like)
  clientCounterPrice: { type: Number, min: 0 },
  clientCounterAt: { type: Date },
  clientCounterComment: { type: String },
  clientCounterStatus: { type: String, enum: ['pending','accepted','rejected'] },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

OfferSchema.index({ requestId: 1, createdAt: -1 })
OfferSchema.index({ providerId: 1, createdAt: -1 })

const Offer = models.Offer || model('Offer', OfferSchema)
export default Offer
