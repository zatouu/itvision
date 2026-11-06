import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  userId?: mongoose.Types.ObjectId
  ticketId?: mongoose.Types.ObjectId
  channel: 'email' | 'sms' | 'whatsapp' | 'console'
  type: 'sla_warning' | 'sla_breached' | 'ticket_update'
  message: string
  meta?: Record<string, any>
  status: 'pending' | 'sent'
  createdAt: Date
  sentAt?: Date
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket' },
  channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'console'], default: 'console' },
  type: { type: String, enum: ['sla_warning', 'sla_breached', 'ticket_update'], required: true },
  message: { type: String, required: true },
  meta: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'sent'], default: 'pending' },
  sentAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: true } })

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)
