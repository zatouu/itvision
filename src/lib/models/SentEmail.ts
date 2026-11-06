import mongoose, { Schema, Document } from 'mongoose'

export interface ISentEmail extends Document {
  to: string[]
  cc?: string
  bcc?: string
  from: string
  subject: string
  html?: string
  text?: string
  status: 'sent' | 'failed' | 'simulated'
  messageId?: string
  error?: string
  sentAt?: Date
  createdAt: Date
}

const SentEmailSchema = new Schema<ISentEmail>({
  to: { type: [String], required: true },
  cc: { type: String },
  bcc: { type: String },
  from: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String },
  text: { type: String },
  status: { type: String, enum: ['sent', 'failed', 'simulated'], default: 'sent' },
  messageId: { type: String },
  error: { type: String },
  sentAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: true } })

SentEmailSchema.index({ createdAt: -1 })
SentEmailSchema.index({ status: 1 })
SentEmailSchema.index({ to: 1 })
SentEmailSchema.index({ subject: 'text' })

export default mongoose.models.SentEmail || mongoose.model<ISentEmail>('SentEmail', SentEmailSchema)
