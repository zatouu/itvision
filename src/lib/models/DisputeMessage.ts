import mongoose, { Schema, model, models } from 'mongoose'

const DisputeMessageSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true, index: true },
  senderId: { type: String, required: true },
  senderRole: { type: String, enum: ['client', 'provider', 'admin'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false },
})

DisputeMessageSchema.index({ requestId: 1, createdAt: 1 })

const DisputeMessage = models.DisputeMessage || model('DisputeMessage', DisputeMessageSchema)
export default DisputeMessage
