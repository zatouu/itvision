import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import { readPaymentSettings } from '@/lib/payments/settings'
import { toGroupOrderMessageDto } from '@/lib/messaging/thread-messages'
import { createThreadEventStream, parseSince } from '@/lib/messaging/thread-stream'
import {
  getGroupChatParticipantByToken,
  getGroupChatTokenFromRequest
} from '@/lib/group-orders/chatAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { groupId } = await context.params

  try {
    await connectDB()

    // Admin can connect without token (cookies)
    const adminAuth = await requireAdminApi(request)
    const isAdmin = adminAuth.ok

    const settings = readPaymentSettings()
    if (!settings.groupOrders.chatEnabled && !isAdmin) {
      return new Response('Forbidden', { status: 403 })
    }

    const token = getGroupChatTokenFromRequest(request)
    if (!isAdmin) {
      if (!token) {
        return new Response('Forbidden', { status: 403 })
      }
      const participant = await getGroupChatParticipantByToken(groupId, token)
      if (!participant) {
        return new Response('Forbidden', { status: 403 })
      }
    }

    const { searchParams } = new URL(request.url)
    return createThreadEventStream({
      signal: request.signal,
      threadType: 'group_order',
      threadId: groupId,
      since: parseSince(searchParams.get('since')),
      toDto: toGroupOrderMessageDto,
    })
  } catch (error) {
    console.error('Erreur SSE group chat stream:', error)
    return new Response('Server error', { status: 500 })
  }
}
