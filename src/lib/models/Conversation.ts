import mongoose, { Schema, Document } from 'mongoose'

export type ConversationType = 'direct' | 'group'

export interface IConversation extends Document {
  type: ConversationType
  title?: string
  participants: mongoose.Types.ObjectId[]
  participantKey?: string
  createdBy: mongoose.Types.ObjectId
  lastMessageAt?: Date
  lastMessageText?: string
  lastMessageSenderId?: mongoose.Types.ObjectId
  lastMessageId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ConversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct', 'group'], default: 'direct', index: true },
    title: { type: String },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    // For direct conversations only: sorted participant ids joined by ':'
    participantKey: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lastMessageAt: { type: Date, index: true },
    lastMessageText: { type: String },
    lastMessageSenderId: { type: Schema.Types.ObjectId, ref: 'User' },
    lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' }
  },
  { timestamps: true }
)

ConversationSchema.index({ participants: 1, updatedAt: -1 })
ConversationSchema.index(
  { participantKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { participantKey: { $type: 'string' } } }
)

export const Conversation =
  (mongoose.models.Conversation as mongoose.Model<IConversation>) ||
  mongoose.model<IConversation>('Conversation', ConversationSchema)
