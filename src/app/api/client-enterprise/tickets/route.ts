import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Ticket from '@/lib/models/Ticket'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const filter: any = companyScope({ userId, companyId })
  if (status) filter.status = status

  const tickets = await Ticket.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  return NextResponse.json({ tickets })
}

export async function POST(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const body = await request.json()

  const { title, category, priority, description } = body
  if (!title || !category) {
    return NextResponse.json({ error: 'Titre et catégorie requis' }, { status: 400 })
  }

  const now = new Date()
  const slaHours = priority === 'urgent' ? 4 : priority === 'high' ? 8 : priority === 'medium' ? 24 : 72
  const deadline = new Date(now.getTime() + slaHours * 3600000)

  const ticket = await Ticket.create({
    clientId: userId,
    title,
    category,
    priority: priority || 'medium',
    status: 'open',
    channel: 'client_portal',
    assignedTo: [],
    watchers: [],
    tags: [],
    messages: description ? [{ authorId: userId, authorRole: 'CLIENT', message: description, createdAt: now }] : [],
    history: [{ authorId: userId, authorRole: 'CLIENT', action: 'note', createdAt: now }],
    sla: { targetHours: slaHours, startedAt: now, deadlineAt: deadline, breached: false }
  })

  void logAuditEvent({
    entityType: 'Ticket',
    entityId: ticket._id,
    action: 'created',
    userId: access.userId,
    userRole: 'CLIENT',
    clientCompanyId: access.profiles.companyClientId,
    metadata: { title, category },
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
