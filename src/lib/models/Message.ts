import mongoose, { Schema, Document } from 'mongoose'

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  senderRole: string
  text: string
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderRole: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
)

MessageSchema.index({ conversationId: 1, createdAt: -1 })

export const Message =
  (mongoose.models.Message as mongoose.Model<IMessage>) || mongoose.model<IMessage>('Message', MessageSchema)
