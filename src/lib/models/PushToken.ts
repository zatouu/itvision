import mongoose, { Schema, Document } from 'mongoose'

export interface IPushToken extends Document {
  userId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  createdAt: Date
  updatedAt: Date
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
  },
  { timestamps: true }
)

// Un user peut avoir plusieurs tokens (plusieurs appareils)
PushTokenSchema.index({ userId: 1, token: 1 }, { unique: true })

export default mongoose.models.PushToken || mongoose.model<IPushToken>('PushToken', PushTokenSchema)
