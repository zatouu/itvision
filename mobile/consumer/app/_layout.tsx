import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform, AppState } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import * as Updates from 'expo-updates'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { bindNotificationSocket, loadNotifications } from '../src/notifications'
import { registerPushToken, setupNotificationChannel, setupNotificationHandler, setupNotificationResponseListener, setupForegroundNotificationListener, flushPendingNavigation, registerBackgroundPushTask, navigateFromPushData } from '../src/push'
import { loadAuth, subscribeAuth, getAuthUser, clearAuth } from '../src/auth'
import { initOfflineReplay, setOnUnauthorized, resetUnauthorizedFlag } from '../src/api'
import { clearAllUserData } from '../src/clear-user-data'
import { initSentry, setUser, clearUser } from '../src/sentry'
import { ToastHost } from '../src/toast'
import { OptionSheetHost } from '../src/option-sheet'
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
      clearAllUserData()
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
      if (ok) resetUnauthorizedFlag()
      if (!ok) clearUser()
    })
  }, [])

  // Auth guard : rediriger vers /login ou / selon l'état
  useEffect(() => {
    if (!ready) return
    const onLoginScreen = segments[0] === 'login' || segments[0] === 'verify-otp'
    const onSetupScreen = segments[0] === 'setup-profile'
    if (!loggedIn && !onLoginScreen) {
      router.replace('/login')
    } else if (loggedIn && onLoginScreen) {
      router.replace('/')
    } else if (loggedIn && !onSetupScreen) {
      // Rediriger vers setup-profile si l'utilisateur n'a pas encore de nom
      const u = getAuthUser()
      const needsSetup = !u?.name?.trim() || /^\d{7,}$/.test(u.name.trim())
      if (needsSetup) {
        router.replace('/setup-profile')
      } else {
        flushPendingNavigation()
      }
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
        <ActivityIndicator size="small" color="#A7F3D0" style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
      <OptionSheetHost />
    </SafeAreaProvider>
  )
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#065F3A' },
  splashName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  splashSub: { fontSize: 14, color: '#A7F3D0', marginTop: 4 },
})
