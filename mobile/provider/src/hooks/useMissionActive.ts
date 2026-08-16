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

export interface ActiveMissionData {
  _id: string
  reference?: string
  status: string
  category?: string
  title?: string
  description?: string
  price?: number
  finalPrice?: number
  paymentMethod?: string
  createdAt?: string
  user?: {
    _id?: string
    name?: string
    phone?: string
    avatar?: string
    rating?: number
    isVerified?: boolean
  }
  location?: {
    address?: string
    coordinates?: [number, number] // [lng, lat]
  }
  aiAdvice?: string
  startedAt?: string | number
  completedAt?: string | number
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
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number } | null>(null)
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
        if (item.aiAdvice) setAiAdvice(item.aiAdvice)
      }

      // Restore persisted timer & admin metrics
      const saved = await getPersistedMission(requestId)
      if (saved) {
        if (saved.startedAt) startedAtRef.current = saved.startedAt
        if (saved.totalPausedSeconds) {
          totalPausedSecondsRef.current = saved.totalPausedSeconds
          setPausedSeconds(saved.totalPausedSeconds)
        }
        if (saved.pauseCount) setPauseCount(saved.pauseCount)
        if (saved.lastActivityAt) setLastActivityAt(saved.lastActivityAt)
      } else if (item?.startedAt) {
        const parsed = new Date(item.startedAt).getTime()
        if (!Number.isNaN(parsed)) {
          startedAtRef.current = parsed
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
    socket.on('request:status-changed', handleStatusChanged)
    socket.on('mission:eta_updated', handleEtaUpdated)
    socket.on('mission:client_typing', handleClientTyping)
    socket.on('ai:advice_updated', handleAiAdvice)

    return () => {
      leaveRequestRoom(requestId)
      socket.off('mission:status_updated', handleStatusChanged)
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
          const loc = { lat: currentPos.coords.latitude, lng: currentPos.coords.longitude }
          setProviderLocation(loc)
          emitProviderLocation(requestId, { ...loc, heading: currentPos.coords.heading, speed: currentPos.coords.speed })
        }

        locationSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 5000 },
          pos => {
            if (isCancelled) return
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            setProviderLocation(loc)
            emitProviderLocation(requestId, { ...loc, heading: pos.coords.heading, speed: pos.coords.speed })
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

  // 5. Actions & State Transitions
  const updateStatus = async (nextStatus: string, extraPayload?: Record<string, any>) => {
    if (!requestId) return
    setUpdating(true)
    try {
      hapticSuccess()
      const socket = getSocket()
      socket.emit('mission:status_updated', { requestId, status: nextStatus, ...extraPayload })

      // Optimistic local update
      setMission(prev => (prev ? { ...prev, status: nextStatus } : null))
      setLastActivityAt(Date.now())

      // Persist locally
      await savePersistedMission(requestId, {
        status: nextStatus,
        lastActivityAt: Date.now(),
        ...(nextStatus === 'in_progress' && !startedAtRef.current
          ? { startedAt: Date.now() }
          : {}),
      })

      // Sync backend
      await apiPatchQueued(`/api/services/requests/${requestId}`, {
        status: nextStatus,
        ...extraPayload,
      })
    } catch (err: any) {
      setError(humanErrorMessage(err))
      hapticWarning()
    } finally {
      setUpdating(false)
    }
  }

  const startOnTheWay = () => updateStatus('on_the_way')
  const markArrived = () => updateStatus('arrived')
  const startIntervention = () => updateStatus('in_progress')

  const pauseIntervention = async (reason?: string) => {
    const nextCount = pauseCount + 1
    setPauseCount(nextCount)
    if (requestId) {
      savePersistedMission(requestId, { pauseCount: nextCount })
    }
    await updateStatus('paused', { pauseReason: reason || 'Pause opérateur' })
  }

  const resumeIntervention = () => updateStatus('in_progress')

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
      setError(humanErrorMessage(err))
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
