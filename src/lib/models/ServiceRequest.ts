import mongoose, { Schema, model, models } from 'mongoose'

export type ServiceRequestStatus = 'created' | 'broadcasted' | 'pending_offers' | 'accepted' | 'assigned' | 'on_the_way' | 'provider_arriving' | 'arrived' | 'in_progress' | 'paused' | 'awaiting_validation' | 'completed' | 'cancelled' | 'expired' | 'dispute' | 'archived'

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

const PauseLogSchema = new Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  pausedBy: { type: String, enum: ['client', 'provider', 'admin', 'system'], required: true },
  pausedById: { type: String, required: true },
  reason: { type: String, required: true },
  comment: { type: String, maxlength: 1000 },
  estimatedResumeAt: { type: Date },
}, { _id: true })

const ServiceRequestSchema = new Schema({
  clientId: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String },
  description: { type: String },
  media: { type: [MediaSchema], default: [] },
  location: { type: GeoPointSchema, required: true },
  budget: { type: Number, min: 0 },
  channel: { type: String, enum: ['web', 'pwa', 'mobile', 'whatsapp', 'callcenter'], default: 'web' },
  attributes: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: [
    'created',
    'broadcasted',
    'pending_offers',
    'accepted',
    'assigned',
    'on_the_way',
    'provider_arriving',
    'arrived',
    'in_progress',
    'paused',
    'awaiting_validation',
    'completed',
    'cancelled',
    'expired',
    'dispute',
    'archived'
  ], default: 'created' },
  assignedProviderId: { type: Schema.Types.ObjectId, ref: 'User' },
  selectedOfferId: { type: Schema.Types.ObjectId, ref: 'Offer' },
  assignedAt: { type: Date },
  providerArrivingAt: { type: Date },
  arrivedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  validatedByClientAt: { type: Date },
  providerCompletedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelledBy: { type: String, enum: ['client', 'provider', 'admin', 'system'] },
  cancelReason: { type: String, maxlength: 500 },
  // Durée de validité d'une demande (par défaut 24h après création)
  expiresAt: { type: Date },
  expiredAt: { type: Date },
  broadcastedAt: { type: Date },
  archivedAt: { type: Date },
  archivedReason: { type: String },
  disputeOpenedAt: { type: Date },
  disputeReason: { type: String },
  disputeStatus: { type: String, enum: ['open', 'under_review', 'resolved', 'closed'] },
  disputeDecision: { type: String, enum: ['release_escrow', 'refund', 'partial_refund', 'reject', 'cancel', 'other'] },
  disputeRefundAmount: { type: Number, min: 0 },
  disputeAdminId: { type: String },
  disputeAdminNote: { type: String, maxlength: 2000 },
  disputeResolvedAt: { type: Date },
  escrowLocked: { type: Boolean, default: false },
  escrowLockedAt: { type: Date },
  escrowLockedBy: { type: String },
  pausedFromStatus: { type: String },
  anomalyFlags: { type: [String], default: [] },
  anomalyScore: { type: Number, default: 0 },
  pauseLog: { type: [PauseLogSchema], default: [] },
  // Quand le client a consulté ses offres pour cette demande (déduplique les badges)
  clientOffersReadAt: { type: Date },
  lastActivityAt: { type: Date, default: Date.now },
  lastActivityType: { type: String },
  lastActivityBy: { type: String },
  inactivityReminderCount: { type: Number, default: 0 },
  inactivityReminderAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })

ServiceRequestSchema.index({ 'location': '2dsphere' })
ServiceRequestSchema.index({ status: 1, createdAt: -1 })
ServiceRequestSchema.index({ status: 1, expiresAt: 1 })
ServiceRequestSchema.index({ clientId: 1, status: 1, createdAt: -1 })
ServiceRequestSchema.index({ status: 1, category: 1, expiresAt: 1 })
ServiceRequestSchema.index({ status: 1, lastActivityAt: 1 })

// overwriteModels: true — server.js registers a minimal ServiceRequest schema first
// (for Socket.IO location queries). This ensures the full schema with all indexes
// (2dsphere, status, expiresAt, clientId, etc.) replaces it when this module loads.
const ServiceRequest = model('ServiceRequest', ServiceRequestSchema, undefined, { overwriteModels: true })
export default ServiceRequest
