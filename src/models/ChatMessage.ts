import mongoose, { Schema, Document } from 'mongoose'

export interface IChatMessage extends Document {
  conversationId: string
  conversationType: 'group-buy' | 'ticket' | 'project' | 'direct' | 'maintenance'
  sender: {
    userId: string
    name: string
    avatar?: string
    role?: string
  }
  content: string
  type: 'text' | 'image' | 'file' | 'system' | 'notification'
  attachments?: Array<{
    url: string
    name: string
    size: number
    mimeType: string
  }>
  metadata?: Record<string, any>
  reactions?: Array<{
    emoji: string
    userId: string
    userName: string
  }>
  mentions?: Array<{
    userId: string
    userName: string
    position: number
  }>
  threadId?: string
  repliesCount?: number
  isEdited?: boolean
  editHistory?: Array<{
    content: string
    editedAt: Date
  }>
  readBy: Array<{
    userId: string
    readAt: Date
  }>
  createdAt: Date
  updatedAt?: Date
}

const ChatMessageSchema = new Schema<IChatMessage>({
  conversationId: { 
    type: String, 
    required: true, 
    index: true 
  },
  conversationType: {
    type: String,
    enum: ['group-buy', 'ticket', 'project', 'direct', 'maintenance'],
    required: true,
    index: true
  },
  sender: {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    avatar: String,
    role: String
  },
  content: { 
    type: String, 
    required: true 
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'notification'],
    default: 'text'
  },
  attachments: [{
    url: String,
    name: String,
    size: Number,
    mimeType: String
  }],
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  reactions: [{
    emoji: String,
    userId: String,
    userName: String
  }],
  mentions: [{
    userId: String,
    userName: String,
    position: Number
  }],
  threadId: String,
  repliesCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  readBy: [{
    userId: String,
    readAt: Date
  }]
}, {
  timestamps: true
})

// Index composé pour optimiser les requêtes
ChatMessageSchema.index({ conversationId: 1, createdAt: -1 })
ChatMessageSchema.index({ 'sender.userId': 1, createdAt: -1 })
ChatMessageSchema.index({ conversationType: 1, conversationId: 1 })
ChatMessageSchema.index({ threadId: 1, createdAt: 1 })  // Pour les threads
ChatMessageSchema.index({ content: 'text' })  // Recherche full-text

export default mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema)
