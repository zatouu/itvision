import { apiGet } from './api'
import { connectSocket } from './socket'

/**
 * Inbox "Messages" — conversations de mission (client ↔ prestataire).
 * Module léger : cache en mémoire + listeners pour les badges.
 * La source de vérité reste /api/services/chat/conversations.
 */

export type Conversation = {
  requestId: string
  category: string
  status: string
  description: string
  otherParty: { id: string; name: string; avatarUrl?: string; verified: boolean; trade?: string }
  lastMessage: { text: string; createdAt: string; senderRole: string; mine: boolean } | null
  unreadCount: number
  updatedAt: string
}

let _items: Conversation[] = []
let _totalUnread = 0
let _loaded = false
let _loading: Promise<void> | null = null
const listeners = new Set<() => void>()
let socketBound = false

function notify() { listeners.forEach(fn => fn()) }

export function subscribeInbox(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getInboxState() {
  return { items: _items, totalUnread: _totalUnread, loaded: _loaded }
}

/** Recharge les conversations depuis l'API et notifie les abonnés. */
export async function loadInbox(force = false): Promise<void> {
  if (_loading && !force) return _loading
  _loading = (async () => {
    try {
      const r = await apiGet('/api/services/chat/conversations')
      _items = Array.isArray(r.items) ? r.items : []
      _totalUnread = r.totalUnread ?? _items.reduce((s, c) => s + (c.unreadCount || 0), 0)
      _loaded = true
    } catch {
      // silencieux — l'inbox reste sur son dernier état connu
    } finally {
      _loading = null
    }
    notify()
  })()
  return _loading
}

/** Invalide le cache local (ex. après lecture d'une conversation). */
export function markConversationRead(requestId: string) {
  const conv = _items.find(c => c.requestId === requestId)
  if (conv && conv.unreadCount > 0) {
    _totalUnread = Math.max(0, _totalUnread - conv.unreadCount)
    conv.unreadCount = 0
    notify()
  }
}

/** Abonné au socket 'chat:message' — un appel suffit (idempotent). */
export function bindInboxSocket() {
  if (socketBound) return
  socketBound = true
  const socket = connectSocket()
  socket.on('chat:message', () => { loadInbox(true) })
}
