import mongoose, { Schema, model, models } from 'mongoose'

const ServiceReviewSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  reviewerId: { type: String, required: true }, // clientId
  providerId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  tags: { type: [String], default: [] }, // ex: ['ponctuel', 'propre', 'pro']
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

// Un seul avis par mission
ServiceReviewSchema.index({ requestId: 1, reviewerId: 1 }, { unique: true })
ServiceReviewSchema.index({ providerId: 1, createdAt: -1 })

const ServiceReview = models.ServiceReview || model('ServiceReview', ServiceReviewSchema)
export default ServiceReview
