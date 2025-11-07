import mongoose from 'mongoose'
import Ticket, { ITicket, ITicketMessage } from '@/lib/models/Ticket'

export type TicketRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN'

export interface SerializedTicket {
  id: string
  projectId: string
  clientId: string
  assignedTo: string[]
  watchers: string[]
  title: string
  category: ITicket['category']
  priority: ITicket['priority']
  status: ITicket['status']
  channel: ITicket['channel']
  tags: string[]
  source?: string
  lastResponseAt?: string
  resolvedAt?: string
  sla: ITicket['sla']
  messages: ITicket['messages']
  history: ITicket['history']
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export const TicketService = {
  async serialize(ticket: ITicket | (ITicket & { _id: mongoose.Types.ObjectId })): Promise<SerializedTicket> {
    const assignedTo = (ticket.assignedTo || []).map((id) => String(id))
    const watchers = (ticket.watchers || []).map((id) => String(id))
    return {
      id: String(ticket._id),
      projectId: String(ticket.projectId),
      clientId: String(ticket.clientId),
      assignedTo,
      watchers,
      title: ticket.title,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      channel: ticket.channel,
      tags: ticket.tags || [],
      source: ticket.source,
      lastResponseAt: ticket.lastResponseAt ? ticket.lastResponseAt.toISOString() : undefined,
      resolvedAt: ticket.resolvedAt ? ticket.resolvedAt.toISOString() : undefined,
      sla: ticket.sla,
      messages: ticket.messages || [],
      history: ticket.history || [],
      metadata: ticket.metadata || undefined,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString()
    }
  },

  canAccess(role: TicketRole, userId: string, ticket: ITicket): boolean {
    const clientMatch = String(ticket.clientId) === userId
    if (role === 'CLIENT') return clientMatch
    if (role === 'ADMIN') return true
    if (role === 'TECHNICIAN') {
      const assigned = (ticket.assignedTo || []).some((id) => String(id) === userId)
      const watcher = (ticket.watchers || []).some((id) => String(id) === userId)
      return assigned || watcher
    }
    return false
  },

  appendMessage(ticket: ITicket, message: ITicketMessage, snapshotStatus?: string) {
    ticket.messages.push({ ...message, createdAt: message.createdAt || new Date(), statusSnapshot: snapshotStatus })
    ticket.lastResponseAt = new Date()
    ticket.history.push({
      authorId: message.authorId,
      authorRole: message.authorRole,
      action: 'message',
      createdAt: new Date(),
      payload: { message: message.message }
    })
  },

  appendHistory(ticket: ITicket, payload: { authorId: mongoose.Types.ObjectId; authorRole: TicketRole; action: ITicket['history'][number]['action']; details?: Record<string, unknown> }) {
    ticket.history.push({
      authorId: payload.authorId,
      authorRole: payload.authorRole,
      action: payload.action,
      payload: payload.details,
      createdAt: new Date()
    })
  }
}

/**
 * NOTE: l’API ticket est pensée pour être extraite en microservice dédié.
 * Ce fichier centralise les opérations métier afin de pouvoir déléguer facilement
 * vers un service externe (ex: file d’attente, notifications, SLA background job).
 */

export async function getTicketById(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  const ticket = await Ticket.findById(id).lean<ITicket & { _id: mongoose.Types.ObjectId }>()
  return ticket || null
}

export default TicketService
