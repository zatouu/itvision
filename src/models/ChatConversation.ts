import mongoose, { Schema, Document } from 'mongoose'

export interface IChatConversation extends Document {
  conversationId: string
  type: 'group-buy' | 'ticket' | 'project' | 'direct' | 'maintenance'
  participants: Array<{
    userId: string
    name: string
    avatar?: string
    role?: string
    joinedAt: Date
  }>
  lastMessage?: {
    content: string
    sender: string
    timestamp: Date
  }
  unreadCount: Map<string, number>
  metadata: Record<string, any>
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const ChatConversationSchema = new Schema<IChatConversation>({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  type: {
    type: String,
    enum: ['group-buy', 'ticket', 'project', 'direct', 'maintenance'],
    required: true,
    index: true
  },
  participants: [{
    userId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    role: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  lastMessage: {
    content: String,
    sender: String,
    timestamp: Date
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Index pour recherche rapide
ChatConversationSchema.index({ 'participants.userId': 1, isArchived: 1 })
ChatConversationSchema.index({ type: 1, isArchived: 1 })

export default mongoose.models.ChatConversation || mongoose.model<IChatConversation>('ChatConversation', ChatConversationSchema)
