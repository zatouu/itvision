// Types pour le système de chat réutilisable

export type ConversationType = 
  | 'group-buy'       // Discussions sur achats groupés
  | 'ticket'          // Support tickets
  | 'project'         // Projets clients
  | 'direct'          // Messages directs entre utilisateurs
  | 'maintenance'     // Rapports de maintenance

export type MessageType = 
  | 'text'
  | 'image'
  | 'file'
  | 'system'          // Messages système (ex: "X a rejoint le groupe")
  | 'notification'

export interface ChatMessage {
  _id: string
  conversationId: string
  conversationType: ConversationType
  sender: {
    userId: string
    name: string
    avatar?: string
    role?: string
  }
  content: string
  type: MessageType
  attachments?: Array<{
    url: string
    name: string
    size: number
    mimeType: string
  }>
  metadata?: Record<string, any>  // Données contextuelles (ex: ticketId, groupId)
  reactions?: Array<{
    emoji: string
    userId: string
    userName: string
  }>
  mentions?: Array<{          // Mentions @utilisateur
    userId: string
    userName: string
    position: number          // Position dans le texte
  }>
  threadId?: string           // ID du thread parent si c'est une réponse
  repliesCount?: number       // Nombre de réponses dans le thread
  isEdited?: boolean          // Message modifié
  editHistory?: Array<{       // Historique des modifications
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

export interface ChatConversation {
  _id: string
  conversationId: string
  type: ConversationType
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
  unreadCount?: Record<string, number>  // Par userId
  metadata?: Record<string, any>
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TypingIndicator {
  userId: string
  userName: string
  conversationId: string
  timestamp: Date
}

export interface ChatNotification {
  conversationId: string
  message: ChatMessage
  unreadCount: number
}

// Props du composant ChatBox
export interface ChatBoxProps {
  conversationId: string
  conversationType: ConversationType
  currentUser: {
    userId: string
    name: string
    avatar?: string
    role?: string
  }
  placeholder?: string
  height?: string
  onNewMessage?: (message: ChatMessage) => void
  metadata?: Record<string, any>
  showParticipants?: boolean
  allowAttachments?: boolean
  allowReactions?: boolean
  className?: string
}

// Recherche de messages
export interface ChatSearchQuery {
  conversationId?: string
  conversationType?: ConversationType
  searchTerm: string
  userId?: string
  dateFrom?: Date
  dateTo?: Date
  hasAttachments?: boolean
  limit?: number
}

export interface ChatSearchResult {
  messages: ChatMessage[]
  totalCount: number
  hasMore: boolean
}

// Export de conversations
export interface ChatExportOptions {
  conversationId: string
  format: 'json' | 'csv' | 'pdf'
  dateFrom?: Date
  dateTo?: Date
  includeAttachments?: boolean
}

// Thread de discussion
export interface ChatThread {
  parentMessageId: string
  replies: ChatMessage[]
  totalReplies: number
}

// Events Socket.io
export interface ChatSocketEvents {
  // Émis par le client
  'chat:join': (conversationId: string) => void
  'chat:leave': (conversationId: string) => void
  'chat:typing': (data: { conversationId: string; userName: string }) => void
  'chat:stopTyping': (conversationId: string) => void
  'chat:sendMessage': (message: Omit<ChatMessage, '_id' | 'createdAt'>) => void
  'chat:markRead': (data: { conversationId: string; messageIds: string[] }) => void
  'chat:react': (data: { messageId: string; emoji: string }) => void
  'chat:editMessage': (data: { messageId: string; newContent: string }) => void
  'chat:deleteMessage': (messageId: string) => void
  'chat:replyThread': (data: { parentMessageId: string; message: Omit<ChatMessage, '_id' | 'createdAt'> }) => void

  // Reçus par le client
  'chat:message': (message: ChatMessage) => void
  'chat:userTyping': (data: TypingIndicator) => void
  'chat:userStoppedTyping': (data: { userId: string; conversationId: string }) => void
  'chat:messageRead': (data: { messageId: string; userId: string; readAt: Date }) => void
  'chat:reaction': (data: { messageId: string; emoji: string; userId: string; userName: string }) => void
  'chat:notification': (notification: ChatNotification) => void
  'chat:messageEdited': (data: { messageId: string; newContent: string; isEdited: boolean }) => void
  'chat:messageDeleted': (messageId: string) => void
  'chat:threadReply': (message: ChatMessage) => void
}
