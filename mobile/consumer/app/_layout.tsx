import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { bindNotificationSocket, loadNotifications } from '../src/notifications'
import { registerPushToken, setupNotificationChannel, setupNotificationResponseListener } from '../src/push'
import { loadAuth, subscribeAuth, isLoggedIn, getAuthUser } from '../src/auth'
import { initOfflineReplay } from '../src/api'
import { initSentry, setUser, clearUser } from '../src/sentry'
import '../src/i18n'
import { loadSavedLanguage } from '../src/i18n'
import ErrorBoundary from '../src/components/ErrorBoundary'

export default function Layout(){
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const segments = useSegments()

  // Sentry init avant tout
  useEffect(() => { initSentry() }, [])

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
    }
  }, [ready, loggedIn, segments])

  // Initialiser services une fois authentifié
  useEffect(() => {
    if (!loggedIn) return
    loadNotifications()
    bindNotificationSocket()
    setupNotificationChannel()
    registerPushToken()
    const stopQueueReplay = initOfflineReplay()
    const stopNotifListener = setupNotificationResponseListener()
    return () => {
      stopQueueReplay()
      stopNotifListener()
    }
  }, [loggedIn])

  if (!ready) {
    return (
      <View style={s.splash}>
        <Text style={s.splashName}>Ligey</Text>
        <Text style={s.splashSub}>Services à domicile</Text>
        <ActivityIndicator size="small" color="#64748B" style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

const s = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' },
  splashName: { fontSize: 36, fontWeight: '800', color: '#F8FAFC', letterSpacing: -1 },
  splashSub: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
})
