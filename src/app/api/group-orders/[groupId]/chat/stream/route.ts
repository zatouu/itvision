import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import { readPaymentSettings } from '@/lib/payments/settings'
import { GroupOrderChatMessage } from '@/lib/models/GroupOrderChatMessage'
import {
  getGroupChatParticipantByToken,
  getGroupChatTokenFromRequest
} from '@/lib/group-orders/chatAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

function parseSince(value: string | null): Date | null {
  if (!value) return null

  const asNumber = Number(value)
  if (Number.isFinite(asNumber)) {
    const d = new Date(asNumber)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function sseEvent({ event, id, data }: { event: string; id?: string; data: any }) {
  const payload = JSON.stringify(data)
  return `${event ? `event: ${event}\n` : ''}${id ? `id: ${id}\n` : ''}data: ${payload}\n\n`
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
    const since = parseSince(searchParams.get('since'))

    // If client doesn't provide a cursor, start from "now" to avoid replaying history.
    let lastCreatedAt = since ?? new Date()

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false

        const write = (chunk: string) => {
          if (closed) return
          controller.enqueue(encoder.encode(chunk))
        }

        const close = () => {
          if (closed) return
          closed = true
          try {
            controller.close()
          } catch {
            // ignore
          }
        }

        const poll = async () => {
          const docs = await GroupOrderChatMessage.find({
            groupId,
            createdAt: { $gt: lastCreatedAt }
          })
            .sort({ createdAt: 1 })
            .limit(200)
            .lean()

          for (const m of docs) {
            lastCreatedAt = m.createdAt
            write(
              sseEvent({
                event: 'chat-message',
                id: String(m._id),
                data: {
                  id: String(m._id),
                  groupId: m.groupId,
                  authorType: m.authorType,
                  authorParticipantId: m.authorParticipantId || null,
                  authorName: m.authorName,
                  text: m.text,
                  createdAt: m.createdAt
                }
              })
            )
          }
        }

        // Initial signal (useful for debugging / client state)
        write(
          sseEvent({
            event: 'ready',
            data: { ok: true, groupId, since: lastCreatedAt.toISOString() }
          })
        )

        const pollTimer = setInterval(() => {
          poll().catch(() => {
            // swallow; client will retry or fallback
          })
        }, 1000)

        const heartbeatTimer = setInterval(() => {
          write(': heartbeat\n\n')
        }, 15000)

        const onAbort = () => {
          clearInterval(pollTimer)
          clearInterval(heartbeatTimer)
          close()
        }

        request.signal.addEventListener('abort', onAbort)

        // Fire an immediate poll to reduce perceived latency
        poll().catch(() => {
          // ignore
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    })
  } catch (error) {
    console.error('Erreur SSE group chat stream:', error)
    return new Response('Server error', { status: 500 })
  }
}
