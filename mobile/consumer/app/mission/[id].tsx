import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking, Share, Dimensions, Alert } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LiveRouteMap } from '../../src/components/LiveRouteMap'
import { apiGet, apiPatchQueued, getBaseUrl } from '../../src/api'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { confirm, notify } from '../../src/confirm'
import { useTranslation } from 'react-i18next'
import i18n from '../../src/i18n'
import { ArrowLeft, Share2, Check, Star, Phone, MessageCircle, Truck, Clock, CheckCircle2, XCircle, AlertTriangle, Pause, ChevronDown, ChevronUp } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../../src/design'

const PAYMENT_BADGE: Record<string, { key: string; color: string; bg: string }> = {
  pending:   { key: 'mission.paymentPending',  color: '#92400E', bg: '#FFFBEB' },
  held:      { key: 'mission.paymentHeld',     color: '#065F46', bg: '#ECFDF5' },
  released:  { key: 'mission.paymentReleased', color: '#1E3A8A', bg: '#EFF6FF' },
  refunded:  { key: 'mission.paymentRefunded', color: '#991B1B', bg: '#FEF2F2' },
  failed:    { key: 'mission.paymentFailed',   color: '#991B1B', bg: '#FEF2F2' },
}

const SCREEN_HEIGHT = Dimensions.get('window').height
const MAP_FIT_PADDING = { top: 120, right: 40, bottom: Math.round(SCREEN_HEIGHT * 0.45), left: 40 }

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string }> = {
  created:            { key: 'mission.created',            color: '#374151', bg: '#F1F5F9' },
  broadcasted:        { key: 'mission.broadcasted',        color: '#92400E', bg: '#FFFBEB' },
  accepted:           { key: 'mission.assigned',           color: '#065F46', bg: '#ECFDF5' },
  assigned:           { key: 'mission.assigned',           color: '#065F46', bg: '#ECFDF5' },
  on_the_way:         { key: 'mission.arriving',           color: '#0369A1', bg: '#E0F2FE' },
  provider_arriving:  { key: 'mission.arriving',           color: '#0369A1', bg: '#E0F2FE' },
  arrived:            { key: 'mission.arrived',            color: '#5B21B6', bg: '#F5F3FF' },
  in_progress:        { key: 'mission.inProgress',         color: '#5B21B6', bg: '#F5F3FF' },
  paused:             { key: 'mission.paused',             color: '#92400E', bg: '#FFFBEB' },
  awaiting_validation:{ key: 'mission.awaitingValidation', color: '#92400E', bg: '#FFFBEB' },
  completed:          { key: 'mission.completed',          color: '#374151', bg: '#F1F5F9' },
  cancelled:          { key: 'mission.cancelled',          color: '#991B1B', bg: '#FEF2F2' },
  expired:            { key: 'mission.expired',            color: '#374151', bg: '#F1F5F9' },
  dispute:            { key: 'mission.dispute',            color: '#991B1B', bg: '#FEF2F2' },
  archived:           { key: 'mission.archived',           color: '#374151', bg: '#F1F5F9' },
}

function healthColor(health: 'active' | 'idle' | 'stale' | 'paused') {
  switch (health) {
    case 'paused': return { bg: '#FFFBEB', dot: '#92400E', color: '#92400E' }
    case 'active': return { bg: '#ECFDF5', dot: '#065F46', color: '#065F46' }
    case 'idle': return { bg: '#FFFBEB', dot: '#92400E', color: '#92400E' }
    case 'stale': return { bg: '#FEF2F2', dot: '#991B1B', color: '#991B1B' }
    default: return { bg: '#F1F5F9', dot: '#6B7280', color: '#6B7280' }
  }
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

function MissionDetail() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number; heading?: number | null; timestamp: number } | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [hasReview, setHasReview] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ details: true, lifecycle: true })
  const toggleSection = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const isOpen = expanded[id]
    return (
      <View style={s.section}>
        <TouchableOpacity onPress={() => toggleSection(id)} style={s.sectionHeader} activeOpacity={0.7}>
          <Text style={s.sectionTitle}>{title}</Text>
          {isOpen ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
        {isOpen && <View style={s.sectionContent}>{children}</View>}
      </View>
    )
  }

  const [, setTick] = useState(0)

  useEffect(() => {
    if (!['arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(item?.status)) return
    const interval = setInterval(() => setTick(v => v + 1), 1000)
    return () => clearInterval(interval)
  }, [item?.status])

  const load = useCallback(async (isRefresh = false) => {
    if (!requestId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setItem(r.item)
      try {
        const rev = await apiGet(`/api/services/reviews?requestId=${requestId}`)
        setHasReview(rev?.count > 0)
      } catch { setHasReview(false) }
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
      } catch {}
    }

    const handleStatusChanged = (data: any) => {
      if (String(data.requestId) === String(requestId)) syncMission()
    }

    const handleProviderLocation = (data: any) => {
      if (!Number.isFinite(Number(data?.lat)) || !Number.isFinite(Number(data?.lng))) return
      setProviderLocation({
        lat: Number(data.lat),
        lng: Number(data.lng),
        heading: data.heading ?? null,
        timestamp: Number(data.timestamp) || Date.now(),
      })
    }

    const handleReconnect = () => {
      joinRequestRoom(requestId)
      syncMission()
    }

    socket.on('request:status-changed', handleStatusChanged)
    socket.on('provider:location', handleProviderLocation)
    socket.on('connect', handleReconnect)

    const interval = setInterval(() => {
      if (!socket.connected) syncMission()
    }, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
      leaveRequestRoom(requestId)
      socket.off('request:status-changed', handleStatusChanged)
      socket.off('provider:location', handleProviderLocation)
      socket.off('connect', handleReconnect)
    }
  }, [requestId])

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
        t('mission.offlineAction')
      )
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const doAction = async (body: Record<string, unknown>) => {
    if (!requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(`/api/services/requests/${requestId}`, body, t('mission.offlineAction'))
      if (r) await load(true)
    } catch (e: any) { notify(t('common.error'), e.message) }
    finally { setUpdating(false) }
  }

  const handleCancel = async () => {
    const ok = await confirm(t('mission.cancelConfirmTitle'), t('mission.cancelConfirmMsg'))
    if (!ok) return
    doUpdateStatus('cancelled')
  }

  const handleValidate = async () => {
    const ok = await confirm(t('mission.validateTitle'), t('mission.validateMsg'))
    if (!ok || !requestId) return
    doAction({ action: 'validate' })
  }

  const handlePause = async () => {
    const reason = await promptPauseReason()
    if (!reason) return
    doAction({ action: 'pause', reason })
  }

  const handleResume = async () => {
    doAction({ action: 'resume' })
  }

  const handleDispute = async () => {
    const reason = await promptDisputeReason()
    if (!reason) return
    doAction({ action: 'dispute', reason })
  }

  const payBalance = () => {
    const offer = item?.acceptedOffer
    if (!offer || !item?.payment) return
    const balanceAmount = item?.payment?.balanceAmount || (offer.price - (item?.payment?.depositAmount || 0))
    router.push(`/payment?offerId=${offer._id}&amount=${balanceAmount}&requestId=${requestId}&phase=balance`)
  }

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t('mission.invalid')}</Text>
      </View>
    </SafeAreaView>
  )

  if (loading && !item) return (
    <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /></SafeAreaView>
  )

  if (!item) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
        <Text style={{ color: colors.danger, fontSize: 14, textAlign: 'center' }}>{err || t('common.error')}</Text>
        <TouchableOpacity onPress={() => load()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const loc = item?.location
  const offer = item?.acceptedOffer
  const hasCoords = hasValidCoords(loc)
  const lat = hasCoords ? Number(loc.coordinates[1]) : 0
  const lng = hasCoords ? Number(loc.coordinates[0]) : 0
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : t('mission.notProvided')

  const providerInitials = (offer?.providerName || 'P').slice(0, 2).toUpperCase()
  const etaDisplay = routeInfo?.duration || etaLabel
  const distanceDisplay = routeInfo?.distance || t('mission.notProvided')

  const stepLabels: Record<string, string> = {
    accepted: t('mission.stepAssigned'),
    assigned: t('mission.stepAssigned'),
    on_the_way: t('mission.stepArriving'),
    provider_arriving: t('mission.stepArriving'),
    arrived: t('mission.stepArrived'),
    in_progress: t('mission.stepInProgress'),
    awaiting_validation: t('mission.stepAwaitingValidation'),
    completed: t('mission.stepCompleted'),
  }
  const stepOrder = ['accepted', 'on_the_way', 'arrived', 'in_progress', 'awaiting_validation', 'completed']
  const status = item?.status || 'assigned'
  const currentStepIdx = stepOrder.indexOf(status)
  const categoryLabel = item?.category ? String(item.category).charAt(0).toUpperCase() + String(item.category).slice(1) : null
  const ratingAvg = Number(offer?.providerRating?.avg)
  const hasRating = Number.isFinite(ratingAvg) && ratingAvg > 0

  const STATUS_BANNER: Record<string, { label: string; color: string; dot: string }> = {
    accepted:          { label: t('mission.bannerAssigned'),    color: colors.success, dot: '#86EFAC' },
    assigned:          { label: t('mission.bannerAssigned'),    color: colors.success, dot: '#86EFAC' },
    on_the_way:        { label: t('mission.bannerArriving'),    color: colors.success, dot: '#86EFAC' },
    provider_arriving: { label: t('mission.bannerArriving'),    color: colors.success, dot: '#86EFAC' },
    arrived:           { label: t('mission.bannerArrived'),     color: '#5B21B6',      dot: '#C4B5FD' },
    in_progress:       { label: t('mission.bannerInProgress'),  color: '#5B21B6',      dot: '#C4B5FD' },
    paused:            { label: t('mission.bannerPaused'),      color: '#92400E',      dot: '#FCD34D' },
    awaiting_validation:{ label: t('mission.bannerAwaitingValidation'), color: '#92400E', dot: '#FCD34D' },
    completed:         { label: t('mission.bannerCompleted'),   color: '#334155',      dot: '#CBD5E1' },
    cancelled:         { label: t('mission.bannerCancelled'),   color: '#991B1B',      dot: '#FCA5A5' },
    expired:           { label: t('mission.bannerExpired'),     color: '#6B7280',      dot: '#D1D5DB' },
    dispute:           { label: t('mission.bannerDispute'),     color: '#991B1B',      dot: '#FCA5A5' },
    archived:          { label: t('mission.bannerArchived'),    color: '#6B7280',      dot: '#D1D5DB' },
  }
  const banner = STATUS_BANNER[status] || STATUS_BANNER.assigned
  const isTracking = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived'].includes(status)
  const canCancel = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation'].includes(status)
  const canValidate = status === 'awaiting_validation'
  const canPause = status === 'in_progress'
  const canResume = status === 'paused'
  const canDispute = ['in_progress', 'paused', 'awaiting_validation'].includes(status)
  const canRate = status === 'completed' && !hasReview

  const shareMission = async () => {
    try {
      await Share.share({
        message: `Xeuy Bi #${missionRef} - ${categoryLabel || 'Service'}${loc?.address ? ` ${loc.address}` : ''}`,
      })
    } catch {}
  }

  return (
    <SafeAreaView style={s.safe}>
      {hasCoords ? (
        <View style={s.mapContainer}>
          <LiveRouteMap
            destination={destination}
            destinationLabel={loc?.address}
            providerLocation={providerLocation || undefined}
            status={item?.status || 'assigned'}
            fitPadding={MAP_FIT_PADDING}
            onRouteInfo={setRouteInfo}
          />

          {/* Floating header */}
          <View style={s.floatingHeader}>
            <TouchableOpacity onPress={() => router.back()} style={s.floatingBtn} activeOpacity={0.6}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.floatingTitle}>{t('mission.trackingTitle')}</Text>
            <TouchableOpacity style={s.floatingBtn} onPress={shareMission} activeOpacity={0.6}>
              <Share2 size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Floating ETA pill */}
          {isTracking && (
            <View style={s.etaPill}>
              <View style={s.etaPillDot} />
              <Text style={s.etaPillText}>{t('mission.stepArriving')} - {distanceDisplay} - {etaDisplay}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.noMap}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>{t('mission.trackingTitle')}</Text>
            <View style={{ width: 36 }} />
          </View>
          <Text style={s.noMapText}>{t('mission.noLocation')}</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <View style={s.sheet}>
        <View style={s.handle} />
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        >
          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: banner.color }]}>
            <View style={[s.statusBadgeDot, { backgroundColor: banner.dot }]} />
            <Text style={s.statusBadgeText}>{banner.label}</Text>
          </View>

          {/* Timeline */}
          <View style={s.timeline}>
            {stepOrder.map((step, idx) => {
              const state = idx < currentStepIdx ? 'done' : idx === currentStepIdx ? 'active' : 'todo'
              return (
                <View key={step} style={s.timelineStep}>
                  <View style={[s.timelineDot, state === 'done' && s.timelineDotDone, state === 'active' && s.timelineDotActive]}>
                    {state === 'done' && <Check size={14} color={colors.surface} />}
                  </View>
                  <Text style={[s.timelineLabel, state === 'active' && s.timelineLabelActive]}>{stepLabels[step]}</Text>
                  {idx < stepOrder.length - 1 && <View style={[s.timelineLine, idx < currentStepIdx && s.timelineLineDone]} />}
                </View>
              )
            })}
          </View>

          {/* Provider card */}
          {offer && (
            <View style={s.providerCard}>
              <View style={s.providerAvatar}>
                <Text style={s.providerAvatarText}>{providerInitials}</Text>
                <View style={s.verifiedBadge}><Check size={10} color={colors.surface} /></View>
              </View>
              <View style={s.providerInfo}>
                <Text style={s.providerName}>{offer.providerName || t('mission.defaultProvider')}</Text>
                <View style={s.providerRow}>
                  {hasRating && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Star size={12} color={colors.warning} fill={colors.warning} />
                      <Text style={s.providerRating}>{ratingAvg.toFixed(1)}</Text>
                    </View>
                  )}
                  {categoryLabel && <Text style={s.providerMeta}>{hasRating ? ' - ' : ''}{categoryLabel}</Text>}
                </View>
              </View>
              <View style={s.providerActions}>
                <TouchableOpacity style={s.actionIconBtn} activeOpacity={0.6} onPress={() => offer.providerPhone && Linking.openURL(`tel:${offer.providerPhone}`)}>
                  <Phone size={18} color={colors.success} />
                </TouchableOpacity>
                <TouchableOpacity style={s.actionIconBtn} activeOpacity={0.6} onPress={() => router.push(`/mission-chat?id=${requestId}&providerName=${encodeURIComponent(offer.providerName || '')}${offer.providerPhone ? `&providerPhone=${encodeURIComponent(offer.providerPhone)}` : ''}`)}>
                  <MessageCircle size={18} color={colors.success} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ETA / progression card */}
          {isTracking && (
            <View style={s.etaCard}>
              <View style={[s.etaIcon, { backgroundColor: colors.primaryLight }]}>
                <Truck size={22} color={colors.primary} />
              </View>
              <View style={s.etaInfo}>
                <Text style={s.etaTitle}>{t('mission.arrivingIn', { eta: etaDisplay })}</Text>
                <Text style={s.etaSub}>{distanceDisplay} - {loc?.address || t('mission.notProvided')}</Text>
              </View>
            </View>
          )}
          {status === 'in_progress' && item?.startedAt && (
            <View style={s.etaCard}>
              <View style={[s.etaIcon, { backgroundColor: '#F5F3FF' }]}>
                <Clock size={22} color="#5B21B6" />
              </View>
              <View style={s.etaInfo}>
                <Text style={s.etaTitle}>{t('mission.sinceLabel', { duration: formatElapsed(item.startedAt) })}</Text>
                <Text style={s.etaSub}>{loc?.address || t('mission.notProvided')}</Text>
              </View>
            </View>
          )}
          {status === 'completed' && (
            <View style={s.etaCard}>
              <View style={[s.etaIcon, { backgroundColor: colors.successLight }]}>
                <CheckCircle2 size={22} color={colors.success} />
              </View>
              <View style={s.etaInfo}>
                <Text style={s.etaTitle}>{t('mission.bannerCompleted')}</Text>
                <Text style={s.etaSub}>{item?.startedAt && item?.completedAt ? t('mission.durationLabel', { duration: formatElapsed(item.startedAt, item.completedAt) }) : (loc?.address || '')}</Text>
              </View>
            </View>
          )}

          {/* Details */}
          <Section id="details" title={t('mission.detailsTitle')}>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>{t('mission.reference')}</Text>
              <Text style={s.detailValue}>#{missionRef}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>{t('mission.agreedPrice')}</Text>
              <Text style={s.detailValue}>{formatMoney(offer?.price)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>{t('mission.service')}</Text>
              <Text style={s.detailValue}>{categoryLabel || t('mission.notProvided')}</Text>
            </View>
            {item?.payment && (
              <View style={s.paymentSummary}>
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.payment')}</Text>
                  <Text style={[s.detailValue, { textTransform: 'capitalize' }]}>
                    {item.payment.provider === 'cash' ? t('mission.cashOnPlace') : item.payment.provider.replace('_', ' ')} - {item.payment.phase === 'deposit' ? t('mission.depositPhase') : item.payment.phase === 'balance' ? t('mission.balancePhase') : t('mission.totalPhase')}
                  </Text>
                </View>
                {item.payment.depositAmount > 0 && (
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>{t('mission.depositPaid')}</Text>
                    <Text style={s.detailValue}>{formatMoney(item.payment.depositAmount)}</Text>
                  </View>
                )}
                {item.payment.balanceAmount > 0 && item.payment.phase === 'deposit' && item.payment.status === 'held' && (
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>{t('mission.balanceDue')}</Text>
                    <Text style={s.detailValue}>{formatMoney(item.payment.balanceAmount)}</Text>
                  </View>
                )}
                <View style={[s.paymentBadge, { backgroundColor: PAYMENT_BADGE[item.payment.status]?.bg || '#F1F5F9' }]}>
                  <Text style={[s.paymentBadgeText, { color: PAYMENT_BADGE[item.payment.status]?.color || '#64748B' }]}>
                    {t(PAYMENT_BADGE[item.payment.status]?.key || 'mission.paymentPending')}
                  </Text>
                </View>
                {item.payment.phase === 'deposit' && item.payment.status === 'held' && item.status !== 'cancelled' && item.status !== 'completed' && (
                  <TouchableOpacity style={s.payBalanceBtn} onPress={payBalance} activeOpacity={0.8}>
                    <Text style={s.payBalanceBtnText}>{t('payment.payBalance')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Section>

          {/* Métriques cycle de vie */}
          {item.metrics && (
            <Section id="lifecycle" title={t('mission.lifecycleTitle')}>
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
                  <Text style={s.detailValue}>{new Date(item.metrics.estimatedResumeAt).toLocaleString()}</Text>
                </View>
              )}
              {item.metrics.currentPauseReason && (
                <View style={s.detailRow}>
                  <Text style={s.detailLabel}>{t('mission.pauseReason')}</Text>
                  <Text style={s.detailValue}>{item.metrics.currentPauseReason}</Text>
                </View>
              )}
            </Section>
          )}

          {/* Actions */}
          {canValidate && (
            <TouchableOpacity style={s.validateBtn} onPress={handleValidate} disabled={updating} activeOpacity={0.8}>
              <CheckCircle2 size={18} color={colors.surface} />
              <Text style={s.validateBtnText}>{t('mission.validateBtn')}</Text>
            </TouchableOpacity>
          )}
          {canPause && (
            <TouchableOpacity style={s.pauseBtn} onPress={handlePause} disabled={updating} activeOpacity={0.8}>
              <Clock size={18} color={colors.warning} />
              <Text style={s.pauseBtnText}>{t('mission.pauseBtn')}</Text>
            </TouchableOpacity>
          )}
          {canResume && (
            <TouchableOpacity style={s.validateBtn} onPress={handleResume} disabled={updating} activeOpacity={0.8}>
              <CheckCircle2 size={18} color={colors.surface} />
              <Text style={s.validateBtnText}>{t('mission.resumeBtn')}</Text>
            </TouchableOpacity>
          )}
          {canDispute && (
            <TouchableOpacity style={s.cancelBtn} onPress={handleDispute} disabled={updating} activeOpacity={0.6}>
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={s.cancelBtnText}>{t('mission.disputeBtn')}</Text>
            </TouchableOpacity>
          )}

          {canRate && (
            <TouchableOpacity style={s.rateBtn} onPress={() => router.push(`/rate-mission?id=${requestId}&providerName=${encodeURIComponent(offer?.providerName || '')}`)} activeOpacity={0.8}>
              <Star size={18} color={colors.surface} fill={colors.surface} />
              <Text style={s.rateBtnText}>{t('mission.rate')}</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={updating} activeOpacity={0.6}>
              <XCircle size={16} color={colors.danger} />
              <Text style={s.cancelBtnText}>{t('mission.cancelBtn')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  mapContainer: { flex: 1, position: 'relative' },
  floatingHeader: { position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  floatingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  floatingTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text },
  etaPill: { position: 'absolute', top: 72, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.lg, zIndex: 10 },
  etaPillDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  etaPillText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text },
  noMap: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  noMapText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.md, maxHeight: '70%', minHeight: '45%', ...shadows.xl },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86EFAC' },
  statusBadgeText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: { backgroundColor: colors.success, borderColor: colors.success },
  timelineLine: { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, backgroundColor: colors.border, zIndex: -1 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: typography.weight.medium as any },
  timelineLabelActive: { color: colors.text, fontWeight: typography.weight.extrabold as any },
  providerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  providerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  providerAvatarText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  providerRating: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  providerMeta: { fontSize: 13, color: colors.textSecondary },
  providerActions: { flexDirection: 'row', gap: spacing.sm },
  actionIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
  etaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  etaIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  etaInfo: { flex: 1 },
  etaTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  etaSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  detailsCard: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  section: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionContent: { gap: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: typography.weight.extrabold as any },
  paymentSummary: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  paymentBadge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginTop: spacing.sm },
  paymentBadgeText: { fontSize: 12, fontWeight: typography.weight.extrabold as any },
  payBalanceBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  payBalanceBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  rateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.warning, borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.sm },
  rateBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  validateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.sm },
  validateBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: colors.warning, borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.sm },
  pauseBtnText: { color: colors.warning, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  cancelBtnText: { fontSize: 14, color: colors.danger, fontWeight: typography.weight.semibold as any },
})

export default withScreenBoundary(MissionDetail, 'MissionDetail')
