import AsyncStorage from '@react-native-async-storage/async-storage'
import { connectSocket } from './socket'

export type NotificationKind =
  | 'offer-received'
  | 'request-assigned'
  | 'request-status-changed'
  | 'mission-update'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: number
  read: boolean
  /** Cible de navigation suggérée */
  link?: { pathname: string; params?: Record<string, string> }
}

const STORAGE_KEY = 'notifications:consumer'
const MAX_KEEP = 60

let cache: Notification[] = []
let loaded = false
const listeners = new Set<(items: Notification[]) => void>()

function emit() {
  for (const fn of listeners) fn(cache)
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache.slice(0, MAX_KEEP)))
  } catch {
    // best-effort: non bloquant
  }
}

export async function loadNotifications(): Promise<Notification[]> {
  if (!loaded) {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      cache = raw ? (JSON.parse(raw) as Notification[]) : []
    } catch {
      cache = []
    }
    loaded = true
  }
  return cache
}

export function subscribeNotifications(fn: (items: Notification[]) => void): () => void {
  listeners.add(fn)
  fn(cache)
  return () => { listeners.delete(fn) }
}

export function unreadCount(): number {
  return cache.reduce((n, item) => (item.read ? n : n + 1), 0)
}

export async function pushNotification(input: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  await loadNotifications()
  const notif: Notification = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
  }
  cache = [notif, ...cache].slice(0, MAX_KEEP)
  await persist()
  emit()
}

export async function markAllRead(): Promise<void> {
  await loadNotifications()
  if (!cache.some(n => !n.read)) return
  cache = cache.map(n => ({ ...n, read: true }))
  await persist()
  emit()
}

export async function markRead(id: string): Promise<void> {
  await loadNotifications()
  const next = cache.map(n => (n.id === id ? { ...n, read: true } : n))
  if (next.some((n, i) => n.read !== cache[i]?.read)) {
    cache = next
    await persist()
    emit()
  }
}

export async function clearNotifications(): Promise<void> {
  await loadNotifications()
  if (cache.length === 0) return
  cache = []
  await persist()
  emit()
}

let wsBound = false

/** À appeler une fois (depuis _layout) pour brancher les events WS au store. */
export function bindNotificationSocket() {
  if (wsBound) return
  wsBound = true
  const socket = connectSocket()

  const onOfferReceived = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const category = typeof payload?.category === 'string' ? payload.category : null
    pushNotification({
      kind: 'offer-received',
      title: 'Nouvelle offre reçue',
      body: category ? `Un prestataire a répondu à votre demande (${category})` : 'Un prestataire a répondu à votre demande',
      link: requestId ? { pathname: '/request-offers', params: { id: requestId } } : undefined,
    })
  }

  const onRequestAssigned = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    pushNotification({
      kind: 'request-assigned',
      title: 'Prestataire assigné',
      body: 'Votre prestataire est en route. Suivez la mission en temps réel.',
      link: requestId ? { pathname: `/mission/${requestId}` } : undefined,
    })
  }

  const onStatusChanged = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const status = String(payload?.status || '').toLowerCase()
    if (!status) return
    const map: Record<string, { title: string; body: string }> = {
      in_progress: { title: 'Intervention démarrée', body: 'Le prestataire a démarré la mission.' },
      completed: { title: 'Mission terminée', body: 'Votre mission a été clôturée.' },
      cancelled: { title: 'Mission annulée', body: 'La mission a été annulée.' },
    }
    const meta = map[status]
    if (!meta) return
    pushNotification({
      kind: 'request-status-changed',
      title: meta.title,
      body: meta.body,
      link: requestId ? { pathname: `/mission/${requestId}` } : undefined,
    })
  }

  socket.on('user:offer-received', onOfferReceived)
  socket.on('user:request-assigned', onRequestAssigned)
  socket.on('request:status-changed', onStatusChanged)
}
