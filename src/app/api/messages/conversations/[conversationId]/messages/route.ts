import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyAuthServer } from '@/lib/auth-server'
import { Conversation } from '@/lib/models/Conversation'
import { Message } from '@/lib/models/Message'
import { getIO } from '@/lib/socket-emit'

async function requireAuth(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user?.id) {
    return { ok: false as const, status: 401 as const, error: 'Non authentifié' }
  }
  return { ok: true as const, user: auth.user }
}

interface RouteContext {
  params: Promise<{ conversationId: string }>
}

function parseLimit(value: string | null): number {
  const parsed = value ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(Math.floor(parsed), 1), 200)
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { conversationId } = await context.params

    await connectDB()

    const conversation = await Conversation.findById(conversationId).lean()
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const currentUserId = String(auth.user.id)
    const isParticipant = (conversation.participants || []).some(p => String(p) === currentUserId)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))
    const before = searchParams.get('before')
    const beforeDate = before ? new Date(before) : null

    const query: any = { conversationId }
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const ordered = messages.slice().reverse()

    return NextResponse.json({
      messages: ordered.map(m => ({
        id: String(m._id),
        conversationId: String(m.conversationId),
        senderId: String(m.senderId),
        senderRole: String(m.senderRole || ''),
        text: String(m.text || ''),
        createdAt: m.createdAt,
        updatedAt: m.updatedAt
      }))
    })
  } catch (error) {
    console.error('Erreur GET messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { conversationId } = await context.params
    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    await connectDB()

    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })
    }

    const currentUserId = String(auth.user.id)
    const isParticipant = (conversation.participants || []).some(p => String(p) === currentUserId)
    if (!isParticipant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const created = await Message.create({
      conversationId,
      senderId: currentUserId,
      senderRole: auth.user.role,
      text
    })

    conversation.lastMessageAt = created.createdAt
    conversation.lastMessageText = text.slice(0, 500)
    conversation.lastMessageSenderId = created.senderId as any
    conversation.lastMessageId = created._id as any
    await conversation.save()

    const payload = {
      conversationId: String(conversation._id),
      message: {
        id: String(created._id),
        senderId: String(created.senderId),
        senderRole: String(created.senderRole || ''),
        text: String(created.text || ''),
        createdAt: created.createdAt
      },
      timestamp: new Date()
    }

    // Emit to each participant's personal room to avoid unauthorized room-joins.
    const io = getIO()
    if (io) {
      const participantIds = (conversation.participants || []).map(p => String(p))
      for (const userId of participantIds) {
        io.to(`user-${userId}`).emit('conversation-new-message', payload)
      }
    }

    return NextResponse.json({
      message: {
        id: String(created._id),
        conversationId: String(created.conversationId),
        senderId: String(created.senderId),
        senderRole: String(created.senderRole || ''),
        text: String(created.text || ''),
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      }
    })
  } catch (error) {
    console.error('Erreur POST message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
