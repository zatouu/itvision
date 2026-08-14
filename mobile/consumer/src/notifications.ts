import AsyncStorage from '@react-native-async-storage/async-storage'
import { connectSocket } from './socket'
import { scheduleLocalNotification } from './push'
import { apiGet } from './api'

export type NotificationKind =
  | 'offer-received'
  | 'request-assigned'
  | 'request-status-changed'
  | 'mission-update'
  | 'info'

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
let loadingPromise: Promise<Notification[]> | null = null
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

function mapBackendNotification(n: any): Notification | null {
  if (!n || !n.id) return null
  const id = String(n.id)
  const kind: NotificationKind = n.kind || 'info'
  const title = String(n.title || 'Notification')
  const body = String(n.body || n.message || '')
  const createdAt = new Date(n.createdAt || Date.now()).getTime()
  if (!Number.isFinite(createdAt)) return null
  const link = n.link || (n.actionUrl ? { pathname: n.actionUrl } : undefined)
  return { id, kind, title, body, createdAt, read: !!n.read, link }
}

/** Fetch notifications persisted server-side and merge them with the local cache.
 * This covers notifications received while the app was killed or when the local cache was cleared. */
export async function loadBackendNotifications(): Promise<Notification[]> {
  await loadNotifications()
  try {
    const r: any = await apiGet('/api/notifications')
    const backend = (r.notifications || [])
      .map(mapBackendNotification)
      .filter(Boolean) as Notification[]
    const backendKey = (n: Notification) => `${n.kind}|${n.title}|${n.body}`
    const backendKeys = new Set(backend.map(backendKey))
    // Merge with local cache: preserve read=true if either side has read it.
    const mergedBackend = backend.map(n => {
      const local = cache.find(c => backendKey(c) === backendKey(n))
      return { ...n, read: n.read || (local?.read ?? false) }
    })
    const merged = [
      ...mergedBackend,
      ...cache.filter(n => !backendKeys.has(backendKey(n))),
    ].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_KEEP)
    cache = merged
    await persist()
    emit()
  } catch (e) {
    console.warn('[Notifications] backend sync failed:', e)
  }
  return cache
}

/** Force le rechargement depuis AsyncStorage (notifs écrites par la background task quand l'app était fermée). */
export async function reloadNotifications(): Promise<Notification[]> {
  loaded = false
  loadingPromise = null
  const fresh = await loadNotifications()
  emit()
  return fresh
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
const MAX_RECENT_KEYS = 200

export async function pushNotification(input: Omit<Notification, 'id' | 'createdAt' | 'read'>): Promise<void> {
  await loadNotifications()

  // Déduplication: ignore une notif identique (kind+title+body) reçue dans les 4 dernières secondes
  // (un même event peut être émis vers plusieurs rooms socket + push foreground)
  const key = `${input.kind}|${input.title}|${input.body}`
  const now = Date.now()
  const last = recentKeys.get(key)
  if (last && now - last < DEDUPE_WINDOW_MS) return
  recentKeys.set(key, now)
  // Nettoyage léger des clés anciennes + limite de taille
  if (recentKeys.size > MAX_RECENT_KEYS) {
    recentKeys.clear()
    recentKeys.set(key, now)
  } else {
    for (const [k, ts] of recentKeys) {
      if (now - ts > DEDUPE_WINDOW_MS) recentKeys.delete(k)
    }
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

  // Also surface a local system notification so the user sees it even when the app is foreground
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

/** Wipe everything — called on logout so the next user doesn't see stale notifications. */
export async function resetAllNotifications(): Promise<void> {
  cache = []
  loaded = false
  loadingPromise = null
  recentKeys.clear()
  try { await AsyncStorage.removeItem(STORAGE_KEY) } catch {}
  emit()
}

let wsBound = false
let boundHandlers: Record<string, (payload: any) => void> = {}

/** Reset le flag de binding et retire les listeners (à appeler après resetSocket / logout). */
export function resetNotificationBinding() {
  if (wsBound) {
    const socket = connectSocket()
    for (const [event, fn] of Object.entries(boundHandlers)) {
      socket.off(event, fn)
    }
  }
  wsBound = false
  boundHandlers = {}
}

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
      provider_arriving: { title: '🚗 Prestataire en route', body: 'Votre prestataire est en route vers vous.' },
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

  const onChatMessage = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const senderRole = String(payload?.senderRole || '')
    if (senderRole === 'client') return
    pushNotification({
      kind: 'mission-update',
      title: '💬 Nouveau message',
      body: 'Le prestataire vous a envoyé un message.',
      link: requestId ? { pathname: `/mission-chat`, params: { id: requestId } } : undefined,
    })
  }

  boundHandlers = {
    'user:offer-received': onOfferReceived,
    'user:request-assigned': onRequestAssigned,
    'request:status-changed': onStatusChanged,
    'chat:message': onChatMessage,
  }

  for (const [event, fn] of Object.entries(boundHandlers)) {
    socket.on(event, fn)
  }
}
