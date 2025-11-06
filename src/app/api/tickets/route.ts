import type { NextRequest } from 'next/server'
import { NextResponse as NextApiResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Ticket from '@/lib/models/Ticket'
import Notification from '@/lib/models/Notification'
import { TicketService } from '@/lib/services/tickets'

async function verifyToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new Error('Non authentifié')
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
  return {
    userId: String(decoded.userId || decoded.id || decoded.sub || ''),
    role: String(decoded.role || '').toUpperCase() as 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')
    const search = (searchParams.get('search') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1

    const query: any = {}
    if (projectId) query.projectId = projectId
    if (status && status !== 'all') query.status = status
    if (priority && priority !== 'all') query.priority = priority
    if (role === 'CLIENT') {
      query.clientId = userId
    } else if (clientId) {
      query.clientId = clientId
    }
    if (role === 'TECHNICIAN') {
      query.$or = [
        { assignedTo: userId },
        { watchers: userId }
      ]
    } else if (assignedTo) {
      query.assignedTo = assignedTo
    }
    if (search) {
      query.title = { $regex: new RegExp(search, 'i') }
    }

    const tickets = await Ticket.find(query).sort({ [sortBy]: sortDir }).skip(skip).limit(limit).lean()
    const total = await Ticket.countDocuments(query)
    const serialized = await Promise.all(tickets.map((ticket) => TicketService.serialize(ticket as any)))
    return NextApiResponse.json({ success: true, tickets: serialized, total })
  } catch (e) {
    console.error('Erreur liste tickets:', e)
    return NextApiResponse.json({ error: 'Erreur liste tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const body = await request.json()
    const { title, category, priority, clientId: payloadClientId, projectId, message, assignedTo, tags } = body || {}
    if (!title || !projectId) return NextApiResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const clientId = role === 'CLIENT' ? userId : payloadClientId
    if (!clientId) {
      return NextApiResponse.json({ error: 'Client inconnu' }, { status: 400 })
    }

    const ticket = new Ticket({
      title,
      category: category || 'incident',
      priority: priority || 'medium',
      clientId,
      projectId,
      assignedTo: Array.isArray(assignedTo) ? assignedTo : [],
      tags: Array.isArray(tags) ? tags : [],
      channel: role === 'CLIENT' ? 'client_portal' : 'admin'
    })

    if (message) {
      TicketService.appendMessage(ticket, {
        authorId: new mongoose.Types.ObjectId(clientId),
        authorRole: role,
        message,
        createdAt: new Date()
      })
    }

    await ticket.save()

    await Notification.create({
      userId: clientId,
      ticketId: ticket._id,
      channel: 'console',
      type: 'ticket_update',
      message: `Ticket créé: ${ticket.title}`,
      status: 'sent',
      sentAt: new Date()
    })

    return NextApiResponse.json({ success: true, ticket: await TicketService.serialize(ticket) })
  } catch (e) {
    console.error('Erreur création ticket:', e)
    return NextApiResponse.json({ error: 'Erreur création ticket' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const body = await request.json()
    const { id, status, priority, assignedTo, addMessage, authorRole, tags, internalNote, authorId: authorIdOverride } = body || {}
    if (!id) return NextApiResponse.json({ error: 'ID requis' }, { status: 400 })

    const ticket = await Ticket.findById(id)
    if (!ticket) {
      return NextApiResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    if (!TicketService.canAccess(role, userId, ticket)) {
      return NextApiResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const authorId = new mongoose.Types.ObjectId(role === 'CLIENT' ? userId : (authorIdOverride || userId))
    const effectiveRole = (authorRole || role) as 'CLIENT' | 'TECHNICIAN' | 'ADMIN'

    if (status && status !== ticket.status) {
      ticket.status = status
      if (status === 'resolved') {
        ticket.resolvedAt = new Date()
        ticket.sla.resolvedAt = new Date()
      }
      TicketService.appendHistory(ticket, {
        authorId,
        authorRole: effectiveRole,
        action: 'status_change',
        details: { status }
      })
    }

    if (priority && priority !== ticket.priority) {
      ticket.priority = priority
      TicketService.appendHistory(ticket, {
        authorId,
        authorRole: effectiveRole,
        action: 'note',
        details: { priority }
      })
    }

    if (Array.isArray(assignedTo)) {
      ticket.assignedTo = assignedTo
      TicketService.appendHistory(ticket, {
        authorId,
        authorRole: effectiveRole,
        action: 'assignment',
        details: { assignedTo }
      })
    }

    if (Array.isArray(tags)) {
      ticket.tags = tags
    }

    if (internalNote) {
      TicketService.appendHistory(ticket, {
        authorId,
        authorRole: effectiveRole,
        action: 'note',
        details: { note: internalNote }
      })
    }

    if (addMessage) {
      TicketService.appendMessage(ticket, {
        authorId,
        authorRole: effectiveRole,
        message: addMessage,
        createdAt: new Date()
      }, status)
    }

    await ticket.save()

    const updated = await TicketService.serialize(ticket)

    const deadlineRaw = ticket.sla?.deadlineAt
    if (deadlineRaw) {
      const now = new Date()
      const deadline = new Date(deadlineRaw)
      const msLeft = deadline.getTime() - now.getTime()
      const hoursLeft = msLeft / (1000 * 60 * 60)
      if (hoursLeft <= 2 && hoursLeft > 0) {
        await Notification.create({ ticketId: ticket._id, type: 'sla_warning', channel: 'console', message: `SLA proche pour ${ticket.title}`, status: 'sent', sentAt: new Date() })
      } else if (hoursLeft <= 0) {
        await Notification.create({ ticketId: ticket._id, type: 'sla_breached', channel: 'console', message: `SLA dépassé pour ${ticket.title}`, status: 'sent', sentAt: new Date() })
      }
    }

    return NextApiResponse.json({ success: true, ticket: updated })
  } catch (e) {
    console.error('Erreur mise à jour ticket:', e)
    return NextApiResponse.json({ error: 'Erreur mise à jour ticket' }, { status: 500 })
  }
}
