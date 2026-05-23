import mongoose, { Schema, model, models } from 'mongoose'

export type ServiceRequestStatus = 'created' | 'pending_offers' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

const MediaSchema = new Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video', 'audio', 'file'], default: 'image' },
  title: { type: String },
}, { _id: false })

const GeoPointSchema = new Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], required: true }, // [lng, lat]
  address: { type: String },
}, { _id: false })

const ServiceRequestSchema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  description: { type: String },
  media: { type: [MediaSchema], default: [] },
  location: { type: GeoPointSchema, required: true },
  budget: { type: Number, min: 0 },
  channel: { type: String, enum: ['web', 'pwa', 'whatsapp', 'callcenter'], default: 'web' },
  status: { type: String, enum: ['created','pending_offers','assigned','in_progress','completed','cancelled'], default: 'created' },
  assignedProviderId: { type: Schema.Types.ObjectId, ref: 'User' },
  selectedOfferId: { type: Schema.Types.ObjectId, ref: 'Offer' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })

ServiceRequestSchema.index({ 'location': '2dsphere' })
ServiceRequestSchema.index({ status: 1, createdAt: -1 })

const ServiceRequest = models.ServiceRequest || model('ServiceRequest', ServiceRequestSchema)
export default ServiceRequest
