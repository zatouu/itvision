import mongoose, { Schema, Document } from 'mongoose'

export interface IPushToken extends Document {
  userId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  appType: 'consumer' | 'provider'
  createdAt: Date
  updatedAt: Date
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: String, required: true, },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
    appType: { type: String, enum: ['consumer', 'provider'], default: 'consumer' },
  },
  { timestamps: true }
)

// Un user peut avoir plusieurs tokens (plusieurs appareils)
PushTokenSchema.index({ userId: 1, token: 1 }, { unique: true })

export default mongoose.models.PushToken || mongoose.model<IPushToken>('PushToken', PushTokenSchema)
