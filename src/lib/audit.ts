import AuditLog from '@/lib/models/AuditLog'
import mongoose from 'mongoose'

interface AuditOptions {
  entityType: 'Intervention' | 'MaintenanceReport' | 'MaintenanceContract' | 'Technician' | 'User'
  entityId: string | mongoose.Types.ObjectId
  action: string
  previousState?: Record<string, any>
  newState?: Record<string, any>
  changedFields?: string[]
  userId?: string | mongoose.Types.ObjectId
  userRole?: string
  ip?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export async function logAuditEvent(opts: AuditOptions) {
  try {
    const changedFields = opts.previousState && opts.newState
      ? Object.keys(opts.newState).filter(
          key => JSON.stringify(opts.previousState![key]) !== JSON.stringify(opts.newState![key])
        )
      : undefined

    await AuditLog.create({
      entityType: opts.entityType,
      entityId: typeof opts.entityId === 'string' ? new mongoose.Types.ObjectId(opts.entityId) : opts.entityId,
      action: opts.action,
      previousState: opts.previousState,
      newState: opts.newState,
      changedFields,
      userId: opts.userId ? (typeof opts.userId === 'string' ? new mongoose.Types.ObjectId(opts.userId) : opts.userId) : undefined,
      userRole: opts.userRole,
      ip: opts.ip,
      userAgent: opts.userAgent,
      metadata: opts.metadata
    })
  } catch (err) {
    console.error('[Audit] Failed to log event:', err)
  }
}

export async function getAuditTrail(
  entityType: string,
  entityId: string,
  limit = 50
) {
  return AuditLog.find({ entityType, entityId: new mongoose.Types.ObjectId(entityId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}
