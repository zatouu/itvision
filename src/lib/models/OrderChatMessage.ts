import mongoose, { Schema, model, models } from 'mongoose'

export type OrderChatSenderRole = 'client' | 'admin' | 'system'

const OrderChatMessageSchema = new Schema({
  orderId: { type: String, required: true, index: true },
  orderReference: { type: String, required: true, index: true },
  senderId: { type: String, sparse: true, index: true },
  senderRole: { type: String, enum: ['client', 'admin', 'system'], required: true },
  senderName: { type: String },
  text: { type: String, required: true, maxlength: 2000 },
  isInternal: { type: Boolean, default: false },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

OrderChatMessageSchema.index({ orderReference: 1, createdAt: 1 })

const OrderChatMessage = models.OrderChatMessage || model('OrderChatMessage', OrderChatMessageSchema)
export default OrderChatMessage
