import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { listThreadMessages, postMessage, sanitizeAttachments, toGroupOrderMessageDto, MESSAGE_MAX_LENGTH } from '@/lib/messaging/thread-messages'
import { requireAdminApi } from '@/lib/api-auth'
import { applyRateLimit, authRateLimiter } from '@/lib/rate-limiter'
import { readPaymentSettings } from '@/lib/payments/settings'
import {
  getGroupChatParticipantByToken,
  getGroupChatTokenFromRequest
} from '@/lib/group-orders/chatAuth'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

const getParticipantByToken = getGroupChatParticipantByToken

function parseLimit(value: string | null): number {
  const parsed = value ? Number(value) : NaN
  if (!Number.isFinite(parsed)) return 50
  return Math.min(Math.max(Math.floor(parsed), 1), 200)
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { groupId } = await context.params
    await connectDB()

    // Admin can read without token
    const adminAuth = await requireAdminApi(request)
    const isAdmin = adminAuth.ok

    const settings = readPaymentSettings()
    if (!settings.groupOrders.chatEnabled && !isAdmin) {
      return NextResponse.json({ error: 'Fonctionnalité désactivée' }, { status: 403 })
    }

    const token = getGroupChatTokenFromRequest(request)
    if (!isAdmin) {
      if (!token) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
      const participant = await getParticipantByToken(groupId, token)
      if (!participant) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    const limit = parseLimit(searchParams.get('limit'))

    const messages = await listThreadMessages('group_order', groupId, { limit })

    return NextResponse.json({ messages: messages.map(toGroupOrderMessageDto) })
  } catch (error) {
    console.error('Erreur GET group chat messages:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const rateLimitResponse = await applyRateLimit(request, authRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const { groupId } = await context.params
    const body = await request.json().catch(() => ({}))
    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (text.length > MESSAGE_MAX_LENGTH.group_order) {
      return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    }

    if (!text && sanitizeAttachments((body as any).attachments).length === 0) {
      return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    }

    await connectDB()

    const adminAuth = await requireAdminApi(request)
    const isAdmin = adminAuth.ok

    const settings = readPaymentSettings()
    if (!settings.groupOrders.chatEnabled && !isAdmin) {
      return NextResponse.json({ error: 'Fonctionnalité désactivée' }, { status: 403 })
    }

    if (isAdmin && adminAuth.user) {
      const created = await postMessage({
        threadType: 'group_order',
        threadId: groupId,
        senderId: adminAuth.user.id,
        senderRole: 'admin',
        senderName: adminAuth.user.email || 'Admin',
        text,
        attachments: (body as any).attachments
      })

      return NextResponse.json({ message: toGroupOrderMessageDto(created) })
    }

    const token = getGroupChatTokenFromRequest(request, (body as any).token)
    if (!token) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const participant = await getParticipantByToken(groupId, token)
    if (!participant) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const created = await postMessage({
      threadType: 'group_order',
      threadId: groupId,
      senderRole: 'participant',
      senderParticipantId: participant.participantId || undefined,
      senderName: participant.name,
      text,
      attachments: (body as any).attachments
    })

    return NextResponse.json({ message: toGroupOrderMessageDto(created) })
  } catch (error) {
    console.error('Erreur POST group chat message:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
