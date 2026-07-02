import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking, Animated, Platform } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LiveRouteMap } from '../../src/components/LiveRouteMap'
import * as Location from 'expo-location'
import { apiGet, apiPatchQueued, getBaseUrl } from '../../src/api'
import { connectSocket, emitProviderLocation, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { confirm, notify } from '../../src/confirm'
import { useTranslation } from 'react-i18next'
import i18n from '../../src/i18n'

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
  if (mediaType === 'video') return 'Vidéo'
  if (mediaType === 'image') return 'Image'
  return 'Fichier'
}

function hasValidCoords(location: any): location is { coordinates: [number, number]; address?: string } {
  return (
    Array.isArray(location?.coordinates)
    && location.coordinates.length === 2
    && Number.isFinite(Number(location.coordinates[0]))
    && Number.isFinite(Number(location.coordinates[1]))
  )
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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; heading?: number | null } | null>(null)

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
    if (!requestId || !['provider_arriving', 'in_progress'].includes(item?.status || '')) return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const publishLocation = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync()
        if (perm.status !== 'granted' || cancelled) return
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (cancelled) return
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        }
        setCurrentLocation(location)
        emitProviderLocation(requestId, location)
      } catch {}
    }

    publishLocation()
    timer = setInterval(publishLocation, 5000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [requestId, item?.status])

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
    doUpdateStatus('provider_arriving')
  }

  const handleStart = async () => {
    const ok = await confirm(t('mission.startTitle'), t('mission.startMsg'))
    if (!ok) return
    doUpdateStatus('in_progress')
  }

  const handleComplete = async () => {
    const ok = await confirm(t('mission.completeTitle'), t('mission.completeMsg'))
    if (!ok) return
    doUpdateStatus('completed')
  }

  if (loading && !item) return (
    <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color="#0F172A" /></SafeAreaView>
  )

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centerBlock}>
        <Text style={s.err}>{t('mission.invalid')}</Text>
      </View>
    </SafeAreaView>
  )

  if (err && !item) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centerBlock}>
        <Text style={s.err}>{err}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => load(true)}>
          <Text style={s.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  if (!item) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centerBlock}>
        <ActivityIndicator color="#0F172A" />
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
  const locationAddress = typeof item?.location?.address === 'string' ? item.location.address : undefined
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : t('mission.notProvided')

  const heroSubtitle = (() => {
    if (item.status === 'cancelled') return t('mission.cancelledSub') || ''
    if (item.status === 'completed') return t('mission.completedSub') || ''
    if (item.status === 'in_progress') return t('mission.inProgressSub') || ''
    if (item.status === 'provider_arriving') return t('mission.arrivingSub') || ''
    return t('mission.assignedSub') || ''
  })()

  const elapsed = item.status === 'in_progress' && item.startedAt
    ? `${t('mission.elapsedLabel')} ${formatElapsed(item.startedAt)}`
    : item.status === 'completed' && item.startedAt && item.completedAt
    ? `${t('mission.totalDurationLabel')} ${formatElapsed(item.startedAt, item.completedAt)}`
    : null

  const statusMini = (st ? t(st.key) : '').replace(/^./, c => c.toUpperCase())

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('mission.activeTitle')}</Text>
          <Text style={s.headerRef}>#{missionRef}</Text>
        </View>
        <View style={[s.headerStatus, { backgroundColor: st?.bg || '#F1F5F9' }]}>
          <View style={[s.headerDot, { backgroundColor: st?.color || '#94A3B8' }]} />
          <Text style={[s.headerStatusText, { color: st?.color || '#64748B' }]}>{statusMini}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#F59E0B" />}
      >
        {err && <Text style={s.err}>{err}</Text>}

        {item && (
          <>
            {/* Hero statut */}
            <View style={[s.heroCard, { backgroundColor: st?.bg || '#F1F5F9' }]}>
              <View style={s.heroTop}>
                <View style={[s.heroIcon, { backgroundColor: st?.color || '#64748B' }]}>
                  <Text style={s.heroIconText}>M</Text>
                </View>
                <View style={s.heroInfo}>
                  <Text style={[s.heroStatus, { color: st?.color || '#0F172A' }]}>{st ? t(st.key) : ''}</Text>
                  {heroSubtitle ? <Text style={s.heroSub}>{heroSubtitle}</Text> : null}
                </View>
              </View>
              {elapsed && (
                <View style={s.heroTime}>
                  <Text style={s.heroTimeText}>{elapsed}</Text>
                </View>
              )}
              {item.payment && PAYMENT_BADGE[item.payment.status] && (
                <View style={[s.heroPayment, { backgroundColor: PAYMENT_BADGE[item.payment.status].bg }]}>
                  <Text style={[s.heroPaymentText, { color: PAYMENT_BADGE[item.payment.status].color }]}>
                    {t(PAYMENT_BADGE[item.payment.status].key)}
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline horizontale */}
            {item.status !== 'cancelled' && (
              <View style={s.timelineCard}>
                <View style={s.timelineTrack}>
                  {FLOW_STEPS.map((step, idx) => {
                    const state = getStepState(item.status, step.key)
                    const isLast = idx === FLOW_STEPS.length - 1
                    return (
                      <View key={step.key} style={s.timelineStep}>
                        <View style={s.timelineStepTop}>
                          <View style={[
                            s.timelineCircle,
                            state === 'done' && s.timelineCircleDone,
                            state === 'active' && s.timelineCircleActive,
                          ]}>
                            {state === 'done' && <Text style={s.timelineCheck}>✓</Text>}
                            {state === 'active' && <View style={s.timelinePulse} />}
                          </View>
                          {!isLast && (
                            <View style={[
                              s.timelineConnector,
                              state === 'done' && s.timelineConnectorDone,
                            ]} />
                          )}
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

            {/* Détails */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('mission.detailsTitle')}</Text>
              <View style={s.detailRow}>
                <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>#</Text></View>
                <Text style={s.detailLabel}>{t('mission.reference')}</Text>
                <Text style={s.detailValue}>#{missionRef}</Text>
              </View>
              <View style={s.detailRow}>
                <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>C</Text></View>
                <Text style={s.detailLabel}>{t('mission.category')}</Text>
                <Text style={s.detailValue}>{item.category || t('mission.notProvided')}</Text>
              </View>
              <View style={s.detailRow}>
                <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>B</Text></View>
                <Text style={s.detailLabel}>{t('mission.clientBudget')}</Text>
                <Text style={s.detailValue}>{formatMoney(item.budget)}</Text>
              </View>
              <View style={s.detailRow}>
                <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>D</Text></View>
                <Text style={s.detailLabel}>{t('mission.createdAt')}</Text>
                <Text style={s.detailValue}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <View style={s.detailRow}>
                <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>O</Text></View>
                <Text style={s.detailLabel}>{t('mission.yourOffer')}</Text>
                <Text style={s.detailValue}>{offer ? `${formatMoney(offer.price)} · ${t('mission.eta')} ${etaLabel}` : t('mission.notAvailable')}</Text>
              </View>
            </View>

            {/* Client / Demande */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('mission.request')}</Text>
              <Text style={s.descText}>{item.description || t('mission.noDescription')}</Text>
              {item.budget ? <Text style={s.meta}>{t('mission.estimatedBudget', { budget: item.budget.toLocaleString() })}</Text> : null}
            </View>

            {/* Médias */}
            {item.media && item.media.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.clientMedia')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {item.media.map((m: any, i: number) => {
                      const mediaUrl = resolveMediaUrl(m?.url)
                      const asImage = mediaUrl && isImageMedia(m?.type, mediaUrl)
                      return asImage
                        ? (
                            <Image key={i} source={{ uri: mediaUrl }} style={s.mediaThumb} />
                          )
                        : (
                            <TouchableOpacity key={i} style={s.mediaFile} onPress={() => openMedia(m?.url)}>
                              <Text style={s.mediaFileType}>{getMediaLabel(m?.type)}</Text>
                              <Text style={s.mediaFileText} numberOfLines={2}>{m?.title || t('mission.openMedia')}</Text>
                            </TouchableOpacity>
                          )
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Carte */}
            {hasCoords && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.tracking')}</Text>
                <View style={s.mapBox}>
                  <LiveRouteMap
                    destination={{ lat, lng }}
                    destinationLabel={locationAddress}
                    providerLocation={currentLocation || undefined}
                    status={item.status}
                  />
                </View>
              </View>
            )}

            {/* Chat */}
            {['assigned', 'provider_arriving', 'in_progress'].includes(item.status) && (
              <TouchableOpacity
                style={s.chatBtn}
                onPress={() => router.push(`/mission-chat?id=${requestId}`)}
              >
                <Text style={s.chatBtnText}>{t('mission.contactClient')}</Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={s.actions}>
              {item.status === 'assigned' && (
                <TouchableOpacity style={[s.actionBtn, s.arrivingAction]} onPress={handleArriving} disabled={updating}>
                  <Text style={s.arrivingActionText}>{t('mission.arrivingBtn')}</Text>
                </TouchableOpacity>
              )}
              {item.status === 'provider_arriving' && (
                <TouchableOpacity style={[s.actionBtn, s.startAction]} onPress={handleStart} disabled={updating}>
                  <Text style={s.startActionText}>{t('mission.startBtn')}</Text>
                </TouchableOpacity>
              )}
              {item.status === 'in_progress' && (
                <TouchableOpacity style={[s.actionBtn, s.completeAction]} onPress={handleComplete} disabled={updating}>
                  <Text style={s.completeActionText}>{t('mission.completeBtn')}</Text>
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
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#111827', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  headerRef: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatusText: { fontSize: 11, fontWeight: '800' },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 40, gap: 14 },
  err: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111827', borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700' },

  heroCard: { borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroIconText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroInfo: { flex: 1, gap: 2 },
  heroStatus: { fontSize: 18, fontWeight: '800' },
  heroSub: { fontSize: 13, color: '#475569', lineHeight: 18 },
  heroTime: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  heroTimeText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  heroPayment: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
  heroPaymentText: { fontSize: 12, fontWeight: '700' },

  timelineCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  timelineTrack: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineStepTop: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  timelineCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  timelineCircleDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  timelineCircleActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timelineCheck: { color: '#fff', fontSize: 14, fontWeight: '800' },
  timelinePulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  timelineConnector: { flex: 1, height: 3, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  timelineConnectorDone: { backgroundColor: '#16A34A' },
  timelineLabel: { fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'center', lineHeight: 14 },
  timelineLabelActive: { color: '#0F172A', fontWeight: '800' },
  timelineLabelDone: { color: '#15803D', fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  descText: { fontSize: 15, color: '#374151', lineHeight: 23 },
  meta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  detailIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  detailLabel: { flex: 1, fontSize: 14, color: '#64748B' },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },

  mediaThumb: { width: 110, height: 110, borderRadius: 14 },
  mediaFile: { width: 150, height: 110, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', padding: 12, justifyContent: 'center', gap: 6 },
  mediaFileType: { fontSize: 11, color: '#334155', fontWeight: '800', textTransform: 'uppercase' },
  mediaFileText: { fontSize: 12, color: '#475569', lineHeight: 17 },
  mapBox: { borderRadius: 16, overflow: 'hidden', height: 220 },

  chatBtn: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  chatBtnText: { color: '#1D4ED8', fontWeight: '800', fontSize: 15 },

  actions: { gap: 10, marginTop: 8 },
  actionBtn: { borderRadius: 16, padding: 17, alignItems: 'center' },
  arrivingAction: { backgroundColor: '#0F172A' },
  arrivingActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  startAction: { backgroundColor: '#0F172A' },
  startActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  completeAction: { backgroundColor: '#16A34A' },
  completeActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})

export default withScreenBoundary(ActiveMission, 'ActiveMission')
