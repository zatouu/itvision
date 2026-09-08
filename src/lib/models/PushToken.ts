import mongoose, { Schema, Document } from 'mongoose'

export interface IPushToken extends Document {
  userId: string
  token: string
  platform: 'ios' | 'android' | 'web'
  /** 'unified' = app fusionnée client+provider : reçoit les push des deux audiences */
  appType: 'consumer' | 'provider' | 'unified'
  createdAt: Date
  updatedAt: Date
}

const PushTokenSchema = new Schema<IPushToken>(
  {
    userId: { type: String, required: true, },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
    appType: { type: String, enum: ['consumer', 'provider', 'unified'], default: 'consumer' },
  },
  { timestamps: true }
)

// Un user peut avoir plusieurs tokens (plusieurs appareils)
PushTokenSchema.index({ userId: 1, token: 1 }, { unique: true })

export default mongoose.models.PushToken || mongoose.model<IPushToken>('PushToken', PushTokenSchema)
