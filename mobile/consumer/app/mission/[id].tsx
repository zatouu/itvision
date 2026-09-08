import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking, Share, Dimensions, AppState } from 'react-native'

import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LiveRouteMap } from '../../src/components/LiveRouteMap'
import { apiGet, apiPatchQueued, getBaseUrl } from '../../src/api'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { connectSocket, joinRequestRoom, leaveRequestRoom, emitMissionStatus } from '../../src/socket'
import { confirm, notify } from '../../src/confirm'
import { humanErrorMessage } from '../../src/errorMessages'
import { useTranslation } from 'react-i18next'
import i18n from '../../src/i18n'
import { ArrowLeft, Share2, Check, Star, Phone, MessageCircle, CheckCircle2, AlertTriangle, MapPin, Handshake, Wrench, Send, ChevronRight } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows, getCategoryMeta } from '../../src/design'

const PAYMENT_BADGE: Record<string, { key: string; color: string; bg: string }> = {
  pending:   { key: 'mission.paymentPending',  color: '#92400E', bg: colors.warningLight },
  held:      { key: 'mission.paymentHeld',     color: '#065F46', bg: '#ECFDF5' },
  released:  { key: 'mission.paymentReleased', color: '#1E3A8A', bg: colors.infoLight },
  refunded:  { key: 'mission.paymentRefunded', color: '#991B1B', bg: '#FEF2F2' },
  failed:    { key: 'mission.paymentFailed',   color: '#991B1B', bg: '#FEF2F2' },
}

const SCREEN_HEIGHT = Dimensions.get('window').height
const MAP_FIT_PADDING = { top: 120, right: 40, bottom: Math.round(SCREEN_HEIGHT * 0.45), left: 40 }

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

const DISPUTE_REASONS = [
  { key: 'paiement', label: 'Paiement' },
  { key: 'qualite', label: 'Qualité' },
  { key: 'retard', label: 'Retard' },
  { key: 'comportement', label: 'Comportement' },
  { key: 'autre', label: 'Autre' },
]

function MissionDetail() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [providerLocation, setProviderLocation] = useState<{ lat: number; lng: number; heading?: number | null; timestamp: number } | null>(null)
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null)
  const [hasReview, setHasReview] = useState(false)
  const [, setTick] = useState(0)
  const syncInFlight = useRef(false)
  const lastSyncAt = useRef(0)

  // Tick interval: only when app is active — pauses in background to prevent freeze
  useEffect(() => {
    if (!['arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(item?.status)) return
    let interval: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (interval) return
      interval = setInterval(() => setTick(v => v + 1), 1000)
    }
    const stop = () => {
      if (interval) { clearInterval(interval); interval = null }
    }
    const handleAppState = (state: string) => {
      if (state === 'active') start()
      else stop()
    }

    start()
    const sub = AppState.addEventListener('change', handleAppState)
    return () => { stop(); sub.remove() }
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
    } catch (e: any) { setErr(humanErrorMessage(e)) }
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
      if (syncInFlight.current) return
      const now = Date.now()
      if (now - lastSyncAt.current < 5000) return
      lastSyncAt.current = now
      syncInFlight.current = true
      try {
        const r = await apiGet(`/api/services/requests/${requestId}`)
        if (mounted) setItem(r.item)
      } catch {}
      finally { syncInFlight.current = false }
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
    socket.on('mission:status_updated', handleStatusChanged)
    socket.on('provider:location', handleProviderLocation)
    socket.on('connect', handleReconnect)

    // Fallback: auto-refresh when WS disconnected (paused in background)
    let fallbackInterval: ReturnType<typeof setInterval> | null = null
    const startFallback = () => {
      if (fallbackInterval) return
      fallbackInterval = setInterval(() => {
        if (!socket.connected && AppState.currentState === 'active') syncMission()
      }, 15000)
    }
    const stopFallback = () => {
      if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null }
    }
    const handleAppState2 = (state: string) => {
      if (state === 'active') startFallback()
      else stopFallback()
    }
    startFallback()
    const sub2 = AppState.addEventListener('change', handleAppState2)

    return () => {
      mounted = false
      stopFallback()
      sub2.remove()
      leaveRequestRoom(requestId)
      socket.off('request:status-changed', handleStatusChanged)
      socket.off('mission:status_updated', handleStatusChanged)
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
      if (r) {
        emitMissionStatus(requestId, nextStatus, { providerId: item?.acceptedOffer?.providerId })
        await load(true)
      }
    } catch (e: any) { notify(t('common.error'), humanErrorMessage(e)) }
    finally { setUpdating(false) }
  }

  const doAction = async (body: Record<string, unknown>) => {
    if (!requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(`/api/services/requests/${requestId}`, body, t('mission.offlineAction'))
      if (r) {
        const ACTION_STATUS: Record<string, string> = { validate: 'completed', pause: 'paused', resume: 'in_progress', dispute: 'dispute' }
        const resulting = ACTION_STATUS[String(body.action || '')]
        if (resulting) emitMissionStatus(requestId, resulting, { providerId: item?.acceptedOffer?.providerId })
        await load(true)
      }
    } catch (e: any) { notify(t('common.error'), humanErrorMessage(e)) }
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

  const payBalance = () => {
    const offer = item?.acceptedOffer
    if (!offer || !item?.payment) return
    const balanceAmount = item?.payment?.balanceAmount || (offer.price - (item?.payment?.depositAmount || 0))
    router.push(`/payment?offerId=${offer._id}&amount=${balanceAmount}&requestId=${requestId}&phase=balance`)
  }

  if (loading && !item) return (
    <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /></SafeAreaView>
  )

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t('mission.invalid')}</Text>
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

  const status = item?.status || 'assigned'
  const categoryLabel = item?.category ? String(item.category).charAt(0).toUpperCase() + String(item.category).slice(1) : null
  const catMeta = getCategoryMeta(item?.category)
  const ratingAvg = Number(offer?.providerRating?.avg)
  const hasRating = Number.isFinite(ratingAvg) && ratingAvg > 0
  const missionsCount = Number(offer?.providerRating?.count ?? offer?.providerMissions) || null

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
  const showMap = hasCoords && isTracking
  const canCancel = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation'].includes(status)
  const canValidate = status === 'awaiting_validation'
  const canRate = status === 'completed' && !hasReview
  const hasDispute = item?.status === 'dispute' || !!item?.disputeStatus || !!item?.disputeDecision

  // Colonne droite de la carte prestataire selon la phase
  const providerPhase: { label: string; value: string } =
    status === 'arrived'
      ? { label: t('mission.atYourDoor', { defaultValue: 'À votre porte' }), value: t('mission.now', { defaultValue: 'Maintenant' }) }
      : ['in_progress', 'paused'].includes(status)
        ? { label: t('mission.since', { defaultValue: 'Depuis' }), value: formatElapsed(item?.startedAt) || '—' }
        : ['awaiting_validation', 'completed'].includes(status)
          ? { label: t('mission.finishedAt', { defaultValue: 'Terminé' }), value: item?.completedAt ? new Date(item.completedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—' }
          : { label: t('mission.arrivesIn', { defaultValue: 'Arrive dans' }), value: etaDisplay }

  // Header coloré pour les phases sans carte (mock : map uniquement en trajet)
  const phaseHeader: { bg: string; eyebrow: string; title: string } | null = showMap ? null
    : status === 'awaiting_validation'
      ? { bg: colors.primary, eyebrow: t('mission.heroEnded', { defaultValue: 'Mission terminée' }), title: t('mission.heroValidate', { defaultValue: 'Vérifiez et validez le travail' }) }
      : ['in_progress', 'paused'].includes(status)
        ? { bg: colors.navy, eyebrow: t('mission.heroOngoing', { defaultValue: 'Mission en cours' }), title: t('mission.heroWorking', { defaultValue: 'Le prestataire travaille chez vous' }) }
        : status === 'dispute'
          ? { bg: '#991B1B', eyebrow: t('mission.dispute', { defaultValue: 'Litige' }), title: t('mission.bannerDispute', { defaultValue: 'Litige en cours' }) }
          : ['cancelled', 'expired', 'archived'].includes(status)
            ? { bg: '#334155', eyebrow: banner.label, title: banner.label }
            : status === 'completed'
              ? { bg: '#334155', eyebrow: t('mission.heroEnded', { defaultValue: 'Mission terminée' }), title: t('mission.bannerCompleted', { defaultValue: 'Mission terminée' }) }
              : { bg: colors.navy, eyebrow: banner.label, title: banner.label }

  // Timeline verticale — vrais horodatages du statusLog
  const logTs = (targets: string[]) => {
    const entry = (item?.statusLog || []).find((e: any) => e.action === 'status_changed' && targets.includes(e.toStatus))
    return entry ? new Date(entry.timestamp) : null
  }
  const fmtTs = (d: Date | null) => d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null
  const tlStepIdx = ['accepted', 'assigned'].includes(status) ? 0
    : ['on_the_way', 'provider_arriving'].includes(status) ? 1
    : ['arrived', 'in_progress', 'paused'].includes(status) ? 2
    : ['awaiting_validation', 'completed', 'dispute'].includes(status) ? 3 : 0
  const timelineSteps = [
    { label: t('mission.tlAccepted', { defaultValue: 'Offre acceptée' }), ts: logTs(['accepted', 'assigned']) || (item?.assignedAt ? new Date(item.assignedAt) : null) },
    { label: t('mission.tlEnRoute', { defaultValue: 'En route' }), ts: logTs(['on_the_way', 'provider_arriving']) },
    { label: t('mission.tlOnSite', { defaultValue: 'Sur place' }), ts: logTs(['arrived', 'in_progress']) },
    { label: t('mission.tlDone', { defaultValue: 'Travail effectué' }), ts: logTs(['awaiting_validation', 'completed']) },
  ]

  const callProvider = () => {
    if (offer?.providerPhone) Linking.openURL(`tel:${offer.providerPhone}`).catch(() => {})
  }
  const openChat = () => {
    router.push(`/mission-chat?id=${requestId}&providerName=${encodeURIComponent(offer?.providerName || '')}${offer?.providerPhone ? `&providerPhone=${encodeURIComponent(offer.providerPhone)}` : ''}` as any)
  }
  const openPosition = () => {
    const p = providerLocation || (hasCoords ? { lat, lng } : null)
    if (p) Linking.openURL(`https://maps.google.com/?q=${p.lat},${p.lng}`).catch(() => {})
  }
  const openDispute = () => router.push(`/dispute?requestId=${requestId}` as any)
  const providerFirstName = (offer?.providerName || '').split(' ')[0] || t('mission.defaultProvider')

  const shareMission = async () => {
    try {
      await Share.share({
        message: `Xeuy Bi #${missionRef} - ${categoryLabel || 'Service'}${loc?.address ? ` ${loc.address}` : ''}`,
      })
    } catch {}
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {showMap ? (
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
            <View style={s.livePill}>
              <View style={s.livePillDot} />
              <Text style={s.livePillText}>{t('mission.liveTracking', { defaultValue: 'Suivi live' })}</Text>
            </View>
            <TouchableOpacity style={s.floatingBtn} onPress={shareMission} activeOpacity={0.6}>
              <Share2 size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Floating ETA pill */}
          {isTracking && (
            <View style={s.etaPill}>
              <View style={s.etaPillDot} />
              <Text style={s.etaPillText}>{banner.label} · {distanceDisplay} · {etaDisplay}</Text>
            </View>
          )}
        </View>
      ) : (
        /* Header coloré pour les phases sans carte */
        <View style={[s.phaseHeader, { backgroundColor: phaseHeader?.bg || colors.navy }]}>
          <View style={s.phaseHeaderRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.phaseBackBtn} activeOpacity={0.7}>
              <ArrowLeft size={18} color="#fff" />
            </TouchableOpacity>
            <View style={s.phasePill}>
              <View style={[s.statusBadgeDot, { backgroundColor: banner.dot }]} />
              <Text style={s.phasePillText}>{banner.label}</Text>
            </View>
            <TouchableOpacity style={s.phaseBackBtn} onPress={shareMission} activeOpacity={0.7}>
              <Share2 size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={s.phaseEyebrow}>{phaseHeader?.eyebrow}</Text>
          <Text style={s.phaseTitle}>{phaseHeader?.title}</Text>
          {!hasCoords && <Text style={s.phaseNoLoc}>{t('mission.noLocation')}</Text>}
        </View>
      )}

      {/* Contenu */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl }}
      >
        {/* Carte prestataire + actions rapides */}
        {offer && (
          <View style={s.card}>
            <View style={s.providerMainRow}>
              <View style={s.avatarWrap}>
                <View style={[s.providerAvatar, { backgroundColor: catMeta.color }]}>
                  <Text style={s.providerAvatarText}>{providerInitials}</Text>
                </View>
                {!!offer.providerVerified && (
                  <View style={s.verifiedBadge}><Check size={9} color={colors.surface} strokeWidth={3.5} /></View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.providerName} numberOfLines={1}>{offer.providerName || t('mission.defaultProvider')}</Text>
                <View style={s.providerRow}>
                  {hasRating && (
                    <>
                      <Star size={11} color={colors.warning} fill={colors.warning} />
                      <Text style={s.providerRating}>{ratingAvg.toFixed(1)}</Text>
                      <Text style={s.providerMeta}> · </Text>
                    </>
                  )}
                  <Text style={s.providerMeta} numberOfLines={1}>
                    {missionsCount ? `${missionsCount} ${t('clientProvider.missions', { defaultValue: 'missions' }).toLowerCase()} · ` : ''}{categoryLabel || ''}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.phaseMiniLabel}>{providerPhase.label}</Text>
                <Text style={s.phaseMiniValue}>{providerPhase.value}</Text>
              </View>
            </View>

            <View style={s.quickActions}>
              {[
                { icon: Phone, label: t('home.call', { defaultValue: 'Appeler' }), color: colors.primary, onPress: callProvider, disabled: !offer.providerPhone },
                { icon: MessageCircle, label: t('home.message', { defaultValue: 'Message' }), color: colors.info, onPress: openChat },
                { icon: MapPin, label: t('mission.position', { defaultValue: 'Position' }), color: colors.warning, onPress: openPosition, disabled: !providerLocation && !hasCoords },
                { icon: AlertTriangle, label: t('mission.dispute', { defaultValue: 'Litige' }), color: colors.danger, onPress: openDispute },
              ].map((a, i) => (
                <TouchableOpacity key={i} style={s.quickAction} onPress={a.onPress} disabled={a.disabled} activeOpacity={0.7}>
                  <View style={[s.quickActionIcon, { backgroundColor: `${a.color}15`, opacity: a.disabled ? 0.4 : 1 }]}>
                    <a.icon size={17} color={a.color} />
                  </View>
                  <Text style={s.quickActionLabel}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Progression */}
        <View style={s.card}>
          <View style={s.progressHead}>
            <Text style={s.cardLabel}>{t('mission.progression', { defaultValue: 'Progression' })}</Text>
            <Text style={s.progressStep}>{t('mission.stepOf', { n: tlStepIdx + 1, defaultValue: `Étape ${tlStepIdx + 1}/4` })}</Text>
          </View>
          {timelineSteps.map((step, i) => {
            const done = i < tlStepIdx
            const active = i === tlStepIdx
            const ts = fmtTs(step.ts)
            return (
              <View key={i} style={s.tlRow}>
                <View style={s.tlRail}>
                  <View style={[s.tlDot, done && s.tlDotDone, active && s.tlDotActive]}>
                    {done && <Check size={10} color="#fff" strokeWidth={3} />}
                  </View>
                  {i < timelineSteps.length - 1 && <View style={[s.tlLine, done && s.tlLineDone]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 14 }}>
                  <Text style={[s.tlLabel, (done || active) && s.tlLabelOn]}>{step.label}</Text>
                  <Text style={s.tlTime}>
                    {ts ? `${t('common.today', { defaultValue: 'Aujourd\'hui' })} ${ts}` : active ? t('mission.tlNow', { defaultValue: 'En cours…' }) : t('mission.tlPending', { defaultValue: 'En attente' })}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>

        {/* Récap demande */}
        <View style={[s.card, s.summaryCard]}>
          <View style={[s.summaryIcon, { backgroundColor: catMeta.color }]}>
            <Wrench size={19} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.summaryTitle} numberOfLines={1}>
              {item?.title || categoryLabel || t('mission.notProvided')} · #{missionRef}
            </Text>
            <Text style={s.summarySub} numberOfLines={1}>
              {loc?.address || t('mission.notProvided')} · {formatMoney(offer?.price)}
            </Text>
          </View>
        </View>

        {/* Paiement */}
        {item?.payment && (
          <View style={s.paymentCard}>
            <View style={s.paymentIcon}><Handshake size={16} color="#fff" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.paymentTitle}>
                {formatMoney(offer?.price || item.payment.amount)} · {item.payment.provider === 'cash'
                  ? t('mission.cashOnPlace')
                  : `${item.payment.provider.replace('_', ' ')} — ${item.payment.phase === 'deposit' ? t('mission.depositPhase') : item.payment.phase === 'balance' ? t('mission.balancePhase') : t('mission.totalPhase')}`}
              </Text>
              <Text style={s.paymentSub}>
                {item.payment.provider === 'cash'
                  ? t('mission.cashPaySub', { defaultValue: 'Vous payez le prestataire après validation' })
                  : t(PAYMENT_BADGE[item.payment.status]?.key || 'mission.paymentPending')}
              </Text>
              {(item.payment.depositAmount > 0 || item.payment.balanceAmount > 0) && (
                <Text style={s.paymentDetail}>
                  {item.payment.depositAmount > 0 ? `${t('mission.depositPaid')} ${formatMoney(item.payment.depositAmount)}` : ''}
                  {item.payment.depositAmount > 0 && item.payment.balanceAmount > 0 ? ' · ' : ''}
                  {item.payment.balanceAmount > 0 ? `${t('mission.balanceDue')} ${formatMoney(item.payment.balanceAmount)}` : ''}
                </Text>
              )}
            </View>
          </View>
        )}
        {item?.payment?.depositStatus === 'held' && item.payment.balanceStatus !== 'held' && item.payment.balanceStatus !== 'pending' && item.payment.balanceAmount > 0 && !['cancelled', 'completed'].includes(status) && (
          <TouchableOpacity style={s.payBalanceBtn} onPress={payBalance} activeOpacity={0.8}>
            <Text style={s.payBalanceBtnText}>{t('payment.payBalance')}</Text>
          </TouchableOpacity>
        )}

        {/* Litige */}
        {hasDispute && (
          <TouchableOpacity style={s.disputeCard} onPress={openDispute} activeOpacity={0.75}>
            <View style={[s.summaryIcon, { backgroundColor: item?.disputeStatus === 'resolved' ? colors.success : colors.danger }]}>
              <AlertTriangle size={17} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.disputeTitle}>
                {item?.disputeStatus === 'resolved' ? t('mission.disputeResolved', { defaultValue: 'Litige résolu' }) : t('mission.disputeOngoing', { defaultValue: 'Litige en cours' })}
              </Text>
              {!!item?.disputeReason && (
                <Text style={s.disputeSub} numberOfLines={1}>
                  {DISPUTE_REASONS.find(r => r.key === item.disputeReason)?.label || item.disputeReason}
                </Text>
              )}
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Métriques */}
        {item?.metrics && (
          <View style={s.card}>
            <Text style={s.cardLabel}>{t('mission.metrics', { defaultValue: 'Suivi' })}</Text>
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
                <Text style={s.detailValue}>{PAUSE_REASONS.find(r => r.key === item.metrics.currentPauseReason)?.label || item.metrics.currentPauseReason}</Text>
              </View>
            )}
          </View>
        )}

        {canCancel && !canValidate && (
          <TouchableOpacity style={{ alignSelf: 'center', marginTop: 6, padding: 8 }} onPress={handleCancel} disabled={updating} activeOpacity={0.6}>
            <Text style={s.cancelLink}>{t('mission.cancelBtn')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Action sticky contextuelle */}
      <View style={s.footer}>
        {canValidate ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.footerBtn, s.footerGhost]} onPress={openDispute} activeOpacity={0.8}>
              <Text style={s.footerGhostText}>{t('mission.reportProblem', { defaultValue: 'Signaler un problème' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.footerBtn, s.footerSuccess, { flex: 1.4 }]} onPress={handleValidate} disabled={updating} activeOpacity={0.85}>
              {updating ? <ActivityIndicator color="#fff" /> : <CheckCircle2 size={17} color="#fff" />}
              <Text style={s.footerText}>{t('mission.validateBtn')}</Text>
            </TouchableOpacity>
          </View>
        ) : ['in_progress', 'paused'].includes(status) ? (
          <TouchableOpacity style={[s.footerBtn, s.footerDark]} onPress={openChat} activeOpacity={0.85}>
            <Send size={16} color="#fff" />
            <Text style={s.footerText}>{t('mission.sendMessage', { defaultValue: 'Envoyer message' })}</Text>
          </TouchableOpacity>
        ) : canRate ? (
          <TouchableOpacity style={[s.footerBtn, s.footerPrimary]} onPress={() => router.push(`/rate-mission?id=${requestId}&providerName=${encodeURIComponent(offer?.providerName || '')}`)} activeOpacity={0.85}>
            <Star size={17} color="#fff" fill="#fff" />
            <Text style={s.footerText}>{t('mission.rate')}</Text>
          </TouchableOpacity>
        ) : offer ? (
          <TouchableOpacity style={[s.footerBtn, s.footerDark, !offer.providerPhone && { opacity: 0.5 }]} onPress={callProvider} disabled={!offer.providerPhone} activeOpacity={0.85}>
            <Phone size={16} color="#fff" />
            <Text style={s.footerText}>{t('mission.contactProvider', { name: providerFirstName, defaultValue: `Contacter ${providerFirstName}` })}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  // ── Carte (phases trajet) ──
  mapContainer: { height: 260, position: 'relative' },
  floatingHeader: { position: 'absolute', top: spacing.md, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  floatingBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, ...shadows.md },
  livePillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  livePillText: { fontSize: 11.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  etaPill: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.lg, zIndex: 10 },
  etaPillDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  etaPillText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text },
  // ── Header coloré (phases sans carte) ──
  phaseHeader: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 24 },
  phaseHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  phaseBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  phasePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  phasePillText: { fontSize: 11.5, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  phaseEyebrow: { fontSize: 11, fontWeight: typography.weight.extrabold as any, letterSpacing: 0.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' },
  phaseTitle: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: '#fff', letterSpacing: -0.4, marginTop: 6 },
  phaseNoLoc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6 },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86EFAC' },
  // ── Cartes ──
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.sm },
  cardLabel: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  providerMainRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatarWrap: { position: 'relative' },
  providerAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { color: '#fff', fontSize: 16, fontWeight: typography.weight.extrabold as any },
  verifiedBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  providerName: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  providerRating: { fontSize: 12, color: colors.ink, fontWeight: typography.weight.bold as any },
  providerMeta: { fontSize: 12, color: colors.textMuted },
  phaseMiniLabel: { fontSize: 10, color: colors.textMuted, fontWeight: typography.weight.bold as any, letterSpacing: 0.3, textTransform: 'uppercase' },
  phaseMiniValue: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.4 },
  quickActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  quickAction: { flex: 1, alignItems: 'center', gap: 4 },
  quickActionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.text },
  // ── Timeline verticale ──
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressStep: { fontSize: 11, color: colors.textMuted, fontWeight: typography.weight.bold as any },
  tlRow: { flexDirection: 'row', gap: 10 },
  tlRail: { alignItems: 'center', width: 20 },
  tlDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tlDotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  tlDotActive: { borderColor: colors.primary, backgroundColor: colors.brandSoft },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  tlLineDone: { backgroundColor: colors.primary },
  tlLabel: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.textDim },
  tlLabelOn: { color: colors.ink },
  tlTime: { fontSize: 10.5, color: colors.textDim, marginTop: 1 },
  // ── Récap + paiement + litige ──
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 13.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  summarySub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  paymentCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: 16, padding: 14, marginBottom: 12 },
  paymentIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  paymentSub: { fontSize: 11, color: colors.brandInk, opacity: 0.85, marginTop: 2 },
  paymentDetail: { fontSize: 10.5, color: colors.brandInk, opacity: 0.7, marginTop: 4 },
  payBalanceBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12, ...shadows.md },
  payBalanceBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  disputeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 14, marginBottom: 12 },
  disputeTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.dangerInk },
  disputeSub: { fontSize: 11.5, color: colors.dangerInk, opacity: 0.85, marginTop: 1 },
  // ── Détails ──
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: typography.weight.extrabold as any },
  cancelLink: { fontSize: 13, color: colors.danger, fontWeight: typography.weight.bold as any },
  // ── Footer sticky ──
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 14, minHeight: 50 },
  footerDark: { backgroundColor: colors.ink },
  footerPrimary: { backgroundColor: colors.warning },
  footerSuccess: { backgroundColor: colors.success, ...shadows.md },
  footerGhost: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  footerText: { color: '#fff', fontSize: 14, fontWeight: typography.weight.extrabold as any },
  footerGhostText: { color: colors.text, fontSize: 14, fontWeight: typography.weight.bold as any },
})

export default withScreenBoundary(MissionDetail, 'MissionDetail')
