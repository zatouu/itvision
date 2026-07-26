import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Linking, AppState, AppStateStatus, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LiveRouteMap } from '../../src/components/LiveRouteMap'
import MissionMediaGallery from '../../src/components/MissionMediaGallery'
import { SkeletonCard } from '../../src/components/Skeleton'
import * as Location from 'expo-location'
import { apiGet, apiPost, apiPatchQueued } from '../../src/api'
import { connectSocket, emitProviderLocation, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { confirm, notify } from '../../src/confirm'
import { hapticSuccess, hapticWarning } from '../../src/haptics'
import { useTranslation } from 'react-i18next'
import i18n from '../../src/i18n'
import { ArrowLeft, Clock, MessageCircle, CheckCircle, Navigation, Pause, Play, AlertTriangle, XCircle } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../../src/design'

const PAYMENT_BADGE: Record<string, { key: string; color: string; bg: string; dot: string }> = {
  pending:   { key: 'mission.paymentPending',  color: colors.warning, bg: colors.warningLight, dot: colors.warning },
  held:      { key: 'mission.paymentHeld',     color: colors.success, bg: colors.successLight, dot: colors.success },
  released:  { key: 'mission.paymentReleased', color: colors.navy,    bg: colors.infoLight,    dot: colors.navy },
  refunded:  { key: 'mission.paymentRefunded', color: colors.danger,  bg: colors.dangerLight,  dot: colors.danger },
  failed:    { key: 'mission.paymentFailed',   color: colors.danger,  bg: colors.dangerLight,  dot: colors.danger },
}

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string; dot: string }> = {
  created:            { key: 'mission.created',            color: colors.text,    bg: colors.bg,       dot: colors.textMuted },
  broadcasted:        { key: 'mission.broadcasted',        color: colors.text,    bg: colors.warningLight, dot: colors.warning },
  accepted:           { key: 'mission.assigned',           color: colors.surface, bg: colors.success,  dot: colors.surface },
  assigned:           { key: 'mission.assigned',           color: colors.surface, bg: colors.success,  dot: colors.surface },
  on_the_way:         { key: 'mission.arriving',           color: colors.surface, bg: colors.success,  dot: colors.surface },
  provider_arriving:  { key: 'mission.arriving',           color: colors.surface, bg: colors.success,  dot: colors.surface },
  arrived:            { key: 'mission.arrived',            color: colors.surface, bg: colors.info,     dot: colors.surface },
  in_progress:        { key: 'mission.inProgress',         color: colors.surface, bg: colors.info,     dot: colors.surface },
  paused:             { key: 'mission.paused',             color: colors.surface, bg: colors.warning,  dot: colors.surface },
  awaiting_validation:{ key: 'mission.awaitingValidation', color: colors.surface, bg: colors.warning,  dot: colors.surface },
  completed:          { key: 'mission.completed',          color: colors.text,    bg: colors.surface,  dot: colors.textMuted },
  cancelled:          { key: 'mission.cancelled',          color: colors.surface, bg: colors.danger,   dot: colors.surface },
  expired:            { key: 'mission.expired',            color: colors.surface, bg: colors.textMuted,dot: colors.surface },
  dispute:            { key: 'mission.dispute',            color: colors.surface, bg: colors.danger,   dot: colors.surface },
  archived:           { key: 'mission.archived',           color: colors.surface, bg: colors.textMuted,dot: colors.surface },
}

const FLOW_STEPS = [
  { key: 'accepted', labelKey: 'mission.step_assigned' },
  { key: 'on_the_way', labelKey: 'mission.step_arriving' },
  { key: 'arrived', labelKey: 'mission.step_arrived' },
  { key: 'in_progress', labelKey: 'mission.step_in_progress' },
  { key: 'awaiting_validation', labelKey: 'mission.step_awaiting_validation' },
  { key: 'completed', labelKey: 'mission.step_completed' },
] as const

function getStepState(currentStatus: string, stepKey: string): 'done' | 'active' | 'todo' {
  if (['cancelled', 'expired', 'dispute', 'archived'].includes(currentStatus)) return 'todo'
  const order: Record<string, number> = { accepted: 0, assigned: 0, on_the_way: 1, provider_arriving: 1, arrived: 2, in_progress: 3, awaiting_validation: 4, completed: 5 }
  const current = order[currentStatus] ?? 0
  const target = order[stepKey] ?? 0
  if (target < current) return 'done'
  if (target === current) return 'active'
  return 'todo'
}

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function formatMoney(value: unknown): string {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return i18n.t('mission.notProvided')
  return `${amount.toLocaleString()} FCFA`
}

function formatDateTime(value: unknown): string {
  if (!value) return i18n.t('mission.notProvided')
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return i18n.t('mission.notProvided')
  return d.toLocaleString()
}

function formatElapsed(startedAt: unknown, endedAt?: unknown): string {
  const start = new Date(String(startedAt))
  if (Number.isNaN(start.getTime())) return ''
  const end = endedAt ? new Date(String(endedAt)) : new Date()
  if (Number.isNaN(end.getTime()) || end < start) return ''
  const diffSec = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (diffSec < 60) return `${diffSec}s`
  const m = Math.floor(diffSec / 60)
  const s = diffSec % 60
  if (m < 60) return `${m}min ${s}s`
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${h}h ${remM}min`
}

function hasValidCoords(location: any): location is { coordinates: [number, number]; address?: string } {
  return (
    Array.isArray(location?.coordinates)
    && location.coordinates.length === 2
    && Number.isFinite(Number(location.coordinates[0]))
    && Number.isFinite(Number(location.coordinates[1]))
  )
}

const PAUSE_REASONS = [
  { key: 'attente_pieces', label: 'Attente de pièces' },
  { key: 'attente_client', label: 'Attente du client' },
  { key: 'meteo', label: 'Météo' },
  { key: 'attente_intervenant', label: 'Attente d\'un autre intervenant' },
  { key: 'autre', label: 'Autre' },
]

function promptPauseReason(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Pause', 'Raison de la pause', [
      ...PAUSE_REASONS.map(r => ({ text: r.label, onPress: () => resolve(r.key) })),
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ])
  })
}

const DISPUTE_REASONS = [
  { key: 'paiement', label: 'Paiement' },
  { key: 'qualite', label: 'Qualité' },
  { key: 'retard', label: 'Retard' },
  { key: 'comportement', label: 'Comportement' },
  { key: 'autre', label: 'Autre' },
]

function promptDisputeReason(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Litige', 'Motif du litige', [
      ...DISPUTE_REASONS.map(r => ({ text: r.label, onPress: () => resolve(r.key) })),
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
    ])
  })
}

function healthColor(health: 'active' | 'idle' | 'stale' | 'paused') {
  switch (health) {
    case 'paused': return { bg: colors.warningLight, dot: colors.warning, color: colors.warning }
    case 'active': return { bg: colors.successLight, dot: colors.success, color: colors.success }
    case 'idle': return { bg: colors.warningLight, dot: colors.warning, color: colors.warning }
    case 'stale': return { bg: colors.dangerLight, dot: colors.danger, color: colors.danger }
    default: return { bg: colors.bg, dot: colors.textMuted, color: colors.textSecondary }
  }
}

function ActiveMission() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number; heading?: number | null } | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [fitTrigger, setFitTrigger] = useState(0)
  const locationRef = useRef(mapLocation)
  const lastUiUpdateAt = useRef(0)

  // Timer: refresh elapsed display every second while mission is in_progress
  useEffect(() => {
    if (item?.status !== 'in_progress') return
    const interval = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(interval)
  }, [item?.status])

  const shouldUpdateUiLocation = (next: { lat: number; lng: number }) => {
    const prev = locationRef.current
    if (!prev) return true
    const now = Date.now()
    if (now - lastUiUpdateAt.current > 10000) return true
    const dLat = (next.lat - prev.lat) * Math.PI / 180
    const dLng = (next.lng - prev.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(prev.lat * Math.PI / 180) * Math.cos(next.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
    const distM = 6371000 * 2 * Math.asin(Math.sqrt(a))
    return distM > 150
  }

  const load = useCallback(async (isRefresh = false) => {
    if (!requestId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setItem(r.item)
    } catch (e: any) { setErr(e.message) }
    finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    joinRequestRoom(requestId)
    let mounted = true

    const syncMission = async () => {
      try {
        const r = await apiGet(`/api/services/requests/${requestId}`)
        if (mounted) setItem(r.item)
      } catch {
        // no-op: fallback silencieux pour éviter un bruit d'erreur inutile
      }
    }

    const handleStatusChanged = (data: any) => {
      if (String(data.requestId) === String(requestId)) {
        syncMission()
      }
    }

    socket.on('request:status-changed', handleStatusChanged)

    // Fallback périodique si WS manque un event
    const interval = setInterval(() => {
      syncMission()
    }, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
      leaveRequestRoom(requestId)
      socket.off('request:status-changed', handleStatusChanged)
    }
  }, [requestId])

  useEffect(() => {
    if (!requestId || !['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(item?.status || '')) return
    let cancelled = false
    let watcher: Location.LocationSubscription | null = null

    const publishLocation = (pos: Location.LocationObject) => {
      if (cancelled) return
      const location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        heading: pos.coords.heading ?? null,
        speed: pos.coords.speed,
      }
      locationRef.current = location
      emitProviderLocation(requestId, location)
      if (shouldUpdateUiLocation(location)) {
        setMapLocation(location)
        lastUiUpdateAt.current = Date.now()
      }
    }

    const startTracking = async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync()
        if (perm.status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync()
          if (req.status !== 'granted' || cancelled) return
        }
        // One initial snapshot to show the user immediately on the map
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          if (!cancelled && pos) publishLocation(pos)
        } catch {
          const last = await Location.getLastKnownPositionAsync()
          if (!cancelled && last) publishLocation(last)
        }
        watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 4000 },
          publishLocation
        )
      } catch {}
    }

    const stopTracking = () => {
      if (watcher) { watcher.remove(); watcher = null }
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') startTracking()
      else stopTracking()
    }

    startTracking()
    const sub = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      cancelled = true
      stopTracking()
      sub.remove()
    }
  }, [requestId, item?.status])

  const destination = useMemo(() => {
    const loc = item?.location
    if (hasValidCoords(loc)) {
      return { lat: Number(loc.coordinates[1]), lng: Number(loc.coordinates[0]) }
    }
    return { lat: 0, lng: 0 }
  }, [item?.location])

  const doUpdateStatus = async (nextStatus: string) => {
    if (!requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(
        `/api/services/requests/${requestId}`,
        { status: nextStatus },
        t('mission.offlineStatusChange')
      )
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const handleArriving = async () => {
    const ok = await confirm(t('mission.arrivingTitle'), t('mission.arrivingMsg'))
    if (!ok) return
    hapticSuccess()
    doUpdateStatus('on_the_way')
  }

  const handleArrived = async () => {
    const ok = await confirm(t('mission.arrivedTitle'), t('mission.arrivedMsg'))
    if (!ok) return
    hapticSuccess()
    doUpdateStatus('arrived')
  }

  const handleStart = async () => {
    const ok = await confirm(t('mission.startTitle'), t('mission.startMsg'))
    if (!ok) return
    hapticSuccess()
    doUpdateStatus('in_progress')
  }

  const handlePause = async () => {
    const reason = await promptPauseReason()
    if (!reason || !requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(`/api/services/requests/${requestId}`, { action: 'pause', reason }, t('mission.offlineStatusChange'))
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const handleResume = async () => {
    if (!requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(`/api/services/requests/${requestId}`, { action: 'resume' }, t('mission.offlineStatusChange'))
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const handleComplete = async () => {
    const ok = await confirm(t('mission.completeTitle'), t('mission.completeMsg'))
    if (!ok) return
    hapticSuccess()
    doUpdateStatus('awaiting_validation')
  }

  const handleCancel = async () => {
    const ok = await confirm(t('mission.cancelConfirmTitle'), t('mission.cancelConfirmMsg'))
    if (!ok) return
    hapticSuccess()
    doUpdateStatus('cancelled')
  }

  const handleDispute = async () => {
    if (!requestId) return
    const reason = await promptDisputeReason()
    if (!reason) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(`/api/services/requests/${requestId}`, { action: 'dispute', reason }, t('mission.offlineStatusChange'))
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const confirmCashReceived = async () => {
    if (!requestId) return
    const ok = await confirm(t('payment.cashConfirmTitle'), t('payment.cashConfirmMsg', { amount: formatMoney(item?.payment?.amount) }))
    if (!ok) return
    hapticSuccess()
    setUpdating(true)
    try {
      const r = await apiPost('/api/payments/release', { requestId })
      if (r?.success) {
        notify(t('payment.cashConfirmed'), r.releasedAmount ? `${Number(r.releasedAmount).toLocaleString()} FCFA enregistrés.` : '')
        await load(true)
      }
    } catch (e: any) {
      notify(t('common.error'), e.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading && !item) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.loadingBody}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    </SafeAreaView>
  )

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centerBlock}>
        <Text style={s.err}>{t('mission.invalid')}</Text>
      </View>
    </SafeAreaView>
  )

  const st = item ? STATUS_CONFIG[item.status] || STATUS_CONFIG.assigned : null
  const loc = item?.location
  const offer = item?.acceptedOffer
  const hasCoords = hasValidCoords(loc)
  const lat = hasCoords ? Number(loc.coordinates[1]) : 0
  const lng = hasCoords ? Number(loc.coordinates[0]) : 0

  const openNavigation = () => {
    if (!hasCoords) return
    const destination = `${lat},${lng}`
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`
    Linking.openURL(url).catch(() => {
      notify(t('common.error'), 'Impossible d\'ouvrir la navigation')
    })
  }

  const focusRouteInApp = () => {
    if (!hasCoords) return
    setFitTrigger(v => v + 1)
  }
  const locationAddress = typeof item?.location?.address === 'string' ? item.location.address : undefined
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : t('mission.notProvided')
  const hasValidMedia = Array.isArray(item?.media) && item.media.length > 0 && item.media.some((m: any) => m?.url || m?.uri)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('mission.activeTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {err && <Text style={s.err}>{err}</Text>}

        {item && (
          <>
            <View style={[s.statusBanner, { backgroundColor: st?.bg }]}>
              {st?.dot && <View style={[s.statusBannerDot, { backgroundColor: st.dot }]} />}
              <Text style={[s.statusText, { color: st?.color }]}>{st ? t(st.key) : ''}</Text>
            </View>

            {/* Indicateur de fraîcheur */}
            {item.metrics && (
              <View style={[s.statusBanner, { backgroundColor: healthColor(item.metrics.health).bg }]}>
                <View style={[s.statusBannerDot, { backgroundColor: healthColor(item.metrics.health).dot }]} />
                <Text style={[s.statusText, { color: healthColor(item.metrics.health).color }]}>
                  {item.metrics.isPaused ? `⏸️ ${t('mission.paused')}` : `● ${t(`mission.health.${item.metrics.health}`)}`}
                </Text>
              </View>
            )}

            {/* Durée écoulée si mission en cours */}
            {(item.status === 'in_progress' || item.status === 'paused') && item.startedAt && (
              <View style={[s.statusBanner, { backgroundColor: colors.infoLight }]}>
                <Clock size={16} color={colors.info} />
                <Text style={[s.statusText, { color: colors.info }]}>
                  {t('mission.elapsed', { duration: item.metrics?.activeFormatted || formatElapsed(item.startedAt) })}
                </Text>
              </View>
            )}

            {/* Carte métriques cycle de vie */}
            {item.metrics && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.lifecycleTitle')}</Text>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.lastActivity')}</Text>
                  <Text style={s.detailValue}>{item.metrics.lastActivityAgo} {t('common.ago')}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.totalDuration')}</Text>
                  <Text style={s.detailValue}>{item.metrics.elapsedFormatted}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.activeDuration')}</Text>
                  <Text style={s.detailValue}>{item.metrics.activeFormatted}</Text>
                </View>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.pausedDuration')}</Text>
                  <Text style={s.detailValue}>{item.metrics.pausedFormatted} · {item.metrics.pauseCount} {t('mission.pauses')}</Text>
                </View>
                {item.metrics.estimatedResumeAt && (
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>{t('mission.estimatedResume')}</Text>
                    <Text style={s.detailValue}>{formatDateTime(item.metrics.estimatedResumeAt)}</Text>
                  </View>
                )}
                {item.metrics.currentPauseReason && (
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>{t('mission.pauseReason')}</Text>
                    <Text style={s.detailValue}>{item.metrics.currentPauseReason}</Text>
                  </View>
                )}
              </View>
            )}

            {item.payment && (
              <View style={[s.statusBanner, { backgroundColor: PAYMENT_BADGE[item.payment.status]?.bg || colors.bg }]}>
                {PAYMENT_BADGE[item.payment.status]?.dot && (
                  <View style={[s.statusBannerDot, { backgroundColor: PAYMENT_BADGE[item.payment.status]?.dot }]} />
                )}
                <Text style={[s.statusText, { color: PAYMENT_BADGE[item.payment.status]?.color || colors.textSecondary }]}>
                  {t(PAYMENT_BADGE[item.payment.status]?.key || 'mission.paymentPending')}
                  {item.payment.provider === 'cash' ? ' · Cash' : ''}
                  {item.payment.phase === 'deposit' ? ` · Dépôt ${formatMoney(item.payment.depositAmount)} / Solde ${formatMoney(item.payment.balanceAmount)}` : ''}
                </Text>
              </View>
            )}

            {/* Carte */}
            {hasCoords && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.tracking')}</Text>
                <LiveRouteMap
                  destination={destination}
                  destinationLabel={locationAddress}
                  origin={mapLocation || undefined}
                  providerLocation={mapLocation || undefined}
                  status={item.status}
                  height={260}
                  fitTrigger={fitTrigger}
                  onRouteInfo={setRouteInfo}
                  interactive={false}
                />
                {routeInfo && (
                  <View style={s.routeInfo}>
                    <Text style={s.routeInfoText}>{routeInfo.distance} · {routeInfo.duration}</Text>
                  </View>
                )}
                {['assigned', 'provider_arriving'].includes(item.status) && (
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                    <TouchableOpacity style={[s.navBtn, { flex: 1 }]} onPress={focusRouteInApp}>
                      <Navigation size={18} color={colors.surface} />
                      <Text style={s.navBtnText}>{t('mission.viewRoute')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.navBtn, { flex: 0.5, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }]} onPress={openNavigation}>
                      <Text style={[s.navBtnText, { color: colors.textSecondary }]}>{t('mission.openMaps')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {item.status !== 'cancelled' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.progress')}</Text>
                <View style={s.timeline}>
                  {FLOW_STEPS.map((step, idx) => {
                    const state = getStepState(item.status, step.key)
                    return (
                      <View key={step.key} style={s.timelineRow}>
                        <View style={s.timelineLeft}>
                          <View style={[
                            s.timelineDot,
                            state === 'done' && s.timelineDotDone,
                            state === 'active' && s.timelineDotActive,
                          ]} />
                          {idx < FLOW_STEPS.length - 1 && <View style={[s.timelineLine, state === 'done' && s.timelineLineDone]} />}
                        </View>
                        <Text style={[
                          s.timelineLabel,
                          state === 'active' && s.timelineLabelActive,
                          state === 'done' && s.timelineLabelDone,
                        ]}>{t(step.labelKey)}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            <View style={s.card}>
              <Text style={s.cardTitle}>{t('mission.detailsTitle')}</Text>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>{t('mission.reference')}</Text>
                <Text style={s.detailValue}>#{missionRef}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>{t('mission.category')}</Text>
                <Text style={s.detailValue}>{item.category || t('mission.notProvided')}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>{t('mission.clientBudget')}</Text>
                <Text style={s.detailValue}>{formatMoney(item.budget)}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>{t('mission.createdAt')}</Text>
                <Text style={s.detailValue}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>{t('mission.yourOffer')}</Text>
                <Text style={s.detailValue}>{offer ? `${formatMoney(offer.price)} · ETA ${etaLabel}` : t('mission.notAvailable')}</Text>
              </View>
            </View>

            {/* Client / Demande */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('mission.request')}</Text>
              <Text style={s.descText}>{item.description || t('mission.noDescription')}</Text>
              {item.budget ? <Text style={s.meta}>{t('mission.estimatedBudget', { budget: item.budget.toLocaleString() })}</Text> : null}
            </View>

            {/* Médias */}
            {hasValidMedia && (
              <View style={s.card}>
                <MissionMediaGallery
                  media={item.media || []}
                  mediaTitle={t('mission.clientMedia')}
                  audioLabel={t('mission.voiceMessage') || 'Message vocal'}
                />
              </View>
            )}

            {/* Chat */}
            {['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(item.status) && (
              <TouchableOpacity
                style={s.chatBtn}
                onPress={() => router.push(`/mission-chat?id=${requestId}&clientName=${encodeURIComponent(item.clientName || '')}&clientPhone=${encodeURIComponent(item.clientPhone || '')}`)}
              >
                <MessageCircle size={18} color={colors.info} />
                <Text style={s.chatBtnText}>{t('mission.contactClient')}</Text>
              </TouchableOpacity>
            )}

            {/* Info litige */}
            {(item?.status === 'dispute' || item?.disputeStatus || item?.disputeDecision) && (
              <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: item?.disputeStatus === 'resolved' ? colors.success : colors.danger }]}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                  {item?.disputeStatus === 'resolved' ? 'Litige résolu' : 'Litige en cours'}
                </Text>
                {item?.disputeReason && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>Motif : {item.disputeReason}</Text>
                )}
                {item?.disputeDecision && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                    Décision : {({ release_escrow: 'Paiement libéré au prestataire', refund: 'Remboursement intégral', partial_refund: 'Remboursement partiel', reject: 'Litige rejeté', cancel: 'Litige annulé', other: 'Autre' } as any)[item.disputeDecision]}
                    {item?.disputeRefundAmount ? ` (${item.disputeRefundAmount.toLocaleString('fr-FR')} FCFA)` : ''}
                  </Text>
                )}
                {item?.disputeAdminNote && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>Note : {item.disputeAdminNote}</Text>
                )}
                <TouchableOpacity
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                  onPress={() => router.push(`/dispute/${requestId}`)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Voir le litige →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Actions */}
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              {(item.status === 'accepted' || item.status === 'assigned') && (
                <TouchableOpacity style={[s.actionBtn, s.arrivingBtn]} onPress={handleArriving} disabled={updating}>
                  <Text style={s.arrivingBtnText}>{t('mission.arrivingBtn')}</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'on_the_way' || item.status === 'provider_arriving') && (
                <TouchableOpacity style={[s.actionBtn, s.arrivingBtn]} onPress={handleArrived} disabled={updating}>
                  <Text style={s.arrivingBtnText}>{t('mission.arrivedBtn')}</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'arrived' || item.status === 'paused') && (
                <TouchableOpacity style={[s.actionBtn, s.startBtn]} onPress={handleStart} disabled={updating}>
                  <Text style={s.startBtnText}>{t('mission.startBtn')}</Text>
                </TouchableOpacity>
              )}
              {item.status === 'in_progress' && (
                <>
                  <TouchableOpacity style={[s.actionBtn, s.completeBtn]} onPress={handleComplete} disabled={updating}>
                    <Text style={s.completeBtnText}>{t('mission.completeBtn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning }]} onPress={handlePause} disabled={updating}>
                    <Pause size={18} color={colors.warning} />
                    <Text style={[s.startBtnText, { color: colors.warning }]}>{t('mission.pauseBtn')}</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.status === 'paused' && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.successLight, borderWidth: 1, borderColor: colors.success }]} onPress={handleResume} disabled={updating}>
                  <Play size={18} color={colors.success} />
                  <Text style={[s.startBtnText, { color: colors.success }]}>{t('mission.resumeBtn')}</Text>
                </TouchableOpacity>
              )}
              {item.status === 'awaiting_validation' && (
                <View style={[s.actionBtn, { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warning }]}>
                  <Clock size={18} color={colors.warning} />
                  <Text style={[s.startBtnText, { color: colors.warning }]}>{t('mission.awaitingValidation')}</Text>
                </View>
              )}
              {(item.status === 'accepted' || item.status === 'assigned' || item.status === 'on_the_way' || item.status === 'provider_arriving') && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger }]} onPress={handleCancel} disabled={updating}>
                  <XCircle size={18} color={colors.danger} />
                  <Text style={[s.startBtnText, { color: colors.danger }]}>{t('mission.cancelBtn')}</Text>
                </TouchableOpacity>
              )}
              {(item.status === 'in_progress' || item.status === 'paused' || item.status === 'awaiting_validation') && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.danger }]} onPress={handleDispute} disabled={updating}>
                  <AlertTriangle size={18} color={colors.danger} />
                  <Text style={[s.startBtnText, { color: colors.danger }]}>{t('mission.disputeBtn')}</Text>
                </TouchableOpacity>
              )}
              {item.payment?.provider === 'cash' && item.payment?.status === 'held' && item.status === 'completed' && (
                <TouchableOpacity style={[s.actionBtn, s.completeBtn]} onPress={confirmCashReceived} disabled={updating}>
                  <CheckCircle size={18} color={colors.surface} />
                  <Text style={s.completeBtnText}>Confirmer le cash reçu</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  headerTitle: { flex: 1, fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  loadingBody: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  err: { color: colors.danger, fontSize: typography.base.fontSize, textAlign: 'center' },
  statusBanner: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statusBannerDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardTitle: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: typography.base.fontSize, color: colors.text, lineHeight: typography.base.lineHeight },
  meta: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  detailLabel: { fontSize: typography.base.fontSize, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  detailValue: { flex: 1, textAlign: 'right', fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
  timeline: { gap: spacing.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { width: 20, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border, marginTop: 2 },
  timelineDotDone: { backgroundColor: colors.success },
  timelineDotActive: { backgroundColor: colors.success },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4, marginBottom: -4 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineLabel: { fontSize: typography.sm.fontSize, color: colors.textMuted, paddingBottom: 10, fontWeight: typography.weight.medium as any },
  timelineLabelActive: { color: colors.text, fontWeight: typography.weight.extrabold as any },
  timelineLabelDone: { color: colors.success, fontWeight: typography.weight.extrabold as any },
  actionBtn: { borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  startBtn: { backgroundColor: colors.navy },
  startBtnText: { color: colors.surface, fontWeight: typography.weight.extrabold as any, fontSize: typography.md.fontSize },
  completeBtn: { backgroundColor: colors.success },
  completeBtnText: { color: colors.surface, fontWeight: typography.weight.extrabold as any, fontSize: typography.md.fontSize },
  chatBtn: { backgroundColor: colors.infoLight, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.info, flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  chatBtnText: { color: colors.info, fontWeight: typography.weight.extrabold as any, fontSize: typography.base.fontSize },
  arrivingBtn: { backgroundColor: colors.infoLight, borderWidth: 1, borderColor: colors.info },
  arrivingBtnText: { color: colors.info, fontWeight: typography.weight.extrabold as any, fontSize: typography.md.fontSize },
  mapFallback: { backgroundColor: colors.successLight, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.success, marginTop: spacing.md },
  mapFallbackText: { color: colors.success, fontWeight: typography.weight.extrabold as any, fontSize: typography.base.fontSize },
  routeInfo: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  routeInfoText: { color: colors.text, fontWeight: typography.weight.extrabold as any, fontSize: typography.base.fontSize },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.info, borderRadius: radius.lg, paddingVertical: spacing.lg, marginTop: spacing.md },
  navBtnText: { color: colors.surface, fontWeight: typography.weight.extrabold as any, fontSize: typography.md.fontSize },
})

export default withScreenBoundary(ActiveMission, 'ActiveMission')
