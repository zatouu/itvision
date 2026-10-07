import { NextRequest } from 'next/server'
import { toOrderMessageDto } from '@/lib/messaging/thread-messages'
import { createThreadEventStream, parseSince } from '@/lib/messaging/thread-stream'
import { resolveOrderChatAccess } from '@/lib/messaging/order-chat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/order-chat/stream?orderReference=...&token=...&since=... — flux temps réel (SSE) du chat commande
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderReference = searchParams.get('orderReference')
    if (!orderReference) return new Response('orderReference requis', { status: 400 })

    const access = await resolveOrderChatAccess(request, orderReference, searchParams.get('token'))
    if (!access.ok) return new Response(access.error, { status: access.status })

    return createThreadEventStream({
      signal: request.signal,
      threadType: 'order',
      threadId: orderReference,
      since: parseSince(searchParams.get('since')),
      toDto: toOrderMessageDto,
    })
  } catch (error) {
    console.error('[order-chat] Erreur SSE:', error)
    return new Response('Server error', { status: 500 })
  }
}
