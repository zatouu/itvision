import mongoose, { Document, Schema } from 'mongoose'

export interface IAuditLog extends Document {
  entityType: 'Intervention' | 'MaintenanceReport' | 'MaintenanceContract' | 'Technician' | 'User'
  entityId: mongoose.Types.ObjectId
  action: string // e.g. 'status_changed', 'created', 'updated', 'deleted', 'validated', 'assigned'
  previousState?: Record<string, any>
  newState?: Record<string, any>
  changedFields?: string[]
  userId?: mongoose.Types.ObjectId
  userRole?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  entityType: {
    type: String,
    required: true,
    enum: ['Intervention', 'MaintenanceReport', 'MaintenanceContract', 'Technician', 'User']
  },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, required: true },
  previousState: { type: Schema.Types.Mixed },
  newState: { type: Schema.Types.Mixed },
  changedFields: [{ type: String }],
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  userRole: { type: String },
  ip: { type: String },
  userAgent: { type: String },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
})

// Index composés pour requêtes fréquentes
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
AuditLogSchema.index({ userId: 1, createdAt: -1 })
AuditLogSchema.index({ action: 1, createdAt: -1 })
AuditLogSchema.index({ createdAt: -1 })

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
