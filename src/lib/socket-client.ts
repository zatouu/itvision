/**
 * Client Socket.io pour le portail client
 * Phase 2B - Temps Réel
 */

import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export interface SocketUser {
  userId: string
  email: string
  role: string
}

export interface ConnectedEvent {
  message: string
  userId: string
  email: string
  role: string
  timestamp: Date
}

export interface ProjectUpdateEvent {
  projectId: string
  progress?: number
  status?: string
  currentPhase?: string
  timestamp: Date
}

export interface TicketUpdateEvent {
  ticketId: string
  status?: string
  priority?: string
  timestamp: Date
}

export interface NewMessageEvent {
  ticketId: string
  message: string
  authorId: string
  authorEmail: string
  authorRole: string
  timestamp: Date
}

export interface TypingEvent {
  ticketId: string
  userId: string
  userName?: string
  isTyping: boolean
}

export interface NotificationEvent {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  data?: any
  timestamp: Date
}

export interface ConversationNewMessageEvent {
  conversationId: string
  message: {
    id: string
    senderId: string
    senderRole: string
    text: string
    createdAt: string | Date
  }
  timestamp: string | Date
}

/**
 * Initialiser la connexion Socket.io
 */
export function initSocket(token: string): Socket {
  if (socket?.connected) {
    console.log('🔌 Socket déjà connecté')
    return socket
  }

  const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000
  })

  // Événements de connexion
  socket.on('connect', () => {
    console.log('✅ Socket.io connecté:', socket?.id)
  })

  socket.on('connected', (data: ConnectedEvent) => {
    console.log('✅ Authentification réussie:', data.email)
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket.io déconnecté:', reason)
  })

  socket.on('connect_error', (error) => {
    console.error('❌ Erreur connexion Socket.io:', error.message)
  })

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Reconnexion réussie (tentative ${attemptNumber})`)
  })

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Tentative de reconnexion ${attemptNumber}...`)
  })

  socket.on('reconnect_error', (error) => {
    console.error('❌ Erreur reconnexion:', error.message)
  })

  socket.on('reconnect_failed', () => {
    console.error('❌ Échec de toutes les tentatives de reconnexion')
  })

  return socket
}

/**
 * Obtenir l'instance Socket.io actuelle
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Déconnecter le socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('🔌 Socket déconnecté')
  }
}

/**
 * Rejoindre un projet
 */
export function joinProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('join-project', projectId)
    console.log(`📁 Rejoint le projet: ${projectId}`)
  }
}

/**
 * Quitter un projet
 */
export function leaveProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('leave-project', projectId)
    console.log(`📁 Quitté le projet: ${projectId}`)
  }
}

/**
 * Rejoindre un ticket
 */
export function joinTicket(ticketId: string): void {
  if (socket?.connected) {
    socket.emit('join-ticket', ticketId)
    console.log(`🎫 Rejoint le ticket: ${ticketId}`)
  }
}

/**
 * Quitter un ticket
 */
export function leaveTicket(ticketId: string): void {
  if (socket?.connected) {
    socket.emit('leave-ticket', ticketId)
    console.log(`🎫 Quitté le ticket: ${ticketId}`)
  }
}

/**
 * Indiquer que l'utilisateur est en train d'écrire
 */
export function startTyping(ticketId: string, userName?: string): void {
  if (socket?.connected) {
    socket.emit('typing-start', { ticketId, userName })
  }
}

/**
 * Arrêter l'indicateur d'écriture
 */
export function stopTyping(ticketId: string): void {
  if (socket?.connected) {
    socket.emit('typing-stop', { ticketId })
  }
}

/**
 * Envoyer un message dans un ticket
 */
export function sendMessage(ticketId: string, message: string): void {
  if (socket?.connected) {
    socket.emit('send-message', { ticketId, message })
  }
}

/**
 * Envoyer un heartbeat
 */
export function sendHeartbeat(): void {
  if (socket?.connected) {
    socket.emit('heartbeat')
  }
}

/**
 * Demander une mise à jour des données
 */
export function requestUpdate(type: string, id: string): void {
  if (socket?.connected) {
    socket.emit('request-update', { type, id })
  }
}

/**
 * Vérifier si le socket est connecté
 */
export function isConnected(): boolean {
  return socket?.connected || false
}

/**
 * Hook pour écouter les événements Socket.io
 */
export function onSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void
): () => void {
  if (!socket) {
    console.warn(`⚠️ Socket non initialisé pour l'événement: ${event}`)
    return () => {}
  }

  socket.on(event, callback)

  // Retourner une fonction de nettoyage
  return () => {
    if (socket) {
      socket.off(event, callback)
    }
  }
}

/**
 * Écouter les mises à jour de projet
 */
export function onProjectUpdate(callback: (data: ProjectUpdateEvent) => void): () => void {
  return onSocketEvent<ProjectUpdateEvent>('project-updated', callback)
}

/**
 * Écouter les mises à jour de ticket
 */
export function onTicketUpdate(callback: (data: TicketUpdateEvent) => void): () => void {
  return onSocketEvent<TicketUpdateEvent>('ticket-updated', callback)
}

/**
 * Écouter les nouveaux messages
 */
export function onNewMessage(callback: (data: NewMessageEvent) => void): () => void {
  return onSocketEvent<NewMessageEvent>('new-message', callback)
}

/**
 * Écouter les indicateurs d'écriture
 */
export function onUserTyping(callback: (data: TypingEvent) => void): () => void {
  return onSocketEvent<TypingEvent>('user-typing', callback)
}

/**
 * Écouter les notifications
 */
export function onNotification(callback: (data: NotificationEvent) => void): () => void {
  return onSocketEvent<NotificationEvent>('notification', callback)
}

/**
 * Écouter les nouveaux messages de conversation
 */
export function onConversationNewMessage(
  callback: (data: ConversationNewMessageEvent) => void
): () => void {
  return onSocketEvent<ConversationNewMessageEvent>('conversation-new-message', callback)
}





