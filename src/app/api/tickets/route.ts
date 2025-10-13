import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Ticket from '@/lib/models/Ticket'
import Notification from '@/lib/models/Notification'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    const query: any = {}
    if (clientId) query.clientId = clientId
    if (projectId) query.projectId = projectId
    if (status) query.status = status

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    const total = await Ticket.countDocuments(query)
    return NextResponse.json({ success: true, tickets, total })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur liste tickets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const { title, category, priority, clientId, projectId, message } = body || {}
    if (!title || !clientId || !projectId) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const ticket = await Ticket.create({
      title,
      category: category || 'incident',
      priority: priority || 'medium',
      clientId,
      projectId,
      messages: message ? [{ authorId: clientId, authorRole: 'CLIENT', message }] : []
    })
    // Notification stub: création ticket
    await Notification.create({
      userId: clientId,
      ticketId: ticket._id,
      channel: 'console',
      type: 'ticket_update',
      message: `Ticket créé: ${ticket.title}`,
      status: 'sent',
      sentAt: new Date()
    })
    return NextResponse.json({ success: true, ticket })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création ticket' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const { id, status, addMessage, authorId, authorRole } = body || {}
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const updates: any = {}
    if (status) updates.status = status
    if (addMessage && authorId && authorRole) {
      updates.$push = { messages: { authorId, authorRole, message: addMessage, createdAt: new Date() } }
    }

    await Ticket.updateOne({ _id: id }, updates)
    const updated = (await Ticket.findById(id).lean()) as any
    if (!updated) {
      return NextResponse.json({ error: 'Ticket introuvable après mise à jour' }, { status: 404 })
    }
    // SLA notifications (stubs)
    const deadlineRaw = updated?.sla?.deadlineAt
    if (deadlineRaw) {
      const now = new Date()
      const deadline = new Date(deadlineRaw)
      const msLeft = deadline.getTime() - now.getTime()
      const hoursLeft = msLeft / (1000 * 60 * 60)
      if (hoursLeft <= 2 && hoursLeft > 0) {
        await Notification.create({ ticketId: updated._id, type: 'sla_warning', channel: 'console', message: `SLA proche pour ${updated.title}`, status: 'sent', sentAt: new Date() })
      } else if (hoursLeft <= 0) {
        await Notification.create({ ticketId: updated._id, type: 'sla_breached', channel: 'console', message: `SLA dépassé pour ${updated.title}`, status: 'sent', sentAt: new Date() })
      }
    }
    return NextResponse.json({ success: true, ticket: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour ticket' }, { status: 500 })
  }
}
