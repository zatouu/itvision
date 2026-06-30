import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform, AppState } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import * as Updates from 'expo-updates'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { bindNotificationSocket, loadNotifications, resetNotificationBinding } from '../src/notifications'
import { registerPushToken, setupNotificationChannel, setupNotificationHandler, setupNotificationResponseListener, setupForegroundNotificationListener, flushPendingNavigation, registerBackgroundPushTask, navigateFromPushData } from '../src/push'
import { loadAuth, subscribeAuth, getAuthUser, clearAuth } from '../src/auth'
import { initOfflineReplay, setOnUnauthorized } from '../src/api'
import { resetSocket } from '../src/socket'
import { initSentry, setUser, clearUser } from '../src/sentry'
import '../src/i18n'
import { loadSavedLanguage } from '../src/i18n'

export default function Layout(){
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const segments = useSegments()

  // Sentry init avant tout
  useEffect(() => { initSentry() }, [])

  // Notification handler + channel (requis avant toute réception, surtout Android)
  useEffect(() => {
    setupNotificationHandler()
    registerBackgroundPushTask()
    if (Platform.OS === 'android') setupNotificationChannel()
  }, [])

  // 401 interceptor: auto-logout on token expiry
  useEffect(() => {
    setOnUnauthorized(() => {
      clearAuth()
      resetSocket()
      resetNotificationBinding()
      router.replace('/login')
    })
  }, [])

  // Check OTA updates au boot
  useEffect(() => {
    if (__DEV__) return
    Updates.checkForUpdateAsync().then(update => {
      if (update.isAvailable) {
        Updates.fetchUpdateAsync().then(() => {
          Alert.alert('Mise à jour', 'Une nouvelle version est disponible. Redémarrage...', [
            { text: 'OK', onPress: () => Updates.reloadAsync() }
          ])
        })
      }
    }).catch(() => { /* silently fail */ })
  }, [])

  // Charger l'auth au démarrage
  useEffect(() => {
    loadSavedLanguage()
    loadAuth().then(ok => {
      setLoggedIn(ok)
      if (ok) {
        const u = getAuthUser()
        if (u?._id) setUser(u._id, u.phone)
      }
      setReady(true)
    })
    return subscribeAuth(ok => {
      setLoggedIn(ok)
      if (!ok) clearUser()
    })
  }, [])

  // Auth guard : rediriger vers /login ou / selon l'état
  useEffect(() => {
    if (!ready) return
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'verify-otp'
    if (!loggedIn && !onAuthScreen) {
      router.replace('/login')
    } else if (loggedIn && onAuthScreen) {
      router.replace('/')
    } else if (loggedIn) {
      flushPendingNavigation()
    }
  }, [ready, loggedIn, segments])

  // Notification response listener — set up early (before login) to catch cold-start taps
  useEffect(() => {
    const stopNotifResponse = setupNotificationResponseListener()
    const Notifications = require('expo-notifications') as typeof import('expo-notifications')
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        if (response?.notification?.request?.content?.data) {
          navigateFromPushData(response.notification.request.content.data as any)
        }
      })
      .catch(() => { /* ignore */ })
    return () => stopNotifResponse()
  }, [])

  // Initialiser services une fois authentifié
  useEffect(() => {
    if (!loggedIn) return
    loadNotifications()
    bindNotificationSocket()
    if (Platform.OS !== 'android') setupNotificationChannel()
    registerPushToken()
    const stopQueueReplay = initOfflineReplay()
    const stopForegroundListener = setupForegroundNotificationListener()

    // Re-vérifier le token push à chaque retour au premier plan (changement de token, nouvelle install, etc.)
    const appStateSub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        console.log('[Push] App au premier plan — re-vérification token')
        registerPushToken().catch(() => {})
      }
    })

    return () => {
      stopQueueReplay()
      stopForegroundListener()
      appStateSub.remove()
    }
  }, [loggedIn])

  if (!ready) {
    return (
      <View style={s.splash}>
        <Text style={s.splashName}>Xeuy Bi</Text>
        <Text style={s.splashSub}>Services à domicile</Text>
        <ActivityIndicator size="small" color="#64748B" style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  )
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  splashName: { fontSize: 36, fontWeight: '800', color: '#F8FAFC', letterSpacing: -1 },
  splashSub: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
})
