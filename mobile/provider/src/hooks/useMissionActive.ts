import { useState, useEffect, useRef, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import * as Location from 'expo-location'
import { apiGet, apiPatchQueued, apiPost } from '../api'
import {
  connectSocket,
  getSocket,
  emitProviderLocation,
  joinRequestRoom,
  leaveRequestRoom,
} from '../socket'
import { hapticSuccess, hapticWarning } from '../haptics'
import {
  getPersistedMission,
  savePersistedMission,
  clearPersistedMission,
} from '../storage/missionStorage'
import { humanErrorMessage } from '../errorMessages'
import { haversineMeters, formatDistance, formatDuration, decodePolyline, remainingDistanceAlongPolyline } from '../utils/geo'
import { toast } from '../toast'

export interface ActiveMissionData {
  _id: string
  reference?: string
  status: string
  category?: string
  title?: string
  description?: string
  price?: number
  finalPrice?: number
  budget?: number
  acceptedOffer?: {
    price?: number
    eta?: string
    providerName?: string
    providerPhone?: string
  }
  paymentMethod?: string
  createdAt?: string
  clientName?: string
  clientPhone?: string
  user?: {
    _id?: string
    name?: string
  } & Record<string, any>
  channel?: string
  metrics?: {
    elapsedFormatted?: string
    activeFormatted?: string
    pausedFormatted?: string
    lastActivityAgo?: string
    activeMs?: number
    elapsedMs?: number
    pausedMs?: number
  }
  statusLog?: Array<{ timestamp: string; action?: string; fromStatus?: string | null; toStatus?: string | null }>
  media?: Array<{ url: string; type?: 'image' | 'video' | 'audio' | 'file'; title?: string }>
  payment?: { status?: string | null; provider?: string | null; phase?: string | null } | null
  earnings?: { grossAmountFcfa: number; platformFeeFcfa?: number; bonusFcfa?: number; netAmountFcfa: number } | null
  clientReview?: { rating?: number; comment?: string | null } | null
  clientValidatedAt?: string | null
  weeklyCompletedMissions?: number | null
  rating?: number
  isVerified?: boolean
  location?: {
    address?: string
    coordinates?: [number, number] // [lng, lat]
  }
  aiAdvice?: string
  startedAt?: string | number
  completedAt?: string | number
  routeRefreshMinMs?: number
  routeRefetchMinMoveM?: number
}

export function useMissionActive(requestId: string | null) {
  const [mission, setMission] = useState<ActiveMissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Real-time state
  const [isClientTyping, setIsClientTyping] = useState(false)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number; heading?: number | null; speed?: number | null } | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string; coords: Array<{ latitude: number; longitude: number }> }>({
    distance: '1.2 km',
    duration: '2 min',
    coords: [],
  })

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [pausedSeconds, setPausedSeconds] = useState(0)
  const [pauseCount, setPauseCount] = useState(0)
  const [lastActivityAt, setLastActivityAt] = useState<number>(Date.now())

  const startedAtRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)
  const totalPausedSecondsRef = useRef(0)
  const isPausedRef = useRef(false)
  const missionRef = useRef<ActiveMissionData | null>(null)
  missionRef.current = mission

  // 1. Load mission data & restore persisted state
  const loadMission = useCallback(async (isRefresh = false) => {
    if (!requestId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await apiGet(`/api/services/requests/${requestId}`)
      const item: ActiveMissionData = res.item || res.data || res.request
      if (item) {
        setMission(item)
        if (item.status === 'in_progress' && !startedAtRef.current) {
          startedAtRef.current = item.startedAt ? new Date(item.startedAt).getTime() : Date.now()
        }
        const m = (item as any).metrics
        if (m) {
          if (m.pauseCount !== undefined) {
            setPauseCount(m.pauseCount)
          }
          if (m.pausedMs !== undefined) {
            const sec = Math.floor(m.pausedMs / 1000)
            totalPausedSecondsRef.current = sec
            setPausedSeconds(sec)
          }
          if (m.activeMs !== undefined && m.activeMs > 0) {
            setElapsedSeconds(Math.floor(m.activeMs / 1000))
          }
        }
        if (item.status === 'completed' || item.status === 'cancelled' || item.status === 'archived') {
          await clearPersistedMission(requestId)
        }
      }
    } catch (err: any) {
      setError(humanErrorMessage(err))
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    loadMission()
  }, [loadMission])

  // 2. Timer ticker
  useEffect(() => {
    const status = mission?.status
    const isInProgress = status === 'in_progress'
    const isPaused = status === 'paused'
    isPausedRef.current = isPaused

    if (isInProgress && !startedAtRef.current) {
      startedAtRef.current = Date.now()
      if (requestId) {
        savePersistedMission(requestId, {
          startedAt: startedAtRef.current,
          status: 'in_progress',
        })
      }
    }

    const interval = setInterval(() => {
      const now = Date.now()
      if (startedAtRef.current) {
        if (isPausedRef.current) {
          if (!pausedAtRef.current) {
            pausedAtRef.current = now
          }
          const currentPauseDuration = Math.floor((now - pausedAtRef.current) / 1000)
          setPausedSeconds(totalPausedSecondsRef.current + currentPauseDuration)
        } else {
          if (pausedAtRef.current) {
            const pauseSpan = Math.floor((now - pausedAtRef.current) / 1000)
            totalPausedSecondsRef.current += pauseSpan
            pausedAtRef.current = null
            if (requestId) {
              savePersistedMission(requestId, {
                totalPausedSeconds: totalPausedSecondsRef.current,
              })
            }
          }
          const totalElapsed = Math.floor((now - startedAtRef.current) / 1000)
          const activeElapsed = Math.max(0, totalElapsed - totalPausedSecondsRef.current)
          setElapsedSeconds(activeElapsed)
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [mission?.status, requestId])

  // 3. Socket event bindings
  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    joinRequestRoom(requestId)

    const handleStatusChanged = (data: any) => {
      if (String(data?.requestId) === String(requestId) || String(data?.id) === String(requestId)) {
        hapticSuccess()
        loadMission(true)
      }
    }

    const handleEtaUpdated = (data: any) => {
      if (data?.distance || data?.duration) {
        setRouteInfo(prev => ({
          ...prev,
          distance: data.distance || prev.distance,
          duration: data.duration || prev.duration,
        }))
      }
    }

    const handleClientTyping = (data: any) => {
      if (String(data?.requestId) === String(requestId)) {
        setIsClientTyping(!!data.isTyping)
      }
    }

    const handleAiAdvice = (data: any) => {
      if (data?.advice) {
        setAiAdvice(data.advice)
      }
    }

    socket.on('mission:status_updated', handleStatusChanged)
    socket.on('mission:status-changed', handleStatusChanged)
    socket.on('request:status-changed', handleStatusChanged)
    socket.on('mission:eta_updated', handleEtaUpdated)
    socket.on('mission:client_typing', handleClientTyping)
    socket.on('ai:advice_updated', handleAiAdvice)

    return () => {
      leaveRequestRoom(requestId)
      socket.off('mission:status_updated', handleStatusChanged)
      socket.off('mission:status-changed', handleStatusChanged)
      socket.off('request:status-changed', handleStatusChanged)
      socket.off('mission:eta_updated', handleEtaUpdated)
      socket.off('mission:client_typing', handleClientTyping)
      socket.off('ai:advice_updated', handleAiAdvice)
    }
  }, [requestId, loadMission])

  // 4. GPS tracking for on_the_way / provider_arriving
  useEffect(() => {
    const status = mission?.status
    const needsTracking = status === 'on_the_way' || status === 'provider_arriving' || status === 'assigned'
    if (!requestId || !needsTracking) return

    let isCancelled = false
    let locationSub: Location.LocationSubscription | null = null

    const startTracking = async () => {
      try {
        const { status: permStatus } = await Location.getForegroundPermissionsAsync()
        if (permStatus !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync()
          if (req.status !== 'granted' || isCancelled) return
        }

        const currentPos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)
        if (currentPos && !isCancelled) {
          const loc = { lat: currentPos.coords.latitude, lng: currentPos.coords.longitude, heading: currentPos.coords.heading, speed: currentPos.coords.speed }
          setProviderLocation(loc)
          emitProviderLocation(requestId, loc)
        }

        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 2000 },
          pos => {
            if (isCancelled) return
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading, speed: pos.coords.speed }
            setProviderLocation(loc)
            emitProviderLocation(requestId, loc)
          }
        )
      } catch (err) {
        console.warn('[useMissionActive] Location tracking error:', err)
      }
    }

    startTracking()

    return () => {
      isCancelled = true
      if (locationSub) locationSub.remove()
    }
  }, [requestId, mission?.status])

  // 4b. Real-time route (Google Directions) + speed-based ETA
  const googleRouteRef = useRef<{
    polyline: Array<{ lat: number; lng: number }>
    distanceM: number
    fetchedAt: number
    fetchedFrom: { lat: number; lng: number }
  } | null>(null)
  const isFetchingRoute = useRef(false)
  const lastFetchAt = useRef(0)
  const lastFetchFrom = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const clientCoords = mission?.location?.coordinates
    if (!clientCoords || clientCoords.length !== 2 || !providerLocation) {
      return
    }
    const clientLng = Number(clientCoords[0])
    const clientLat = Number(clientCoords[1])
    if (!Number.isFinite(clientLat) || !Number.isFinite(clientLng)) return

    const ROUTE_REFRESH_MIN_MS = Number(mission?.routeRefreshMinMs) >= 1000 ? Number(mission?.routeRefreshMinMs) : 60000
    const ROUTE_REFETCH_MIN_MOVE_M = Number(mission?.routeRefetchMinMoveM) >= 10 ? Number(mission?.routeRefetchMinMoveM) : 250

    let isCancelled = false

    const computeRouteInfo = () => {
      if (isCancelled) return
      let distanceM: number
      let coords: Array<{ latitude: number; longitude: number }>

      const googleRoute = googleRouteRef.current
      if (googleRoute?.polyline?.length) {
        const { remainingM, remainingPolyline } = remainingDistanceAlongPolyline(
          providerLocation.lat,
          providerLocation.lng,
          googleRoute.polyline
        )
        distanceM = remainingM
        coords = remainingPolyline.map(p => ({ latitude: p.lat, longitude: p.lng }))
      } else {
        distanceM = haversineMeters(providerLocation.lat, providerLocation.lng, clientLat, clientLng)
        coords = [
          { latitude: providerLocation.lat, longitude: providerLocation.lng },
          { latitude: clientLat, longitude: clientLng },
        ]
      }

      const speedMps = Number(providerLocation?.speed) || 0
      const speedKmh = speedMps > 0.5 ? speedMps * 3.6 : 25
      const durationMin = (distanceM / 1000 / Math.max(5, speedKmh)) * 60

      setRouteInfo({
        distance: formatDistance(distanceM),
        duration: formatDuration(durationMin),
        coords,
      })
    }

    const maybeFetchRoute = async () => {
      const now = Date.now()
      const movedM = lastFetchFrom.current
        ? haversineMeters(providerLocation.lat, providerLocation.lng, lastFetchFrom.current.lat, lastFetchFrom.current.lng)
        : Infinity
      const timeSince = now - lastFetchAt.current

      if (timeSince < ROUTE_REFRESH_MIN_MS && movedM < ROUTE_REFETCH_MIN_MOVE_M) return false
      if (isFetchingRoute.current) return false

      isFetchingRoute.current = true
      try {
        const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          isFetchingRoute.current = false
          return false
        }
        const url =
          `https://maps.googleapis.com/maps/api/directions/json` +
          `?origin=${providerLocation.lat},${providerLocation.lng}` +
          `&destination=${clientLat},${clientLng}` +
          `&mode=driving&key=${apiKey}`

        const res = await fetch(url)
        const data = await res.json()
        if (data.status !== 'OK' || !data.routes?.length) {
          isFetchingRoute.current = false
          return false
        }

        const leg = data.routes[0].legs[0]
        const encoded = data.routes[0].overview_polyline?.points || ''
        const polyline = decodePolyline(encoded)

        googleRouteRef.current = {
          polyline,
          distanceM: leg.distance?.value || 0,
          fetchedAt: now,
          fetchedFrom: { lat: providerLocation.lat, lng: providerLocation.lng },
        }
        lastFetchAt.current = now
        lastFetchFrom.current = { lat: providerLocation.lat, lng: providerLocation.lng }
        return true
      } catch (e) {
        console.warn('[useMissionActive] Directions fetch error', e)
        return false
      } finally {
        isFetchingRoute.current = false
      }
    }

    computeRouteInfo()
    maybeFetchRoute().then((fetched) => {
      if (fetched) computeRouteInfo()
    })

    return () => {
      isCancelled = true
    }
  }, [providerLocation, mission?.location?.coordinates, mission?.routeRefreshMinMs, mission?.routeRefetchMinMoveM])

  // 5. Actions & State Transitions
  const updateStatus = async (nextStatus: string, extraPayload?: Record<string, any>) => {
    if (!requestId) return
    setUpdating(true)
    try {
      hapticSuccess()
      console.log('[useMissionActive] updateStatus', { requestId, nextStatus, extraPayload })

      // Sync backend
      const res = await apiPatchQueued(`/api/services/requests/${requestId}`, {
        status: nextStatus,
        ...extraPayload,
      })

      if (!res) {
        console.warn('[useMissionActive] updateStatus queued (offline)')
        return
      }

      const actualStatus = (res as any)?.item?.status || (res as any)?.status || nextStatus
      console.log('[useMissionActive] updateStatus success', { actualStatus })
      setMission(prev => (prev ? { ...prev, status: actualStatus } : null))
      setLastActivityAt(Date.now())

      // Persist locally
      await savePersistedMission(requestId, {
        status: actualStatus,
        lastActivityAt: Date.now(),
        ...(actualStatus === 'in_progress' && !startedAtRef.current
          ? { startedAt: Date.now() }
          : {}),
      })

      // Notify others after confirmed backend write
      const socket = getSocket()
      socket.emit('mission:status_updated', { requestId, status: actualStatus, clientId: missionRef.current?.user?._id, ...extraPayload })

      await loadMission(true)
    } catch (err: any) {
      console.error('[useMissionActive] updateStatus error', err)
      const msg = humanErrorMessage(err)
      setError(msg)
      toast.error(msg)
      hapticWarning()
      await loadMission(true)
    } finally {
      setUpdating(false)
    }
  }

  const startOnTheWay = () => updateStatus('on_the_way')
  const markArrived = () => updateStatus('arrived')
  const startIntervention = () => updateStatus('in_progress')

  const pauseIntervention = async (reason?: string) => {
    if (!requestId) return
    setUpdating(true)
    try {
      hapticSuccess()
      console.log('[useMissionActive] pauseIntervention', { requestId, reason })

      const res = await apiPatchQueued(`/api/services/requests/${requestId}`, {
        action: 'pause',
        reason: reason || 'Pause opérateur',
      })

      if (!res) {
        console.warn('[useMissionActive] pauseIntervention queued (offline)')
        return
      }

      const nextCount = pauseCount + 1
      setPauseCount(nextCount)
      await savePersistedMission(requestId, { pauseCount: nextCount, status: 'paused', lastActivityAt: Date.now() })

      const socket = getSocket()
      socket.emit('mission:status_updated', { requestId, status: 'paused', reason: reason || 'Pause opérateur' })

      await loadMission(true)
    } catch (err: any) {
      console.error('[useMissionActive] pauseIntervention error', err)
      const msg = humanErrorMessage(err)
      setError(msg)
      toast.error(msg)
      hapticWarning()
      await loadMission(true)
    } finally {
      setUpdating(false)
    }
  }

  const resumeIntervention = async () => {
    if (!requestId) return
    setUpdating(true)
    try {
      hapticSuccess()
      console.log('[useMissionActive] resumeIntervention', { requestId })

      const res = await apiPatchQueued(`/api/services/requests/${requestId}`, {
        action: 'resume',
      })

      if (!res) {
        console.warn('[useMissionActive] resumeIntervention queued (offline)')
        return
      }

      await savePersistedMission(requestId, { status: 'in_progress', lastActivityAt: Date.now() })

      const socket = getSocket()
      socket.emit('mission:status_updated', { requestId, status: 'in_progress' })

      await loadMission(true)
    } catch (err: any) {
      console.error('[useMissionActive] resumeIntervention error', err)
      const msg = humanErrorMessage(err)
      setError(msg)
      toast.error(msg)
      hapticWarning()
      await loadMission(true)
    } finally {
      setUpdating(false)
    }
  }

  const finishMission = async () => {
    await updateStatus('awaiting_validation', {
      completedAt: new Date().toISOString(),
      activeSeconds: elapsedSeconds,
    })
  }

  const reportProblem = async (reason: string, details?: string) => {
    if (!requestId) return
    try {
      hapticWarning()
      await apiPost(`/api/services/requests/${requestId}/dispute`, {
        reason,
        details,
      })
      await updateStatus('dispute', { disputeReason: reason })
    } catch (err: any) {
      console.error('[useMissionActive] reportProblem error', err)
      const msg = humanErrorMessage(err)
      setError(msg)
      toast.error(msg)
    }
  }

  return {
    mission,
    loading,
    refreshing,
    updating,
    error,
    isClientTyping,
    aiAdvice,
    providerLocation,
    routeInfo,
    elapsedSeconds,
    pausedSeconds,
    pauseCount,
    lastActivityAt,
    loadMission,
    startOnTheWay,
    markArrived,
    startIntervention,
    pauseIntervention,
    resumeIntervention,
    finishMission,
    reportProblem,
    updateStatus,
  }
}
