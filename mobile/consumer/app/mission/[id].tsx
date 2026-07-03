import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking } from 'react-native'
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
import { colors, radius, spacing, typography, shadows } from '../../src/design'

const PAYMENT_BADGE: Record<string, { key: string; color: string; bg: string }> = {
  pending:   { key: 'mission.paymentPending',  color: '#92400E', bg: '#FFFBEB' },
  held:      { key: 'mission.paymentHeld',     color: '#065F46', bg: '#ECFDF5' },
  released:  { key: 'mission.paymentReleased', color: '#1E3A8A', bg: '#EFF6FF' },
  refunded:  { key: 'mission.paymentRefunded', color: '#991B1B', bg: '#FEF2F2' },
  failed:    { key: 'mission.paymentFailed',   color: '#991B1B', bg: '#FEF2F2' },
}

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string }> = {
  assigned:           { key: 'mission.assigned',           color: '#065F46', bg: '#ECFDF5' },
  provider_arriving:  { key: 'mission.arriving',           color: '#0369A1', bg: '#E0F2FE' },
  in_progress:        { key: 'mission.inProgress',         color: '#5B21B6', bg: '#F5F3FF' },
  completed:          { key: 'mission.completed',          color: '#374151', bg: '#F1F5F9' },
  cancelled:          { key: 'mission.cancelled',          color: '#991B1B', bg: '#FEF2F2' },
}

const FLOW_STEPS = [
  { key: 'assigned', labelKey: 'mission.step_assigned' },
  { key: 'provider_arriving', labelKey: 'mission.step_arriving' },
  { key: 'in_progress', labelKey: 'mission.step_in_progress' },
  { key: 'completed', labelKey: 'mission.step_completed' },
] as const

function getStepState(currentStatus: string, stepKey: string): 'done' | 'active' | 'todo' {
  if (currentStatus === 'cancelled') return 'todo'
  const order: Record<string, number> = { assigned: 0, provider_arriving: 1, in_progress: 2, completed: 3 }
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

function isImageMedia(type: unknown, url: unknown): boolean {
  const mediaType = String(type || '').toLowerCase()
  if (mediaType === 'image') return true
  const mediaUrl = String(url || '')
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(mediaUrl)
}

function resolveMediaUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null
  const v = rawUrl.trim()
  if (!v) return null
  if (/^(https?:|file:|blob:|data:)/i.test(v)) return v
  const base = getBaseUrl().replace(/\/$/, '')
  if (v.startsWith('/')) return `${base}${v}`
  return `${base}/${v}`
}

function getMediaLabel(type: unknown): string {
  const mediaType = String(type || '').toLowerCase()
  if (mediaType === 'audio') return 'Audio'
  if (mediaType === 'video') return 'Video'
  if (mediaType === 'image') return 'Image'
  return 'File'
}

function hasValidCoords(location: any): location is { coordinates: [number, number]; address?: string } {
  return (
    Array.isArray(location?.coordinates)
    && location.coordinates.length === 2
    && Number.isFinite(Number(location.coordinates[0]))
    && Number.isFinite(Number(location.coordinates[1]))
  )
}

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
  const [hasReview, setHasReview] = useState(false)
  const [, setTick] = useState(0)

  // Timer: refresh elapsed display every second while mission is in_progress
  useEffect(() => {
    if (item?.status !== 'in_progress') return
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
      // Check if already reviewed
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

  // WebSocket temps réel
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
        // no-op: fallback silencieux pour ne pas bloquer l'UI
      }
    }

    const handleStatusChanged = (data: any) => {
      if (String(data.requestId) === String(requestId)) {
        syncMission()
      }
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

    socket.on('request:status-changed', handleStatusChanged)
    socket.on('provider:location', handleProviderLocation)

    // Fallback si un événement WS est manqué
    const interval = setInterval(() => {
      syncMission()
    }, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
      leaveRequestRoom(requestId)
      socket.off('request:status-changed', handleStatusChanged)
      socket.off('provider:location', handleProviderLocation)
    }
  }, [requestId])

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

  const handleCancel = async () => {
    const ok = await confirm(t('mission.cancelConfirmTitle'), t('mission.cancelConfirmMsg'))
    if (!ok) return
    doUpdateStatus('cancelled')
  }

  if (loading && !item) return (
    <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color="#0F172A" /></SafeAreaView>
  )

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.danger, fontSize: 14 }}>{t('mission.invalid')}</Text>
      </View>
    </SafeAreaView>
  )

  const openMedia = async (url?: string) => {
    const mediaUrl = resolveMediaUrl(url)
    if (!mediaUrl) {
      notify(t('mission.mediaUnavailable'), t('mission.invalidMediaLink'))
      return
    }
    try {
      const canOpen = await Linking.canOpenURL(mediaUrl)
      if (!canOpen) {
        notify(t('mission.mediaUnavailable'), t('mission.cannotOpenLink'))
        return
      }
      await Linking.openURL(mediaUrl)
    } catch {
      notify(t('mission.mediaUnavailable'), t('mission.cannotOpenMedia'))
    }
  }

  const st = item ? STATUS_CONFIG[item.status] || STATUS_CONFIG.assigned : null
  const loc = item?.location
  const offer = item?.acceptedOffer
  const hasCoords = hasValidCoords(loc)
  const lat = hasCoords ? Number(loc.coordinates[1]) : 0
  const lng = hasCoords ? Number(loc.coordinates[0]) : 0
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : t('mission.notProvided')

  const providerInitials = (offer?.providerName || 'P').slice(0, 2).toUpperCase()
  const etaDisplay = etaLabel
  const stepLabels: Record<string, string> = { assigned: 'Assigné', provider_arriving: 'En route', in_progress: 'Sur place', completed: 'Terminée' }
  const stepOrder = ['assigned', 'provider_arriving', 'in_progress', 'completed']
  const currentStepIdx = stepOrder.indexOf(item?.status || 'assigned')

  return (
    <SafeAreaView style={s.safe}>
      {hasCoords ? (
        <View style={s.mapContainer}>
          <LiveRouteMap
            destination={{ lat, lng }}
            destinationLabel={loc?.address}
            providerLocation={providerLocation || undefined}
            status={item?.status || 'assigned'}
          />

          {/* Floating header */}
          <View style={s.floatingHeader}>
            <TouchableOpacity onPress={() => router.back()} style={s.floatingBtn}>
              <Text style={s.floatingBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={s.floatingTitle}>Suivi</Text>
            <TouchableOpacity style={s.floatingBtn}>
              <Text style={s.floatingBtnText}>↑</Text>
            </TouchableOpacity>
          </View>

          {/* Floating ETA pill */}
          <View style={s.etaPill}>
            <View style={s.etaPillDot} />
            <Text style={s.etaPillText}>En route · Arrive dans {etaDisplay}</Text>
          </View>
        </View>
      ) : (
        <View style={s.noMap}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Suivi</Text>
            <View style={{ width: 36 }} />
          </View>
          <Text style={s.noMapText}>Aucune position disponible</Text>
        </View>
      )}

      {/* Bottom sheet */}
      <View style={s.sheet}>
        <View style={s.handle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Status badge */}
          <View style={s.statusBadge}>
            <View style={s.statusBadgeDot} />
            <Text style={s.statusBadgeText}>En route vers vous</Text>
          </View>

          {/* Timeline */}
          <View style={s.timeline}>
            {stepOrder.map((step, idx) => {
              const state = idx < currentStepIdx ? 'done' : idx === currentStepIdx ? 'active' : 'todo'
              return (
                <View key={step} style={s.timelineStep}>
                  <View style={[s.timelineDot, state === 'done' && s.timelineDotDone, state === 'active' && s.timelineDotActive]}>
                    {state === 'done' && <Text style={s.timelineCheck}>✓</Text>}
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
                <View style={s.verifiedBadge}><Text style={s.verifiedText}>V</Text></View>
              </View>
              <View style={s.providerInfo}>
                <Text style={s.providerName}>{offer.providerName || 'Prestataire'}</Text>
                <View style={s.providerRow}>
                  <Text style={s.star}>★</Text>
                  <Text style={s.providerRating}>{offer.providerRating?.avg || 4.9}</Text>
                  <Text style={s.providerMeta}> · Électricien</Text>
                </View>
              </View>
              <View style={s.providerActions}>
                <TouchableOpacity style={s.actionIconBtn} onPress={() => offer.providerPhone && Linking.openURL(`tel:${offer.providerPhone}`)}>
                  <Text style={s.actionIconText}>T</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionIconBtn} onPress={() => router.push(`/mission-chat?id=${requestId}&providerName=${encodeURIComponent(offer.providerName || '')}`)}>
                  <Text style={s.actionIconText}>M</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ETA card */}
          <View style={s.etaCard}>
            <View style={[s.etaIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={[s.etaIconText, { color: colors.primary }]}>C</Text>
            </View>
            <View style={s.etaInfo}>
              <Text style={s.etaTitle}>Arrive dans {etaDisplay}</Text>
              <Text style={s.etaSub}>{loc?.address || 'À 1.2 km de chez vous'}</Text>
            </View>
          </View>

          {/* Details */}
          <View style={s.detailsCard}>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Référence</Text>
              <Text style={s.detailValue}>#{missionRef}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Prix convenu</Text>
              <Text style={s.detailValue}>{formatMoney(offer?.price)}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Service</Text>
              <Text style={s.detailValue}>{item?.category || 'Électricité'}</Text>
            </View>
          </View>

          <TouchableOpacity style={s.reportLink}>
            <Text style={s.reportLinkText}>Signaler un problème</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  mapContainer: { flex: 1, position: 'relative' },
  floatingHeader: { position: 'absolute', top: 16, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  floatingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  floatingBtnText: { fontSize: 18, color: colors.text, fontWeight: typography.weight.extrabold as any },
  floatingTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text },
  etaPill: { position: 'absolute', top: 72, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.lg, zIndex: 10 },
  etaPillDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  etaPillText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text },
  noMap: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { fontSize: 18, color: colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  noMapText: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: spacing.md, paddingHorizontal: spacing.lg, maxHeight: '60%', ...shadows.xl },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  statusBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.success, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86EFAC' },
  statusBadgeText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  timelineDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  timelineDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  timelineDotActive: { backgroundColor: colors.success, borderColor: colors.success },
  timelineCheck: { fontSize: 12, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  timelineLine: { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, backgroundColor: colors.border, zIndex: -1 },
  timelineLineDone: { backgroundColor: colors.success },
  timelineLabel: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: typography.weight.medium as any },
  timelineLabelActive: { color: colors.text, fontWeight: typography.weight.extrabold as any },
  providerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  providerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  providerAvatarText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  verifiedText: { fontSize: 10, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  star: { fontSize: 12, color: colors.warning },
  providerRating: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  providerMeta: { fontSize: 13, color: colors.textSecondary },
  providerActions: { flexDirection: 'row', gap: spacing.sm },
  actionIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 14, color: colors.success, fontWeight: typography.weight.extrabold as any },
  etaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  etaIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  etaIconText: { fontSize: 16, fontWeight: typography.weight.extrabold as any },
  etaInfo: { flex: 1 },
  etaTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  etaSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  detailsCard: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.textSecondary },
  detailValue: { fontSize: 14, color: colors.text, fontWeight: typography.weight.extrabold as any },
  reportLink: { alignItems: 'center', paddingVertical: spacing.md },
  reportLinkText: { fontSize: 14, color: colors.textSecondary, fontWeight: typography.weight.semibold as any, textDecorationLine: 'underline' },
})

export default withScreenBoundary(MissionDetail, 'MissionDetail')
