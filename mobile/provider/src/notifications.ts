import AsyncStorage from '@react-native-async-storage/async-storage'
import { connectSocket } from './socket'

export type NotificationKind =
  | 'request-new'
  | 'offer-accepted'
  | 'offer-rejected'
  | 'mission-update'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: number
  read: boolean
  link?: { pathname: string; params?: Record<string, string> }
}

const STORAGE_KEY = 'notifications:provider'
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
    // best-effort
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

  const onRequestNew = (payload: any) => {
    const category = typeof payload?.category === 'string' ? payload.category : null
    const desc = typeof payload?.description === 'string' ? payload.description.slice(0, 80) : null
    pushNotification({
      kind: 'request-new',
      title: category ? `Nouvelle demande — ${category}` : 'Nouvelle demande proche',
      body: desc || 'Un client vient de publier une demande dans votre zone.',
      link: { pathname: '/nearby-requests' },
    })
  }

  const onOfferAccepted = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    pushNotification({
      kind: 'offer-accepted',
      title: 'Offre acceptée',
      body: 'Un client a choisi votre offre. La mission démarre.',
      link: requestId ? { pathname: `/active-mission/${requestId}` } : { pathname: '/my-offers' },
    })
  }

  const onOfferRejected = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    pushNotification({
      kind: 'offer-rejected',
      title: 'Offre refusée',
      body: 'Le client a sélectionné un autre prestataire.',
      link: requestId ? { pathname: '/my-offers' } : { pathname: '/my-offers' },
    })
  }

  const onStatusChanged = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const status = String(payload?.status || '').toLowerCase()
    const map: Record<string, { title: string; body: string }> = {
      cancelled: { title: 'Mission annulée par le client', body: 'La mission a été annulée.' },
    }
    const meta = map[status]
    if (!meta) return
    pushNotification({
      kind: 'mission-update',
      title: meta.title,
      body: meta.body,
      link: requestId ? { pathname: `/active-mission/${requestId}` } : undefined,
    })
  }

  socket.on('request:new', onRequestNew)
  socket.on('offer:accepted', onOfferAccepted)
  socket.on('offer:rejected', onOfferRejected)
  socket.on('request:status-changed', onStatusChanged)
}
