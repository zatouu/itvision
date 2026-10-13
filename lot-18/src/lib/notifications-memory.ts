export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export type AppNotificationKind =
  | 'offer-received'
  | 'request-assigned'
  | 'request-status-changed'
  | 'mission-update'
  | 'request-new'
  | 'offer-accepted'
  | 'offer-rejected'
  | 'offer-counter'
  | 'info'

export interface AppNotification {
  id: string
  userId: string // 'admin' or specific userId
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  metadata?: any
  // App/mobile fields (used by push notifications)
  kind?: AppNotificationKind
  body?: string
  link?: { pathname: string; params?: Record<string, string> }
}

let notifications: AppNotification[] = []

// Write-through Mongo : les appelants legacy (interventions, maintenance…)
// alimentent aussi InAppNotification — lu par /api/notifications (persistant).
// userId 'admin' → diffusion aux rôles admin.
function persistToMongo(note: AppNotification) {
  const isAdminChannel = note.userId === 'admin'
  const userId = isAdminChannel || note.userId === 'all' ? undefined : note.userId
  const roles = isAdminChannel ? ['ADMIN', 'SUPER_ADMIN'] : note.userId === 'all' ? ['CLIENT'] : undefined
  const actionUrl = note.actionUrl || note.link?.pathname

  void Promise.all([
    import('@/lib/mongoose').then(m => m.connectMongoose()),
    import('@/lib/models/InAppNotification'),
  ])
    .then(([, mod]) =>
      (mod.default as any).create({
        userId,
        roles,
        type: note.type,
        title: note.title,
        message: note.message,
        actionUrl,
        metadata: note.metadata,
      })
    )
    .catch(err => console.error('[notifications] mongo write-through failed:', err))
}

export function getNotifications(): AppNotification[] {
  return notifications
}

export function addNotification(note: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string; createdAt?: string; read?: boolean }): AppNotification {
  const final: AppNotification = {
    id: note.id || `notif-${Date.now()}`,
    userId: note.userId,
    type: note.type,
    title: note.title,
    message: note.message,
    actionUrl: note.actionUrl,
    metadata: note.metadata,
    read: note.read ?? false,
    createdAt: note.createdAt || new Date().toISOString(),
  }
  notifications.unshift(final)
  if (notifications.length > 100) notifications = notifications.slice(0, 100)
  persistToMongo(final)
  return final
}

export function addAppNotification(
  userId: string,
  kind: AppNotificationKind,
  title: string,
  body: string,
  link?: { pathname: string; params?: Record<string, string> },
  metadata?: any
): AppNotification {
  const type: NotificationType =
    kind === 'offer-accepted' || kind === 'request-assigned' ? 'success'
    : kind === 'offer-rejected' ? 'error'
    : kind === 'offer-counter' ? 'warning'
    : 'info'
  const note: AppNotification = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    title,
    message: body,
    body,
    kind,
    link,
    metadata,
    read: false,
    createdAt: new Date().toISOString(),
  }
  notifications.unshift(note)
  if (notifications.length > 100) notifications = notifications.slice(0, 100)
  persistToMongo(note)
  return note
}

export function markAllAsReadFor(targets: Set<string>) {
  notifications = notifications.map(n => (targets.has(n.userId) ? { ...n, read: true } : n))
}

export function markAsRead(ids: string[], targets: Set<string>) {
  notifications = notifications.map(n => (ids.includes(n.id) && targets.has(n.userId) ? { ...n, read: true } : n))
}

export function deleteById(id: string, targets: Set<string>): boolean {
  const lengthBefore = notifications.length
  notifications = notifications.filter(n => !(n.id === id && targets.has(n.userId)))
  return notifications.length < lengthBefore
}

export function deleteAllFor(targets: Set<string>): number {
  const lengthBefore = notifications.length
  notifications = notifications.filter(n => !targets.has(n.userId))
  return lengthBefore - notifications.length
}
