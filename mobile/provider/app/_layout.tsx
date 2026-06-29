import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import * as Updates from 'expo-updates'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { bindNotificationSocket, loadNotifications, resetNotificationBinding } from '../src/notifications'
import { loadProfile } from '../src/user-profile'
import { registerPushToken, setupNotificationChannel, setupNotificationHandler, setupNotificationResponseListener, setupForegroundNotificationListener, flushPendingNavigation } from '../src/push'
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

  useEffect(() => { initSentry() }, [])

  // Notification handler — must be set before any notification can arrive
  useEffect(() => { setupNotificationHandler() }, [])

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
    return () => stopNotifResponse()
  }, [])

  useEffect(() => {
    if (!loggedIn) return
    loadNotifications()
    bindNotificationSocket()
    loadProfile()
    setupNotificationChannel()
    registerPushToken()
    const stopQueueReplay = initOfflineReplay()
    const stopForegroundListener = setupForegroundNotificationListener()
    return () => {
      stopQueueReplay()
      stopForegroundListener()
    }
  }, [loggedIn])

  if (!ready) {
    return (
      <View style={s.splash}>
        <Text style={s.splashName}>Xeuy Bi Pro</Text>
        <Text style={s.splashSub}>Espace prestataire</Text>
        <ActivityIndicator size="small" color="#92400E" style={{ marginTop: 24 }} />
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
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#78350F' },
  splashName: { fontSize: 36, fontWeight: '800', color: '#FFFBEB', letterSpacing: -1 },
  splashSub: { fontSize: 14, color: '#FDE68A', marginTop: 4 },
})
