import { useEffect, useState, useRef } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert, Platform, AppState } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import * as Updates from 'expo-updates'
import * as Location from 'expo-location'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { bindNotificationSocket, loadNotifications, resetNotificationBinding } from '../src/notifications'
import { loadProfile } from '../src/user-profile'
import { registerPushToken, setupNotificationChannel, setupNotificationHandler, setupNotificationResponseListener, setupForegroundNotificationListener, flushPendingNavigation, registerBackgroundPushTask, navigateFromPushData } from '../src/push'
import { loadAuth, subscribeAuth, getAuthUser, clearAuth } from '../src/auth'
import { initOfflineReplay, setOnUnauthorized, resetUnauthorizedFlag } from '../src/api'
import { resetSocket, emitGps } from '../src/socket'
import { loadInitial, subscribe as subscribeOnline } from '../src/online'
import { initSentry, setUser, clearUser } from '../src/sentry'
import '../src/i18n'
import { loadSavedLanguage } from '../src/i18n'

export default function Layout(){
  const [ready, setReady] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const segments = useSegments()

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

  useEffect(() => {
    if (!loggedIn) return
    loadNotifications()
    bindNotificationSocket()
    loadProfile()
    if (Platform.OS !== 'android') setupNotificationChannel()
    registerPushToken()
    const stopQueueReplay = initOfflineReplay()
    const stopForegroundListener = setupForegroundNotificationListener()

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

  // Global GPS emission: send provider position to server while app is foregrounded,
  // REGARDLESS of the online toggle. The toggle only affects the status flag (available/offline)
  // sent with the GPS payload, which the Visibility Engine uses for scoring/eligibility.
  const gpsInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const gpsInFlight = useRef(false)
  const [isOnline, setIsOnline] = useState(false)
  const isOnlineRef = useRef(false)

  useEffect(() => {
    if (!loggedIn) return
    (async () => {
      const initial = await loadInitial()
      setIsOnline(initial)
      isOnlineRef.current = initial
    })()
    const unsub = subscribeOnline((val) => {
      setIsOnline(val)
      isOnlineRef.current = val
    })
    return unsub
  }, [loggedIn])

  // GPS emission: runs whenever logged in + foregrounded, independent of online toggle.
  // The online toggle only controls the 'status' field (available vs offline).
  const sendGps = async (reason: string) => {
    if (gpsInFlight.current || AppState.currentState !== 'active') return
    gpsInFlight.current = true
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.log('[GPS] permission not granted, skip', reason)
        return
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
      const statusFlag = isOnlineRef.current ? 'available' : 'offline'
      console.log('[GPS] emit', reason, pos.coords.latitude, pos.coords.longitude, statusFlag)
      emitGps(pos.coords.latitude, pos.coords.longitude, statusFlag)
    } catch (e: any) {
      console.log('[GPS] failed', reason, e?.message)
    } finally {
      gpsInFlight.current = false
    }
  }

  useEffect(() => {
    if (!loggedIn) {
      if (gpsInterval.current) { clearInterval(gpsInterval.current); gpsInterval.current = null }
      return
    }
    sendGps('initial')
    gpsInterval.current = setInterval(() => sendGps('interval'), 10_000)
    return () => { if (gpsInterval.current) clearInterval(gpsInterval.current) }
  }, [loggedIn])

  // Force GPS emission immediately when provider goes online so the Visibility Engine
  // has presence data without waiting for the next interval tick.
  useEffect(() => {
    if (!loggedIn || !isOnline) return
    sendGps('online-toggle')
  }, [loggedIn, isOnline])

  // Also send GPS as soon as the app returns to foreground.
  useEffect(() => {
    if (!loggedIn) return
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') sendGps('app-active')
    })
    return () => sub.remove()
  }, [loggedIn])

  if (!ready) {
    return (
      <View style={s.splash}>
        <Text style={s.splashName}>Xeuy Bi Pro</Text>
        <Text style={s.splashSub}>Espace prestataire</Text>
        <ActivityIndicator size="small" color="#A7F3D0" style={{ marginTop: 24 }} />
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
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#065F3A' },
  splashName: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  splashSub: { fontSize: 14, color: '#A7F3D0', marginTop: 4 },
})
