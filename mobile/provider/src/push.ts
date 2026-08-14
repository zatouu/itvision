import { Platform } from 'react-native'
import { router } from 'expo-router'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'
import * as Device from 'expo-device'
import { apiPost, apiDelete } from './api'
import { pushNotification, NotificationKind } from './notifications'

/** Mappe le type de push serveur vers un kind + lien de navigation pour le store in-app. */
function mapPushToStore(title: string, body: string, data: any) {
  // Ne jamais re-stocker une notification locale émise par l'app elle-même (sinon boucle infinie)
  if (data?.localEcho) return
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

export interface PushTokenStatus {
  token: string | null
  projectId?: string
  platform: 'ios' | 'android' | 'web'
  permission: boolean
  error?: string
}

/**
 * Configure le handler de notification foreground — à appeler au démarrage (avant login).
 * Doit être appelé le plus tôt possible pour que les push reçus au premier plan affichent une alerte.
 */
export function setupNotificationHandler(): void {
  if (!isNative) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  })
}

/**
 * Récupère le statut du token push (permission + token + projectId) sans l'envoyer au serveur.
 * Utile pour l'écran de diagnostics.
 */
async function requestPushPermission(): Promise<boolean> {
  if (!isNative) return false
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function getPushTokenStatus(): Promise<PushTokenStatus> {
  if (!isNative) {
    return { token: null, platform: 'web', permission: false, error: 'Push non disponible sur web' }
  }

  if (!Device.isDevice) {
    return { token: null, platform: 'web', permission: false, error: 'Simulateur — push désactivé' }
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing !== 'granted') {
    return { token: null, platform, permission: false, error: 'Permission notifications refusée' }
  }

  try {
    const projectId = getProjectId()
    if (!projectId) {
      return { token: null, platform, permission: true, error: 'projectId EAS introuvable' }
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    return { token: tokenData.data, projectId, platform, permission: true }
  } catch (err: any) {
    // Fallback : token natif FCM/apns si Expo Push Service échoue (bare build custom)
    try {
      const native = await Notifications.getDevicePushTokenAsync()
      if (native?.data) {
        return { token: String(native.data), projectId: getProjectId(), platform, permission: true }
      }
    } catch (nativeErr: any) {
      console.warn('[Push] Fallback native token failed:', nativeErr.message)
    }
    return { token: null, platform, permission: true, error: err?.message || 'Erreur récupération token' }
  }
}

/**
 * Enregistre le token push auprès du serveur.
 * Doit être appelé au démarrage de l'app.
 */
export async function registerPushToken(): Promise<string | null> {
  if (!isNative) return null

  const permitted = await requestPushPermission()
  if (!permitted) {
    console.log('[Push] Permission refusée — token non enregistré')
    return null
  }

  const status = await getPushTokenStatus()
  if (!status.token) {
    console.warn('[Push] Impossible d\'obtenir un token:', status.error)
    return null
  }

  try {
    await apiPost('/api/notifications/push-token', {
      token: status.token,
      platform: status.platform,
      appType: 'provider',
    })
    console.log('[Push] Token enregistré côté serveur ✓', status.token.slice(0, 30))
    return status.token
  } catch (err: any) {
    console.warn('[Push] Erreur envoi token:', err?.message || err)
    return null
  }
}

/**
 * Désenregistre le token push du serveur — à appeler au logout.
 * Évite que le nouvel utilisateur reçoive les push de l'ancien.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!isNative) return
  try {
    const status = await getPushTokenStatus()
    if (!status.token) return
    await apiDelete(`/api/notifications/push-token?token=${encodeURIComponent(status.token)}`)
    console.log('[Push] Token désenregistré côté serveur ✓')
  } catch (err: any) {
    console.warn('[Push] Erreur désenregistrement token:', err?.message || err)
  }
}

/**
 * Programme une notification locale immédiatement pour vérifier que le plumbing
 * d'affichage (channel, handler, permission) fonctionne sur le device.
 */
export async function scheduleLocalNotification(title = 'Test local Pro', body = 'Si tu vois cette notification, le canal et les permissions fonctionnent.', data: any = { type: 'test:local' }): Promise<string | null> {
  if (!isNative) return null

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { ...data, localEcho: true },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        seconds: 1,
        channelId: 'services',
      },
    })
    console.log('[Push] Notification locale programmée:', id)
    return id
  } catch (err: any) {
    console.error('[Push] Erreur notification locale:', err?.message || err)
    return null
  }
}

/**
 * Configure le channel Android (requis Android 8+).
 */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return

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
    lightColor: '#0F7B4F',
  })
}

/**
 * Écoute les notifications reçues quand l'app est au premier plan,
 * et les ajoute au centre de notifications in-app.
 */
export function setupForegroundNotificationListener(): () => void {
  if (!isNative) return () => {}

  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const content = notification.request.content
    const data = content.data as any
    mapPushToStore(content.title || '', content.body || '', data)
  })

  return () => subscription.remove()
}

let pendingNav: string | null = null

export function setPendingNavigation(target: string): void {
  pendingNav = target
}

export function flushPendingNavigation(): void {
  if (pendingNav) {
    const target = pendingNav
    pendingNav = null
    router.push(target as any)
  }
}

export function navigateFromPushData(data: any): void {
  const target = resolveNavTarget(data)
  if (target) {
    setPendingNavigation(target)
    flushPendingNavigation()
  }
}

/**
 * Gère le tap sur une notification (background / app fermée).
 */
export function setupNotificationResponseListener(): () => void {
  if (!isNative) return () => {}

  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any
    if (!data?.type) return
    navigateFromPushData(data)
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

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK'

/**
 * Tâche de fond : enregistrer les notifications push dans le store in-app
 * même quand l'application est tuée (Android/iOS).
 */
if (isNative) {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, (body: any) => {
    try {
      const notification = body?.data?.notification ?? body?.notification ?? body?.data ?? body
      const requestContent = notification?.request?.content ?? notification?.content ?? notification
      const title = String(requestContent?.title || '')
      const bodyText = String(requestContent?.body || '')
      const data = requestContent?.data ?? notification?.data ?? {}
      if (title || bodyText) {
        mapPushToStore(title, bodyText, data)
      }
    } catch (err) {
      console.error('[Push] Background task error:', err)
    }
  })
}

/**
 * Enregistre la tâche de fond pour les push (doit être appelé au démarrage).
 * Utilise l'API expo-notifications dédiée (Notifications.registerTaskAsync).
 */
export async function registerBackgroundPushTask(): Promise<void> {
  if (!isNative) return
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)
    if (isRegistered) return
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK)
    console.log('[Push] Background task registered ✓')
  } catch (err: any) {
    console.warn('[Push] Background task registration failed:', err.message)
  }
}
