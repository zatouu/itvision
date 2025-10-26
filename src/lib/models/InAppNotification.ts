import mongoose, { Schema, Document } from 'mongoose'

export type InAppType = 'info' | 'success' | 'warning' | 'error'
export type AppRole = 'ADMIN' | 'TECHNICIAN' | 'CLIENT'

export interface IInAppNotification extends Document {
  userId?: string
  roles?: AppRole[]
  teamId?: string
  type: InAppType
  title: string
  message: string
  actionUrl?: string
  metadata?: Record<string, any>
  readBy: string[]
  deletedBy: string[]
  createdAt: Date
  updatedAt: Date
}

const InAppNotificationSchema = new Schema<IInAppNotification>({
  userId: { type: String },
  roles: { type: [String], enum: ['ADMIN', 'TECHNICIAN', 'CLIENT'], default: undefined },
  teamId: { type: String },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  actionUrl: { type: String },
  metadata: { type: Schema.Types.Mixed },
  readBy: { type: [String], default: [] },
  deletedBy: { type: [String], default: [] },
}, { timestamps: true })

InAppNotificationSchema.index({ createdAt: -1 })

export default mongoose.models.InAppNotification || mongoose.model<IInAppNotification>('InAppNotification', InAppNotificationSchema)

