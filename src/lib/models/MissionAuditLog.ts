import mongoose, { Schema, model, models } from 'mongoose'

export const MISSION_AUDIT_ACTIONS = [
  'status_changed', 'pause', 'resume', 'dispute_opened', 'dispute_resolved',
  'payment_released', 'payment_refunded', 'payment_held', 'payment_failed',
  'offer_accepted', 'offer_submitted', 'chat_message', 'inactivity_reminder',
  'archived', 'expired', 'anomaly_detected',
] as const

export type MissionAuditAction = typeof MISSION_AUDIT_ACTIONS[number]

const MissionAuditLogSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, },
  actorId: { type: String, index: true },
  actorRole: { type: String, enum: ['client', 'provider', 'admin', 'system'], index: true },
  action: { type: String, enum: MISSION_AUDIT_ACTIONS, required: true },
  fromStatus: { type: String },
  toStatus: { type: String },
  reason: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} },
  ip: { type: String },
  userAgent: { type: String },
  platform: { type: String },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
})

MissionAuditLogSchema.index({ requestId: 1, createdAt: -1 })
MissionAuditLogSchema.index({ action: 1, createdAt: -1 })

const MissionAuditLog = models.MissionAuditLog || model('MissionAuditLog', MissionAuditLogSchema)
export default MissionAuditLog
