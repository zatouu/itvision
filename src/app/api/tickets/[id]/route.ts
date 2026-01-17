import type { NextRequest } from 'next/server'
import { NextResponse as NextApiResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Ticket from '@/lib/models/Ticket'
import { TicketService, getTicketById } from '@/lib/services/tickets'
import { requireAuth } from '@/lib/jwt'

async function verify(request: NextRequest) {
  const decoded = await requireAuth(request)
  return {
    userId: decoded.userId,
    role: decoded.role as 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  }
}

export async function GET(request: NextRequest, context: any) {
  try {
    await connectMongoose()
    const params = await context.params
    const { userId, role } = await verify(request)
    const ticket = await getTicketById(params.id)
    if (!ticket) {
      return NextApiResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }
    if (!TicketService.canAccess(role, userId, ticket)) {
      return NextApiResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    return NextApiResponse.json({ success: true, ticket: await TicketService.serialize(ticket) })
  } catch (error) {
    console.error('Erreur ticket detail:', error)
    return NextApiResponse.json({ error: 'Erreur consultation ticket' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: any) {
  try {
    await connectMongoose()
    const params = await context.params
    const { userId, role } = await verify(request)
    const body = await request.json()
    const { message, attachments, internal } = body || {}
    if (!message && (!Array.isArray(attachments) || attachments.length === 0)) {
        return NextApiResponse.json({ error: 'Message ou pièce jointe requis' }, { status: 400 })
    }
    const ticket = await Ticket.findById(params.id)
    if (!ticket) {
        return NextApiResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }
    if (!TicketService.canAccess(role, userId, ticket)) {
        return NextApiResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const authorId = new mongoose.Types.ObjectId(userId)
    const attachmentsArray = Array.isArray(attachments)
      ? attachments.filter((att: any) => att && att.name && att.url).map((att: any) => ({
          name: att.name,
          url: att.url,
          type: att.type,
          size: att.size,
          uploadedAt: new Date(),
          uploadedBy: authorId
        }))
      : []

    if (message) {
      TicketService.appendMessage(ticket, {
        authorId,
        authorRole: role,
        message,
        attachments: attachmentsArray,
        internal: !!internal,
        createdAt: new Date()
      })
    } else if (attachmentsArray.length > 0) {
      TicketService.appendMessage(ticket, {
        authorId,
        authorRole: role,
        message: 'Pièces jointes envoyées',
        attachments: attachmentsArray,
        internal: !!internal,
        createdAt: new Date()
      })
    }

    // Réparer les messages existants qui n'ont pas authorId/authorRole
    if (ticket.messages && Array.isArray(ticket.messages)) {
      ticket.messages = ticket.messages.map((msg: any) => {
        if (!msg.authorId) {
          msg.authorId = ticket.clientId || authorId
        }
        if (!msg.authorRole) {
          msg.authorRole = 'CLIENT'
        }
        if (!msg.createdAt) {
          msg.createdAt = new Date()
        }
        return msg
      })
    }

    await ticket.save()

      return NextApiResponse.json({ success: true, ticket: await TicketService.serialize(ticket) })
  } catch (error) {
    console.error('Erreur ajout message ticket:', error)
      return NextApiResponse.json({ error: 'Erreur lors de la mise à jour du ticket' }, { status: 500 })
  }
}

/**
 * Ce point d’entrée est volontairement mince: l’implémentation métier est concentrée
 * dans `lib/services/tickets.ts` pour faciliter l’externalisation (microservice support).
 */

