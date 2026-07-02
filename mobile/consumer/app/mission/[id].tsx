import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Linking, Animated, Platform } from 'react-native'
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
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : t('mission.notProvided')

  const statusMini = (st ? t(st.key) : '').replace(/^./, c => c.toUpperCase())

  return (
    <SafeAreaView style={s.safe}>
      {/* Header transparent */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{t('mission.myMission')}</Text>
          <Text style={s.headerRef}>#{missionRef}</Text>
        </View>
        <View style={[s.headerStatus, { backgroundColor: st?.bg || '#F1F5F9' }]}>
          <View style={[s.headerDot, { backgroundColor: st?.color || '#94A3B8' }]} />
          <Text style={[s.headerStatusText, { color: st?.color || '#64748B' }]}>{statusMini}</Text>
        </View>
      </View>

      {err && <Text style={s.err}>{err}</Text>}

      {/* Carte en haut */}
      {hasCoords && (
        <View style={s.mapContainer}>
          <LiveRouteMap
            destination={{ lat, lng }}
            destinationLabel={loc?.address}
            providerLocation={providerLocation || undefined}
            status={item.status}
          />
          {/* ETA floating pill */}
          {item.status === 'provider_arriving' && (
            <View style={s.etaPill}>
              <Text style={s.etaPillText}>{t('mission.arriving')} • {etaLabel}</Text>
            </View>
          )}
        </View>
      )}

      {/* Bottom sheet */}
      <View style={s.bottomSheet}>
        <View style={s.bottomSheetHandle} />
        <ScrollView
          contentContainerStyle={s.sheetBody}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#F59E0B" />}
        >
          {item && (
            <>
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
                              {state === 'done' && <Text style={s.timelineCheck}>V</Text>}
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

              {/* ETA card */}
              {item.status === 'provider_arriving' && (
                <View style={s.etaCard}>
                  <View style={[s.etaIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Text style={[s.etaIconText, { color: '#16A34A' }]}>H</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.etaTitle}>{t('mission.arrivingIn', { min: etaLabel })}</Text>
                    <Text style={s.etaSub}>{loc?.address || t('mission.notProvided')}</Text>
                  </View>
                </View>
              )}

              {/* Provider */}
              {offer && (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Text style={s.cardTitle}>{t('mission.provider')}</Text>
                    {offer.providerRating ? (
                      <View style={s.ratingBadge}>
                        <Text style={s.ratingText}>N {offer.providerRating.avg} ({offer.providerRating.count})</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.providerRow}>
                    <View style={s.providerAvatar}>
                      <Text style={s.providerAvatarText}>{(offer.providerName || t('mission.defaultProvider')).slice(0, 2)}</Text>
                    </View>
                    <View style={s.providerInfo}>
                      <Text style={s.providerName}>{offer.providerName || t('mission.defaultProvider')}</Text>
                      <Text style={s.providerMeta}>{formatMoney(offer.price)} · {t('mission.eta')} {etaLabel}</Text>
                    </View>
                    {['assigned', 'provider_arriving', 'in_progress'].includes(item.status) && (
                      <View style={s.providerActions}>
                        <TouchableOpacity
                          style={s.phoneBtn}
                          onPress={() => offer.providerPhone && Linking.openURL(`tel:${offer.providerPhone}`)}
                        >
                          <Text style={s.phoneBtnText}>A</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.chatIconBtn}
                          onPress={() => router.push(`/mission-chat?id=${requestId}&providerName=${encodeURIComponent(offer.providerName || '')}`)}
                        >
                          <Text style={s.chatIconText}>M</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
                  <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>P</Text></View>
                  <Text style={s.detailLabel}>{t('mission.budget')}</Text>
                  <Text style={s.detailValue}>{formatMoney(item.budget)}</Text>
                </View>
                <View style={s.detailRow}>
                  <View style={[s.detailIcon, { backgroundColor: '#F1F5F9' }]}><Text style={s.detailIconText}>D</Text></View>
                  <Text style={s.detailLabel}>{t('mission.createdAt')}</Text>
                  <Text style={s.detailValue}>{formatDateTime(item.createdAt)}</Text>
                </View>
              </View>

              {/* Description */}
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('mission.description')}</Text>
                <Text style={s.descText}>{item.description || t('mission.noDescription')}</Text>
              </View>

              {/* Médias */}
              {item.media && item.media.length > 0 && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>{t('mission.media')}</Text>
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

              {/* Actions */}
              <View style={s.actions}>
                {item.status === 'assigned' && (
                  <TouchableOpacity style={[s.actionBtn, s.cancelAction]} onPress={handleCancel} disabled={updating}>
                    <Text style={s.cancelActionText}>{t('mission.cancelMission')}</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'in_progress' && (
                  <>
                    <TouchableOpacity style={[s.actionBtn, s.cancelAction]} onPress={handleCancel} disabled={updating}>
                      <Text style={s.cancelActionText}>{t('mission.cancelMission')}</Text>
                    </TouchableOpacity>
                    <Text style={s.infoText}>{t('mission.providerCloses')}</Text>
                  </>
                )}
                {item.status === 'completed' && !hasReview && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.rateAction]}
                    onPress={() => router.push(`/rate-mission?id=${requestId}&providerName=${encodeURIComponent(offer?.providerName || '')}`)}
                  >
                    <Text style={s.rateActionText}>{t('mission.rateMission')}</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'completed' && hasReview && (
                  <View style={s.doneBox}>
                    <Text style={s.doneText}>{t('mission.alreadyRated')}</Text>
                  </View>
                )}
                {['assigned', 'provider_arriving', 'in_progress'].includes(item.status) && (
                  <TouchableOpacity style={s.reportLink} onPress={() => router.push(`/mission-chat?id=${requestId}&providerName=${encodeURIComponent(offer?.providerName || '')}`)}>
                    <Text style={s.reportLinkText}>{t('mission.reportProblem')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  backIcon: { fontSize: 18, color: '#111827', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerRef: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2, textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  headerDot: { width: 7, height: 7, borderRadius: 4 },
  headerStatusText: { fontSize: 11, fontWeight: '800' },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 8, marginTop: 70 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111827', borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700' },

  mapContainer: { flex: 1, marginTop: -20, backgroundColor: '#E2E8F0' },
  etaPill: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  etaPillText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  bottomSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#0F172A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 12 },
  bottomSheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10 },
  sheetBody: { padding: 16, paddingBottom: 48, gap: 14 },

  etaCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  etaIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  etaIconText: { fontSize: 20, fontWeight: '800' },
  etaTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  etaSub: { fontSize: 13, color: '#64748B' },

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
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  descText: { fontSize: 15, color: '#374151', lineHeight: 23 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  detailIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailIconText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  detailLabel: { flex: 1, fontSize: 14, color: '#64748B' },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '700' },

  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  providerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  providerInfo: { flex: 1, gap: 3 },
  providerName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  providerMeta: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  providerActions: { flexDirection: 'row', gap: 8 },
  phoneBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBF7D0' },
  phoneBtnText: { fontSize: 16, color: '#16A34A', fontWeight: '700' },
  chatIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  chatIconText: { fontSize: 16, color: '#1D4ED8', fontWeight: '700' },
  ratingBadge: { backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FDE68A' },
  ratingText: { color: '#92400E', fontSize: 12, fontWeight: '800' },

  mediaThumb: { width: 110, height: 110, borderRadius: 14 },
  mediaFile: { width: 150, height: 110, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', padding: 12, justifyContent: 'center', gap: 6 },
  mediaFileType: { fontSize: 11, color: '#334155', fontWeight: '800', textTransform: 'uppercase' },
  mediaFileText: { fontSize: 12, color: '#475569', lineHeight: 17 },
  mapBox: { borderRadius: 16, overflow: 'hidden', height: 220 },

  actions: { gap: 10, marginTop: 8 },
  actionBtn: { borderRadius: 16, padding: 17, alignItems: 'center' },
  cancelAction: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FECACA' },
  cancelActionText: { color: '#B91C1C', fontWeight: '800', fontSize: 15 },
  rateAction: { backgroundColor: '#F59E0B' },
  rateActionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  infoText: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  doneBox: { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  doneText: { color: '#065F46', fontSize: 14, fontWeight: '700' },
  reportLink: { alignItems: 'center', paddingVertical: 8 },
  reportLinkText: { fontSize: 13, color: '#64748B', fontWeight: '700', textDecorationLine: 'underline' },
})

export default withScreenBoundary(MissionDetail, 'MissionDetail')
