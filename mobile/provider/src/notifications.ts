import AsyncStorage from '@react-native-async-storage/async-storage'
import { connectSocket } from './socket'
import { scheduleLocalNotification } from './push'

export type NotificationKind =
  | 'request-new'
  | 'offer-accepted'
  | 'offer-rejected'
  | 'offer-counter'
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
let loadingPromise: Promise<Notification[]> | null = null
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

async function doLoad(): Promise<Notification[]> {
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

export async function loadNotifications(): Promise<Notification[]> {
  if (loaded) return cache
  if (loadingPromise) return loadingPromise
  loadingPromise = doLoad().finally(() => { loadingPromise = null })
  return loadingPromise
}

export function subscribeNotifications(fn: (items: Notification[]) => void): () => void {
  listeners.add(fn)
  fn(cache)
  return () => { listeners.delete(fn) }
}

export function unreadCount(): number {
  return cache.reduce((n, item) => (item.read ? n : n + 1), 0)
}

const recentKeys = new Map<string, number>()
const DEDUPE_WINDOW_MS = 4000

export async function pushNotification(input: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  await loadNotifications()

  // Déduplication: ignore une notif identique (kind+title+body) reçue dans les 4 dernières secondes
  // (un même event peut être émis vers plusieurs rooms socket + push foreground)
  const key = `${input.kind}|${input.title}|${input.body}`
  const now = Date.now()
  const last = recentKeys.get(key)
  if (last && now - last < DEDUPE_WINDOW_MS) return
  recentKeys.set(key, now)
  for (const [k, ts] of recentKeys) {
    if (now - ts > DEDUPE_WINDOW_MS) recentKeys.delete(k)
  }

  const notif: Notification = {
    ...input,
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    read: false,
  }
  cache = [notif, ...cache].slice(0, MAX_KEEP)
  await persist()
  emit()

  // Also surface a local system notification so the provider sees it even when the app is foreground
  try {
    await scheduleLocalNotification(input.title, input.body, { type: input.kind, link: input.link })
  } catch {
    // best-effort: local notification is not critical
  }
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

/** Reset le flag de binding (à appeler après resetSocket / logout). */
export function resetNotificationBinding() {
  wsBound = false
}

/** À appeler une fois (depuis _layout) pour brancher les events WS au store. */
export function bindNotificationSocket() {
  if (wsBound) return
  wsBound = true
  const socket = connectSocket()

  // Rejoindre la room provider-{userId} pour recevoir les events ciblés
  const joinProvider = () => socket.emit('join-provider-channel')
  if (socket.connected) joinProvider()
  else socket.once('connect', joinProvider)

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

  const onOfferRejected = () => {
    pushNotification({
      kind: 'offer-rejected',
      title: 'Offre refusée',
      body: 'Le client a sélectionné un autre prestataire.',
      link: { pathname: '/my-offers' },
    })
  }

  const onStatusChanged = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const status = String(payload?.status || '').toLowerCase()
    const map: Record<string, { title: string; body: string }> = {
      provider_arriving: { title: '🚗 En route', body: 'Vous avez indiqué être en route vers le client.' },
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

  const onOfferCounter = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const price = Number(payload?.clientCounterPrice || 0)
    pushNotification({
      kind: 'offer-counter',
      title: '💬 Contre-offre client',
      body: price > 0 ? `Le client propose ${price.toLocaleString('fr-FR')} FCFA` : 'Le client a fait une contre-offre',
      link: { pathname: '/my-offers' },
    })
  }

  const onChatMessage = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const senderRole = String(payload?.senderRole || '')
    if (senderRole === 'provider') return
    pushNotification({
      kind: 'mission-update',
      title: '💬 Nouveau message',
      body: 'Le client vous a envoyé un message.',
      link: requestId ? { pathname: `/mission-chat`, params: { id: requestId } } : undefined,
    })
  }

  socket.on('request:nearby', onRequestNew)
  socket.on('offer:accepted', onOfferAccepted)
  socket.on('offer:rejected', onOfferRejected)
  socket.on('offer:counter', onOfferCounter)
  socket.on('mission:status-changed', onStatusChanged)
  socket.on('chat:message', onChatMessage)
}
