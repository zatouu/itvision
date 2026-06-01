import { Platform } from 'react-native'
import { router } from 'expo-router'
import { apiPost } from './api'

const isNative = Platform.OS === 'ios' || Platform.OS === 'android'

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

  // Configuration du comportement en foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })

  // Demander la permission
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

  // Obtenir le token Expo
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
    const token = tokenData.data

    const platform = Platform.OS === 'ios' ? 'ios' : 'android'
    await apiPost('/api/notifications/push-token', { token, platform })
      .catch(err => console.warn('[Push] Erreur envoi token:', err.message))

    return token
  } catch (err: any) {
    console.error('[Push] Erreur récupération token:', err.message)
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
    name: 'Services & Missions',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#F59E0B',
  })
}

/**
 * Gère le tap sur une notification (quand l'app est en background ou fermée).
 */
export function setupNotificationResponseListener(): () => void {
  if (!isNative) return () => {}

  const Notifications = require('expo-notifications') as typeof import('expo-notifications')
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as any
    if (!data?.type) return

    switch (data.type) {
      case 'offer:new':
        if (data.requestId) router.push(`/request-offers?id=${data.requestId}`)
        break
      case 'request:status-changed':
        if (data.requestId) router.push(`/mission/${data.requestId}`)
        break
      case 'request:new':
        router.push('/my-requests')
        break
      default:
        router.push('/notifications')
    }
  })

  return () => subscription.remove()
}
