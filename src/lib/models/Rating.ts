import mongoose, { Schema, model, models } from 'mongoose'

const RatingSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  raterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rateeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, min: 1, max: 5, required: true },
  tags: { type: [String], default: [] },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

RatingSchema.index({ rateeId: 1, createdAt: -1 })

const Rating = models.Rating || model('Rating', RatingSchema)
export default Rating
