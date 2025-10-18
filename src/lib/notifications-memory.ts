export type NotificationType = 'info' | 'success' | 'warning' | 'error'

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
}

let notifications: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'admin',
    type: 'warning',
    title: 'Maintenance programmée',
    message: '3 équipements nécessitent une maintenance cette semaine',
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl: '/admin-reports',
    metadata: { count: 3, type: 'maintenance' }
  },
  {
    id: 'notif-2',
    userId: 'admin',
    type: 'info',
    title: 'Nouveau rapport',
    message: "Un nouveau rapport d'intervention a été soumis par Moussa Diop",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/validation-rapports',
    metadata: { technicianId: 'TECH-001', reportId: 'RPT-001' }
  },
  {
    id: 'notif-3',
    userId: 'admin',
    type: 'success',
    title: 'Projet terminé',
    message: 'Le projet "Vidéosurveillance Siège" a été marqué comme terminé',
    read: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/gestion-projets',
    metadata: { projectId: 'PRJ-001', status: 'completed' }
  },
  {
    id: 'notif-4',
    userId: 'admin',
    type: 'error',
    title: 'Problème technique',
    message: 'Problème détecté sur le projet "Domotique Hôtel" - intervention requise',
    read: false,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    actionUrl: '/gestion-projets',
    metadata: { projectId: 'PRJ-005', severity: 'high' }
  }
]

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
  return final
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
