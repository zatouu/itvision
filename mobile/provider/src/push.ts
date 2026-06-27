import { Platform } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import { apiPost } from './api'
import { pushNotification, NotificationKind } from './notifications'

/** Mappe le type de push serveur vers un kind + lien de navigation pour le store in-app. */
function mapPushToStore(title: string, body: string, data: any) {
  const type = String(data?.type || '')
  const requestId = data?.requestId ? String(data.requestId) : ''
  let kind: NotificationKind = 'mission-update'
  let link: { pathname: string; params?: Record<string, string> } | undefined

  if (type === 'request:new') {
    kind = 'request-new'
    link = { pathname: '/nearby-requests' }
  } else if (type === 'offer:accepted') {
    kind = 'offer-accepted'
    link = requestId ? { pathname: `/active-mission/${requestId}` } : { pathname: '/my-offers' }
  } else if (type === 'offer:rejected') {
    kind = 'offer-rejected'
    link = { pathname: '/my-offers' }
  } else if (type === 'offer:counter') {
    kind = 'offer-counter'
    link = { pathname: '/my-offers' }
  } else if (type === 'payment:released') {
    kind = 'mission-update'
    if (requestId) link = { pathname: `/active-mission/${requestId}` }
  } else if (type === 'request:status-changed') {
    kind = 'mission-update'
    if (requestId) link = { pathname: `/active-mission/${requestId}` }
  } else if (type === 'chat:message') {
    kind = 'mission-update'
    if (requestId) link = { pathname: '/mission-chat', params: { id: requestId } }
  }

  void pushNotification({ kind, title: title || 'Notification', body: body || '', link })
}

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

function getProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_PROJECT_ID
    || (Constants?.expoConfig as any)?.extra?.eas?.projectId
    || (Constants as any)?.easConfig?.projectId
  )
}

/**
 * Configure le handler de notification foreground — à appeler au démarrage (avant login).
 * Doit être appelé le plus tôt possible pour que les push reçus au premier plan affichent une alerte.
 */
export function setupNotificationHandler(): void {
  if (!isNative) return
  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

/**
 * Enregistre le token push auprès du serveur.
 * Doit être appelé au démarrage de l'app.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!isNative) return null

  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  const Device = require('expo-device') as typeof import('expo-device')

  if (!Device.isDevice) {
    console.log('[Push] Pas un appareil physique — push désactivé')
    return null
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (finalStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    console.log('[Push] Permission refusée')
    return null
  }

  try {
    const projectId = getProjectId()
    if (!projectId) {
      console.warn('[Push] projectId introuvable (Constants.expoConfig.extra.eas.projectId manquant)')
      return null
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    const token = tokenData.data
    console.log('[Push] Token récupéré:', token.slice(0, 30) + '...')

    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    await apiPost('/api/notifications/push-token', { token, platform, appType: 'provider' })
      .then(() => console.log('[Push] Token enregistré côté serveur ✓'))
      .catch(err => console.warn('[Push] Erreur envoi token:', err?.message || err))

    return token
  } catch (err: any) {
    console.error('[Push] Erreur récupération token:', err?.message || err)
    return null
  }
}

/**
 * Configure le channel Android (requis Android 8+).
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return

  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Général',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
  })
  await Notifications.setNotificationChannelAsync('services', {
    name: 'Demandes & Missions',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#F59E0B',
  })
}

/**
 * Écoute les notifications reçues quand l'app est au premier plan,
 * et les ajoute au centre de notifications in-app.
 */
export function setupForegroundNotificationListener(): () => void {
  if (!isNative) return () => {}

  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const content = notification.request.content
    const data = content.data as any
    mapPushToStore(content.title || '', content.body || '', data)
  })

  return () => subscription.remove()
}

let pendingNav: string | null = null

export function flushPendingNavigation(): void {
  if (pendingNav) {
    const target = pendingNav
    pendingNav = null
    router.push(target as any)
  }
}

/**
 * Gère le tap sur une notification (background / app fermée).
 */
export function setupNotificationResponseListener(): () => void {
  if (!isNative) return () => {}

  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any
    if (!data?.type) return

    const target = resolveNavTarget(data)
    if (target) {
      pendingNav = target
      flushPendingNavigation()
    }
  })

  return () => subscription.remove()
}

export function resolveNavTarget(data: any): string | null {
  switch (data.type) {
    case 'request:new':
      return '/nearby-requests'
    case 'offer:accepted':
      return data.requestId ? `/active-mission/${data.requestId}` : '/my-offers'
    case 'offer:rejected':
      return '/my-offers'
    case 'offer:counter':
      return '/my-offers'
    case 'payment:released':
      return data.requestId ? `/active-mission/${data.requestId}` : null
    case 'request:status-changed':
      return data.requestId ? `/active-mission/${data.requestId}` : null
    case 'chat:message':
      return data.requestId ? `/mission-chat?id=${data.requestId}` : null
    default:
      if (data.requestId) return `/active-mission/${data.requestId}`
      return '/notifications'
  }
}
