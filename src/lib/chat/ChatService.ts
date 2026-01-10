import { io, Socket } from 'socket.io-client'
import type { ChatMessage, ChatConversation, TypingIndicator, ConversationType } from './types'

export class ChatService {
  private socket: Socket | null = null
  private messageListeners: Map<string, (message: ChatMessage) => void> = new Map()
  private typingListeners: Map<string, (data: TypingIndicator) => void> = new Map()
  private typingTimeout: NodeJS.Timeout | null = null

  /**
   * Initialise la connexion Socket.io pour le chat temps réel
   */
  async connect(token: string): Promise<void> {
    if (this.socket?.connected) return

    this.socket = io({
      auth: { token },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('✅ Chat service connected')
    })

    this.socket.on('disconnect', () => {
      console.log('⚠️ Chat service disconnected')
    })

    this.socket.on('chat:message', (message: ChatMessage) => {
      this.messageListeners.forEach(listener => listener(message))
    })

    this.socket.on('chat:userTyping', (data: TypingIndicator) => {
      this.typingListeners.forEach(listener => listener(data))
    })

    this.socket.on('chat:userStoppedTyping', (data: { userId: string; conversationId: string }) => {
      // Géré dans les composants via typingListeners
    })
  }

  /**
   * Rejoindre une conversation (room Socket.io)
   */
  joinConversation(conversationId: string): void {
    this.socket?.emit('chat:join', conversationId)
  }

  /**
   * Quitter une conversation
   */
  leaveConversation(conversationId: string): void {
    this.socket?.emit('chat:leave', conversationId)
  }

  /**
   * Envoyer un message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    sender: ChatMessage['sender'],
    conversationType: ConversationType,
    metadata?: Record<string, any>,
    attachments?: ChatMessage['attachments']
  ): Promise<ChatMessage> {
    const message: Omit<ChatMessage, '_id' | 'createdAt'> = {
      conversationId,
      conversationType,
      sender,
      content,
      type: attachments && attachments.length > 0 ? 'file' : 'text',
      attachments,
      metadata,
      reactions: [],
      readBy: [{
        userId: sender.userId,
        readAt: new Date()
      }],
      updatedAt: new Date()
    }

    // Émettre via Socket.io pour temps réel
    this.socket?.emit('chat:sendMessage', message)

    // Envoyer aussi via API REST pour persistance
    const response = await fetch(`/api/chat/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error('Erreur envoi message')
    }

    return response.json()
  }

  /**
   * Récupérer l'historique des messages
   */
  async getMessages(
    conversationId: string,
    limit = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(before && { before })
    })

    const response = await fetch(`/api/chat/${conversationId}/messages?${params}`)
    
    if (!response.ok) {
      throw new Error('Erreur chargement messages')
    }

    const data = await response.json()
    return data.messages || []
  }

  /**
   * Créer ou récupérer une conversation
   */
  async getOrCreateConversation(
    conversationId: string,
    type: ConversationType,
    participants: ChatConversation['participants'],
    metadata?: Record<string, any>
  ): Promise<ChatConversation> {
    const response = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        type,
        participants,
        metadata
      })
    })

    if (!response.ok) {
      throw new Error('Erreur création conversation')
    }

    return response.json()
  }

  /**
   * Marquer des messages comme lus
   */
  async markAsRead(conversationId: string, messageIds: string[], userId: string): Promise<void> {
    this.socket?.emit('chat:markRead', { conversationId, messageIds })

    await fetch(`/api/chat/${conversationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIds, userId })
    })
  }

  /**
   * Indiquer que l'utilisateur est en train d'écrire
   */
  startTyping(conversationId: string, userName: string): void {
    // Debounce pour éviter trop d'événements
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }

    this.socket?.emit('chat:typing', { conversationId, userName })

    this.typingTimeout = setTimeout(() => {
      this.stopTyping(conversationId)
    }, 3000)
  }

  /**
   * Arrêter l'indication de saisie
   */
  stopTyping(conversationId: string): void {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
      this.typingTimeout = null
    }
    this.socket?.emit('chat:stopTyping', conversationId)
  }

  /**
   * Ajouter une réaction à un message
   */
  async addReaction(messageId: string, emoji: string, userId: string, userName: string): Promise<void> {
    this.socket?.emit('chat:react', { messageId, emoji })

    await fetch(`/api/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, userId, userName })
    })
  }

  /**
   * Éditer un message
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    this.socket?.emit('chat:editMessage', { messageId, newContent })

    const response = await fetch(`/api/chat/messages/${messageId}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    })

    if (!response.ok) {
      throw new Error('Erreur édition message')
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: string): Promise<void> {
    this.socket?.emit('chat:deleteMessage', messageId)

    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('Erreur suppression message')
    }
  }

  /**
   * Répondre dans un thread
   */
  async replyToThread(
    parentMessageId: string,
    content: string,
    sender: ChatMessage['sender'],
    conversationId: string,
    conversationType: ConversationType
  ): Promise<ChatMessage> {
    const message: Omit<ChatMessage, '_id' | 'createdAt'> = {
      conversationId,
      conversationType,
      sender,
      content,
      type: 'text',
      threadId: parentMessageId,
      reactions: [],
      readBy: [{
        userId: sender.userId,
        readAt: new Date()
      }],
      updatedAt: new Date()
    }

    this.socket?.emit('chat:replyThread', { parentMessageId, message })

    const response = await fetch(`/api/chat/messages/${parentMessageId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error('Erreur envoi réponse')
    }

    return response.json()
  }

  /**
   * Récupérer un thread de discussion
   */
  async getThread(parentMessageId: string): Promise<ChatMessage[]> {
    const response = await fetch(`/api/chat/messages/${parentMessageId}/thread`)
    
    if (!response.ok) {
      throw new Error('Erreur chargement thread')
    }

    const data = await response.json()
    return data.replies || []
  }

  /**
   * Rechercher des messages
   */
  async searchMessages(query: {
    conversationId?: string
    searchTerm: string
    limit?: number
  }): Promise<ChatMessage[]> {
    const params = new URLSearchParams({
      q: query.searchTerm,
      limit: (query.limit || 20).toString(),
      ...(query.conversationId && { conversationId: query.conversationId })
    })

    const response = await fetch(`/api/chat/search?${params}`)
    
    if (!response.ok) {
      throw new Error('Erreur recherche messages')
    }

    const data = await response.json()
    return data.messages || []
  }

  /**
   * Exporter une conversation
   */
  async exportConversation(
    conversationId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<Blob> {
    const response = await fetch(`/api/chat/${conversationId}/export?format=${format}`)
    
    if (!response.ok) {
      throw new Error('Erreur export conversation')
    }

    return response.blob()
  }

  /**
   * Écouter les nouveaux messages
   */
  onMessage(callback: (message: ChatMessage) => void): () => void {
    const id = Math.random().toString(36)
    this.messageListeners.set(id, callback)
    
    return () => {
      this.messageListeners.delete(id)
    }
  }

  /**
   * Écouter les indicateurs de saisie
   */
  onTyping(callback: (data: TypingIndicator) => void): () => void {
    const id = Math.random().toString(36)
    this.typingListeners.set(id, callback)
    
    return () => {
      this.typingListeners.delete(id)
    }
  }

  /**
   * Déconnexion
   */
  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    this.messageListeners.clear()
    this.typingListeners.clear()
  }
}

// Instance singleton
export const chatService = new ChatService()
