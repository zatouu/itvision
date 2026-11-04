import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { verifyAuthServer } from '@/lib/auth-server'
import { Conversation } from '@/lib/models/Conversation'
import { listThreadMessages, markThreadRead, postMessage, toConversationMessageDto, EmptyMessageError } from '@/lib/messaging/thread-messages'
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

    const messages = await listThreadMessages('conversation', conversationId, { limit, before: beforeDate })

    // Accusés de lecture : seulement à l'ouverture du fil (pas lors du chargement de l'historique)
    if (!beforeDate) {
      const newlyRead = await markThreadRead('conversation', conversationId, currentUserId)
      const io = getIO()
      if (newlyRead > 0 && io) {
        for (const participantId of (conversation.participants || []).map(p => String(p))) {
          io.to(`user-${participantId}`).emit('conversation-read', { conversationId, readerId: currentUserId, at: new Date() })
        }
      }
    }

    return NextResponse.json({
      messages: messages.map(toConversationMessageDto)
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

    if (!text && !Array.isArray(body.attachments)) {
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

    const created = await postMessage({
      threadType: 'conversation',
      threadId: String(conversation._id),
      senderId: currentUserId,
      senderRole: auth.user.role,
      text,
      attachments: body.attachments
    })

    conversation.lastMessageAt = created.createdAt
    conversation.lastMessageText = (created.text || 'Pièce jointe').slice(0, 500)
    conversation.lastMessageSenderId = currentUserId as any
    conversation.lastMessageId = created._id as any
    await conversation.save()

    const dto = toConversationMessageDto(created)
    const payload = {
      conversationId: String(conversation._id),
      message: {
        id: dto.id,
        senderId: dto.senderId,
        senderRole: dto.senderRole,
        text: dto.text,
        attachments: dto.attachments,
        createdAt: dto.createdAt
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

    return NextResponse.json({ message: dto })
  } catch (error) {
    if (error instanceof EmptyMessageError) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }
    console.error('Erreur POST message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
