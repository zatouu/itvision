/// <reference lib="webworker" />

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || ''

self.addEventListener('push', (event: any) => {
  if (!event || !event.data) return
  const data = event.data.json() || {}

  const title = data.title || 'DDM+'
  const options: NotificationOptions & { actions?: any[] } = {
    body: data.body || 'Nouvelle notification',
    icon: data.icon || '/android-chrome-192x192.png',
    badge: data.badge || '/android-chrome-192x192.png',
    tag: data.tag || data.url || 'ddm-push',
    data: { url: data.url || '/', ...data.data },
    requireInteraction: !!data.requireInteraction,
    actions: Array.isArray(data.actions) ? data.actions : []
  }

  event.waitUntil(
    (self as any).registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event: any) => {
  event.notification.close()
  const data = event.notification?.data || {}
  const url = data.url || '/'
  event.waitUntil(
    (self as any).clients.openWindow(url)
  )
})

// Subscribe the service worker to push notifications when activated
self.addEventListener('activate', () => {
  (self as any).registration?.update?.()
})

export {}
