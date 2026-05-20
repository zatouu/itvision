import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Ticket from '@/lib/models/Ticket'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)

  const ticket = await Ticket.findOne({
    _id: new mongoose.Types.ObjectId(id),
    clientId: userId,
  }).lean() as any

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  }

  const data = {
    _id: String(ticket._id),
    title: ticket.title,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    channel: ticket.channel,
    tags: ticket.tags || [],
    source: ticket.source,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    lastResponseAt: ticket.lastResponseAt,
    resolvedAt: ticket.resolvedAt,
    sla: ticket.sla ? {
      targetHours: ticket.sla.targetHours,
      startedAt: ticket.sla.startedAt,
      deadlineAt: ticket.sla.deadlineAt,
      breached: ticket.sla.breached,
      resolvedAt: ticket.sla.resolvedAt,
    } : null,
    messages: (ticket.messages || []).filter((m: any) => !m.internal).map((m: any) => ({
      authorId: String(m.authorId),
      authorRole: m.authorRole,
      message: m.message,
      createdAt: m.createdAt,
      attachments: (m.attachments || []).map((a: any) => ({
        name: a.name,
        url: a.url,
        type: a.type,
        size: a.size,
        uploadedAt: a.uploadedAt,
      })),
      statusSnapshot: m.statusSnapshot,
    })),
    history: (ticket.history || []).map((h: any) => ({
      authorId: String(h.authorId),
      authorRole: h.authorRole,
      action: h.action,
      payload: h.payload,
      createdAt: h.createdAt,
    })),
    assignedTo: (ticket.assignedTo || []).map((a: any) => String(a)),
    watchers: (ticket.watchers || []).map((w: any) => String(w)),
  }

  return NextResponse.json({ ticket: data })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const body = await request.json()
  const { message } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user.id)

  const ticket = await Ticket.findOne({
    _id: new mongoose.Types.ObjectId(id),
    clientId: userId,
  })

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
  }

  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    return NextResponse.json({ error: 'Ce ticket est fermé' }, { status: 409 })
  }

  const now = new Date()
  ticket.messages.push({
    authorId: userId,
    authorRole: 'CLIENT',
    message: message.trim(),
    createdAt: now,
    internal: false,
    statusSnapshot: ticket.status,
  })
  ticket.lastResponseAt = now
  ticket.updatedAt = now

  await ticket.save()

  const lastMessage = ticket.messages[ticket.messages.length - 1]

  return NextResponse.json({
    message: {
      authorId: String(lastMessage.authorId),
      authorRole: lastMessage.authorRole,
      message: lastMessage.message,
      createdAt: lastMessage.createdAt,
      attachments: [],
      statusSnapshot: lastMessage.statusSnapshot,
    }
  }, { status: 201 })
}
