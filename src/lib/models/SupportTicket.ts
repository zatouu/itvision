import mongoose, { Schema, Document } from 'mongoose'

export interface ISupportTicket extends Document {
  userId?: mongoose.Types.ObjectId
  orderId?: string
  subject: string
  message: string
  phone?: string
  email?: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
  updatedAt: Date
}

const SupportTicketSchema = new Schema<ISupportTicket>({
  userId: { type: Schema.Types.ObjectId, sparse: true, index: true },
  orderId: { type: String, sparse: true, index: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true })

export default mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema)
