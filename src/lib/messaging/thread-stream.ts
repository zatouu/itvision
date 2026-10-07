import { listThreadMessages, type ThreadMessageDoc, type ThreadType } from '@/lib/messaging/thread-messages'
import { subscribeThread } from '@/lib/messaging/message-events'

const HEARTBEAT_MS = 15_000
// Filet de sécurité (plusieurs instances, événement manqué) : bien plus rare que l'ancien polling à 1 s
const SAFETY_POLL_MS = 15_000
const MAX_TRACKED_IDS = 500

export function parseSince(value: string | null): Date | null {
  if (!value) return null
  const asNumber = Number(value)
  const d = Number.isFinite(asNumber) ? new Date(asNumber) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function sseEvent(event: string, data: unknown, id?: string) {
  return `event: ${event}\n${id ? `id: ${id}\n` : ''}data: ${JSON.stringify(data)}\n\n`
}

interface ThreadStreamOptions {
  signal: AbortSignal
  threadType: ThreadType
  threadId: string
  /** Sans curseur, le flux démarre maintenant (pas de rejeu de l'historique). */
  since: Date | null
  toDto: (m: ThreadMessageDoc) => unknown
}

/**
 * Flux SSE d'un fil de messages : événements `ready`, `chat-message` et `read`.
 * Utilisable par les invités (lien de suivi, jeton d'achat groupé), contrairement au socket authentifié.
 */
export function createThreadEventStream(opts: ThreadStreamOptions): Response {
  const encoder = new TextEncoder()
  let lastCreatedAt = opts.since ?? new Date()
  const sentIds = new Set<string>()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const write = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          closed = true
        }
      }

      const sendMessage = (m: ThreadMessageDoc) => {
        const id = String(m._id)
        if (sentIds.has(id)) return
        sentIds.add(id)
        if (sentIds.size > MAX_TRACKED_IDS) sentIds.delete(sentIds.values().next().value as string)
        if (new Date(m.createdAt) > lastCreatedAt) lastCreatedAt = new Date(m.createdAt)
        write(sseEvent('chat-message', opts.toDto(m), id))
      }

      const catchUp = async () => {
        const docs = await listThreadMessages(opts.threadType, opts.threadId, { after: lastCreatedAt, limit: 200 })
        docs.forEach(sendMessage)
      }

      // Abonnement avant le rattrapage : aucun message ne peut passer entre les deux
      const unsubscribe = subscribeThread(opts.threadType, opts.threadId, (event) => {
        if (event.kind === 'message') sendMessage(event.message as ThreadMessageDoc)
        else write(sseEvent('read', { readerId: event.readerId, at: event.at }))
      })

      write(sseEvent('ready', { ok: true, threadId: opts.threadId, since: lastCreatedAt.toISOString() }))
      catchUp().catch(() => {})

      const pollTimer = setInterval(() => { catchUp().catch(() => {}) }, SAFETY_POLL_MS)
      const heartbeatTimer = setInterval(() => write(': heartbeat\n\n'), HEARTBEAT_MS)

      opts.signal.addEventListener('abort', () => {
        unsubscribe()
        clearInterval(pollTimer)
        clearInterval(heartbeatTimer)
        if (!closed) {
          closed = true
          try { controller.close() } catch { /* déjà fermé */ }
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
