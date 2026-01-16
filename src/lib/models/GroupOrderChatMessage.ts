import mongoose, { Schema, Document } from 'mongoose'

export type GroupChatAuthorType = 'participant' | 'admin'

export interface IGroupOrderChatMessage extends Document {
  groupId: string
  authorType: GroupChatAuthorType
  authorParticipantId?: string
  authorUserId?: mongoose.Types.ObjectId
  authorName: string
  text: string
  createdAt: Date
  updatedAt: Date
}

const GroupOrderChatMessageSchema = new Schema<IGroupOrderChatMessage>(
  {
    groupId: { type: String, required: true, index: true },
    authorType: { type: String, enum: ['participant', 'admin'], required: true, index: true },
    authorParticipantId: { type: String, index: true },
    authorUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    authorName: { type: String, required: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
)

GroupOrderChatMessageSchema.index({ groupId: 1, createdAt: -1 })

export const GroupOrderChatMessage =
  (mongoose.models.GroupOrderChatMessage as mongoose.Model<IGroupOrderChatMessage>) ||
  mongoose.model<IGroupOrderChatMessage>('GroupOrderChatMessage', GroupOrderChatMessageSchema)
