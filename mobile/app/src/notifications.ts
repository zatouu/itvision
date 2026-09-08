import AsyncStorage from '@react-native-async-storage/async-storage'
import { connectSocket } from './socket'
import { scheduleLocalNotification, scheduleReminderAt } from './push'
import { apiGet } from './api'
import { getAuthUser, getUserIdFromToken } from './auth'
import { isProviderCapable } from './mode'

export type NotificationKind =
  | 'offer-received'
  | 'request-assigned'
  | 'request-status-changed'
  | 'request-new'
  | 'offer-accepted'
  | 'offer-rejected'
  | 'offer-counter'
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

const STORAGE_KEY = 'notifications'
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

/** L'utilisateur courant est-il le client (plutôt que le prestataire) de cette mission ? */
function isClientSide(payload: any): boolean {
  const uid = getUserIdFromToken() || getAuthUser()?._id
  if (uid && payload?.clientId && String(payload.clientId) === String(uid)) return true
  if (uid && payload?.providerId && String(payload.providerId) === String(uid)) return false
  // Fallback : si le user n'est pas prestataire, il est forcément côté client
  return !isProviderCapable()
}

/** À appeler une fois (depuis _layout) pour brancher les events WS au store. */
export function bindNotificationSocket() {
  if (wsBound) return
  wsBound = true
  const socket = connectSocket()

  // ── Côté client ──────────────────────────────────────────────────────────

  const onOfferReceived = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const category = typeof payload?.category === 'string' ? payload.category : null
    pushNotification({
      kind: 'offer-received',
      title: 'Nouvelle offre reçue',
      body: category ? `Un prestataire a répondu à votre demande (${category})` : 'Un prestataire a répondu à votre demande',
      link: requestId ? { pathname: `/offers/${requestId}` } : undefined,
    })
  }

  const onRequestAssigned = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const scheduledAt = payload?.scheduledFor ? new Date(payload.scheduledFor) : null
    const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now()
    pushNotification({
      kind: 'request-assigned',
      title: 'Prestataire assigné',
      body: isScheduled
        ? `Mission confirmée pour le ${scheduledAt!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${scheduledAt!.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
        : 'Votre prestataire est en route. Suivez la mission en temps réel.',
      link: requestId ? { pathname: `/mission/${requestId}` } : undefined,
    })
    // Rappel local 1h avant le créneau convenu (mission planifiée)
    if (isScheduled && scheduledAt) {
      const reminderAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000)
      const slot = `${scheduledAt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} ${scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      void scheduleReminderAt(
        '⏰ Mission dans 1 heure',
        `Votre prestataire est attendu à ${slot}.`,
        reminderAt,
        { type: 'mission-reminder', requestId }
      )
    }
  }

  // ── Côté prestataire ─────────────────────────────────────────────────────

  const onRequestNew = (payload: any) => {
    const category = typeof payload?.category === 'string' ? payload.category : null
    const desc = typeof payload?.description === 'string' ? payload.description.slice(0, 80) : null
    pushNotification({
      kind: 'request-new',
      title: category ? `Nouvelle demande — ${category}` : 'Nouvelle demande proche',
      body: desc || 'Un client vient de publier une demande dans votre zone.',
      link: { pathname: '/pro/nearby-requests' },
    })
  }

  const onOfferAccepted = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const scheduledAt = payload?.scheduledFor ? new Date(payload.scheduledFor) : null
    const isScheduled = scheduledAt && scheduledAt.getTime() > Date.now()
    pushNotification({
      kind: 'offer-accepted',
      title: 'Offre acceptée',
      body: isScheduled
        ? `Mission confirmée pour le ${scheduledAt!.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${scheduledAt!.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
        : 'Un client a choisi votre offre. La mission démarre.',
      link: requestId ? { pathname: `/pro/active-mission/${requestId}` } : { pathname: '/pro/my-offers' },
    })
    // Rappel local 1h avant le créneau convenu
    if (isScheduled && scheduledAt) {
      const reminderAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000)
      const slot = `${scheduledAt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })} ${scheduledAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      void scheduleReminderAt(
        '⏰ Mission dans 1 heure',
        `Vous avez une mission prévue à ${slot}. Préparez votre départ.`,
        reminderAt,
        { type: 'mission-reminder', requestId }
      )
    }
  }

  const onOfferRejected = () => {
    pushNotification({
      kind: 'offer-rejected',
      title: 'Offre refusée',
      body: 'Le client a sélectionné un autre prestataire.',
      link: { pathname: '/pro/my-offers' },
    })
  }

  const onOfferCounter = (payload: any) => {
    const price = Number(payload?.clientCounterPrice || 0)
    pushNotification({
      kind: 'offer-counter',
      title: '💬 Contre-offre client',
      body: price > 0 ? `Le client propose ${price.toLocaleString('fr-FR')} FCFA` : 'Le client a fait une contre-offre',
      link: { pathname: '/pro/my-offers' },
    })
  }

  // ── Partagé : changements de statut + chat ───────────────────────────────

  const onStatusChanged = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const status = String(payload?.status || '').toLowerCase()
    if (!status) return
    const clientSide = isClientSide(payload)
    const map: Record<string, { title: string; body: string }> = clientSide
      ? {
          provider_arriving: { title: '🚗 Prestataire en route', body: 'Votre prestataire est en route vers vous.' },
          in_progress: { title: 'Intervention démarrée', body: 'Le prestataire a démarré la mission.' },
          completed: { title: 'Mission terminée', body: 'Votre mission a été clôturée.' },
          cancelled: { title: 'Mission annulée', body: 'La mission a été annulée.' },
        }
      : {
          provider_arriving: { title: '🚗 En route', body: 'Vous avez indiqué être en route vers le client.' },
          cancelled: { title: 'Mission annulée par le client', body: 'La mission a été annulée.' },
        }
    const meta = map[status]
    if (!meta) return
    pushNotification({
      kind: 'request-status-changed',
      title: meta.title,
      body: meta.body,
      link: requestId
        ? { pathname: clientSide ? `/mission/${requestId}` : `/pro/active-mission/${requestId}` }
        : undefined,
    })
  }

  const onChatMessage = (payload: any) => {
    const requestId = String(payload?.requestId || '')
    const senderRole = String(payload?.senderRole || '')
    // Ignorer ses propres messages (le socket de l'expéditeur est aussi dans la room)
    const uid = getUserIdFromToken() || getAuthUser()?._id
    if (uid && payload?.senderId && String(payload.senderId) === String(uid)) return
    pushNotification({
      kind: 'mission-update',
      title: '💬 Nouveau message',
      body: senderRole === 'client'
        ? 'Le client vous a envoyé un message.'
        : 'Le prestataire vous a envoyé un message.',
      link: requestId ? { pathname: `/mission-chat`, params: { id: requestId } } : undefined,
    })
  }

  boundHandlers = {
    'user:offer-received': onOfferReceived,
    'user:request-assigned': onRequestAssigned,
    'request:nearby': onRequestNew,
    'offer:accepted': onOfferAccepted,
    'offer:rejected': onOfferRejected,
    'offer:counter': onOfferCounter,
    'request:status-changed': onStatusChanged,
    'mission:status-changed': onStatusChanged,
    'chat:message': onChatMessage,
  }

  for (const [event, fn] of Object.entries(boundHandlers)) {
    socket.on(event, fn)
  }
}
