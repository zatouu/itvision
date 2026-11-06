import mongoose, { Schema, model, models } from 'mongoose'

const ChatMessageSchema = new Schema({
  requestId: { type: Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  senderId: { type: String, required: true },
  senderRole: { type: String, enum: ['client', 'provider'], required: true },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } })

ChatMessageSchema.index({ requestId: 1, createdAt: 1 })

const ChatMessage = models.ChatMessage || model('ChatMessage', ChatMessageSchema)
export default ChatMessage
