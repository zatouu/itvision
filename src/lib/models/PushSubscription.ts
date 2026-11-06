import mongoose, { Document, Schema } from 'mongoose'

export interface IPushSubscription extends Document {
  endpoint: string
  p256dh: string
  auth: string
  userId?: string
  orderId?: string
  clientPhone?: string
  createdAt: Date
  updatedAt: Date
}

const PushSubscriptionSchema = new Schema<IPushSubscription>({
  endpoint: { type: String, required: true, unique: true, index: true },
  p256dh: { type: String, required: true },
  auth: { type: String, required: true },
  userId: { type: String, sparse: true },
  orderId: { type: String, index: true, sparse: true },
  clientPhone: { type: String },
}, { timestamps: true })

PushSubscriptionSchema.index({ userId: 1, updatedAt: -1 })

const PushSubscription = mongoose.models.PushSubscription || mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)

export default PushSubscription
