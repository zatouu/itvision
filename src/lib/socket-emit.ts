/**
 * Helpers pour émettre des événements Socket.io depuis les API routes
 * Phase 2B - Temps Réel
 */

import type { Server } from 'socket.io'

/**
 * Obtenir l'instance Socket.io globale
 */
export function getIO(): Server | null {
  if (typeof global.io !== 'undefined') {
    return global.io as Server
  }
  return null
}

/**
 * Émettre une mise à jour de projet
 */
export function emitProjectUpdate(projectId: string, data: {
  progress?: number
  status?: string
  currentPhase?: string
  [key: string]: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    projectId,
    ...data,
    timestamp: new Date()
  }

  // Envoyer à tous les membres du projet
  io.to(`project-${projectId}`).emit('project-updated', payload)
  
  console.log(`📡 Événement émis: project-updated pour ${projectId}`)
}

/**
 * Émettre une mise à jour de ticket
 */
export function emitTicketUpdate(ticketId: string, data: {
  status?: string
  priority?: string
  assignedTo?: string
  [key: string]: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    ticketId,
    ...data,
    timestamp: new Date()
  }

  io.to(`ticket-${ticketId}`).emit('ticket-updated', payload)
  
  console.log(`📡 Événement émis: ticket-updated pour ${ticketId}`)
}

/**
 * Émettre un nouveau message dans un ticket
 */
export function emitNewMessage(ticketId: string, message: {
  authorId: string
  authorName: string
  authorRole: string
  message: string
  [key: string]: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    ticketId,
    ...message,
    timestamp: new Date()
  }

  io.to(`ticket-${ticketId}`).emit('new-message', payload)
  
  console.log(`📡 Événement émis: new-message dans ticket ${ticketId}`)
}

/**
 * Émettre une notification à un utilisateur spécifique
 */
export function emitUserNotification(userId: string, notification: {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  data?: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    ...notification,
    timestamp: new Date()
  }

  io.to(`user-${userId}`).emit('notification', payload)
  
  console.log(`📡 Notification envoyée à user-${userId}`)
}

/**
 * Émettre une notification à un groupe (clients, admins, techniciens)
 */
export function emitGroupNotification(group: 'clients' | 'admins' | 'technicians', notification: {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  data?: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    ...notification,
    timestamp: new Date()
  }

  io.to(group).emit('notification', payload)
  
  console.log(`📡 Notification envoyée au groupe: ${group}`)
}

/**
 * Émettre une mise à jour de document ajouté
 */
export function emitDocumentAdded(projectId: string, document: {
  id: string
  name: string
  type: string
  url: string
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    projectId,
    document,
    timestamp: new Date()
  }

  io.to(`project-${projectId}`).emit('document-added', payload)
  
  console.log(`📡 Événement émis: document-added dans projet ${projectId}`)
}

/**
 * Émettre une mise à jour d'intervention
 */
export function emitInterventionUpdate(projectId: string, intervention: {
  id: string
  status: string
  [key: string]: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    projectId,
    intervention,
    timestamp: new Date()
  }

  io.to(`project-${projectId}`).emit('intervention-updated', payload)
  
  console.log(`📡 Événement émis: intervention-updated dans projet ${projectId}`)
}

/**
 * Émettre une mise à jour de devis
 */
export function emitQuoteUpdate(clientId: string, quote: {
  id: string
  status: string
  [key: string]: any
}) {
  const io = getIO()
  if (!io) return

  const payload = {
    quote,
    timestamp: new Date()
  }

  io.to(`user-${clientId}`).emit('quote-updated', payload)
  
  console.log(`📡 Événement émis: quote-updated pour client ${clientId}`)
}

/**
 * Diffuser un événement global (broadcast)
 */
export function broadcastEvent(event: string, data: any) {
  const io = getIO()
  if (!io) return

  const payload = {
    ...data,
    timestamp: new Date()
  }

  io.emit(event, payload)
  
  console.log(`📡 Événement diffusé: ${event}`)
}

/**
 * Obtenir les statistiques de connexion
 */
export async function getSocketStats() {
  const io = getIO()
  if (!io) return null

  const sockets = await io.fetchSockets()
  
  return {
    connectedClients: sockets.length,
    rooms: Array.from(io.sockets.adapter.rooms.keys()).filter(room => !room.match(/^[A-Za-z0-9_-]{20}$/)), // Exclure les IDs de socket
    timestamp: new Date()
  }
}

/**
 * Déconnecter un utilisateur spécifique
 */
export async function disconnectUser(userId: string, reason?: string) {
  const io = getIO()
  if (!io) return

  const sockets = await io.in(`user-${userId}`).fetchSockets()
  
  for (const socket of sockets) {
    socket.disconnect(true)
  }
  
  console.log(`🔌 Utilisateur déconnecté: user-${userId}${reason ? ` (${reason})` : ''}`)
}





