import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, AppState, Modal, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, Pencil, XCircle, CheckCircle, Clock, Search, MapPin, X } from 'lucide-react-native'
import AppHeader from '../../src/components/AppHeader'
import { colors, spacing, radius, shadows, typography, getCategoryMeta } from '../../src/design'
import { apiGet, apiPost, apiPatch } from '../../src/api'
import { confirm } from '../../src/confirm'
import { toast } from '../../src/toast'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { cacheSet, cacheGet, cacheClear } from '../../src/storage'
import { hapticLight } from '../../src/haptics'
import { humanErrorMessage } from '../../src/errorMessages'

import RequestSummaryCard from '../../src/components/offers/RequestSummaryCard'
import SortingPillsRow, { SortKey } from '../../src/components/offers/SortingPillsRow'
import OfferCard, { Offer } from '../../src/components/offers/OfferCard'
import RadarPulseIllustration, { RadarViewer } from '../../src/components/offers/RadarPulseIllustration'
import VerticalTimeline from '../../src/components/offers/VerticalTimeline'
import EstimatedTimeCard from '../../src/components/offers/EstimatedTimeCard'
import TipCard from '../../src/components/offers/TipCard'
import NegotiateSheet from '../../src/components/offers/NegotiateSheet'
import RequestOffersMap from '../../src/components/RequestOffersMap'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'

/** Anneaux radar animés (strip navy « recherche en cours »). */
function RadarPulse() {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [anim])
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.7] })
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
  return (
    <View style={s.radarWrap}>
      <Animated.View style={[s.radarRing, { transform: [{ scale }], opacity }]} />
      <View style={s.radarCore}>
        <Search size={12} color="#fff" />
      </View>
    </View>
  )
}

function OffersReceived() {
  const { t } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const [request, setRequest] = useState<any>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [accepting, setAccepting] = useState<string | null>(null)
  const [viewersCount, setViewersCount] = useState(0)
  const [liveViewers, setLiveViewers] = useState<RadarViewer[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [negotiateTarget, setNegotiateTarget] = useState<Offer | null>(null)
  const [showMap, setShowMap] = useState(false)
  const transitionAnim = useRef(false)
  const loadInFlight = useRef(false)
  const lastReloadAt = useRef(0)

  const cacheKey = `offers-${requestId}`

  const load = useCallback(async (silent = false) => {
    if (!requestId) return
    if (loadInFlight.current) return
    loadInFlight.current = true
    if (!silent) setLoading(true)
    try {
      // Try cache first
      const cached = await cacheGet<{ request: any; offers: Offer[] }>(cacheKey, 2 * 60 * 1000)
      if (cached && !silent) {
        setRequest(cached.request)
        setOffers(cached.offers)
        setLoading(false)
      }
      const data: any = await apiGet(`/api/services/requests/${requestId}/offers`)
      setRequest(data.request || null)
      setOffers(Array.isArray(data.offers) ? data.offers : [])
      await cacheSet(cacheKey, { request: data.request, offers: data.offers }, 2 * 60 * 1000)
    } catch (e: any) {
      if (!silent) toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
      loadInFlight.current = false
    }
  }, [requestId, t, cacheKey])

  // Throttled reload for socket events: min 5s between calls
  const throttledReload = useCallback(() => {
    const now = Date.now()
    if (now - lastReloadAt.current < 5000) return
    lastReloadAt.current = now
    load(true)
  }, [load])

  useEffect(() => { load() }, [load])

  // Fetch live viewers (providers currently consulting this request)
  // Only polls when app is active — pauses in background to prevent freeze
  useEffect(() => {
    if (!requestId) return
    let active = true
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchLive = async () => {
      if (!active || AppState.currentState !== 'active') return
      try {
        const data: any = await apiGet(`/api/services/requests/${requestId}/live`)
        if (!active) return
        const viewers = (data.viewers || []).map((v: any) => ({
          providerId: v.providerId,
          name: v.name,
          avatarUrl: v.avatarUrl,
          distanceKm: v.distanceKm,
          etaMinutes: v.etaMinutes,
        }))
        setLiveViewers(viewers)
        setViewersCount(viewers.length)
      } catch {}
    }

    const startPolling = () => {
      if (interval) return
      fetchLive()
      interval = setInterval(fetchLive, 15000)
    }
    const stopPolling = () => {
      if (interval) { clearInterval(interval); interval = null }
    }

    const handleAppState = (state: string) => {
      if (state === 'active') startPolling()
      else stopPolling()
    }

    startPolling()
    const sub = AppState.addEventListener('change', handleAppState)

    return () => {
      active = false
      stopPolling()
      sub.remove()
    }
  }, [requestId])

  // Socket: listen for new offers, viewers updates
  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    joinRequestRoom(requestId)

    const handleConnect = () => {
      joinRequestRoom(requestId)
      throttledReload()
    }
    const handleDisconnect = () => {}
    const handleOfferNew = () => { throttledReload() }
    const handleViewers = (data: any) => {
      if (data?.requestId === requestId && typeof data.count === 'number') {
        setViewersCount(data.count)
      }
    }
    const handleAssigned = () => { throttledReload() }
    const handleOfferUpdated = () => { throttledReload() }
    const handleCounterAccepted = () => { throttledReload() }
    const handleCounterRejected = () => { throttledReload() }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('offer:new', handleOfferNew)
    socket.on('request:viewers_updated', handleViewers)
    socket.on('request:assigned', handleAssigned)
    socket.on('offer:updated', handleOfferUpdated)
    socket.on('offer:counter-accepted', handleCounterAccepted)
    socket.on('offer:counter-rejected', handleCounterRejected)

    // Fallback: auto-refresh when WS disconnected (paused in background)
    let fallbackInterval: ReturnType<typeof setInterval> | null = null
    const startFallback = () => {
      if (fallbackInterval) return
      fallbackInterval = setInterval(() => {
        if (!socket.connected && AppState.currentState === 'active') throttledReload()
      }, 30000)
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
      stopFallback()
      sub2.remove()
      leaveRequestRoom(requestId)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('offer:new', handleOfferNew)
      socket.off('request:viewers_updated', handleViewers)
      socket.off('request:assigned', handleAssigned)
      socket.off('offer:updated', handleOfferUpdated)
      socket.off('offer:counter-accepted', handleCounterAccepted)
      socket.off('offer:counter-rejected', handleCounterRejected)
    }
  }, [requestId, throttledReload])

  // Redirect to mission if already assigned
  useEffect(() => {
    if (request && ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute', 'completed'].includes(request.status)) {
      router.replace(`/mission/${requestId}`)
    }
  }, [request, requestId])

  const sortedOffers = useMemo(() => {
    const list = [...offers]
    list.sort((a, b) => {
      if (sort === 'cheapest') return a.price - b.price
      if (sort === 'fastest') return (a.etaMinutes || 0) - (b.etaMinutes || 0)
      if (sort === 'bestRated') return (b.providerRating?.avg || 0) - (a.providerRating?.avg || 0)
      if (sort === 'nearest') return (a.distanceKm || 99) - (b.distanceKm || 99)
      // recommended = combined score price/ETA/rating
      const scoreA = (a.providerRating?.avg || 0) * 10 - (a.price / 1000) - (a.etaMinutes || 0) * 0.5
      const scoreB = (b.providerRating?.avg || 0) * 10 - (b.price / 1000) - (b.etaMinutes || 0) * 0.5
      return scoreB - scoreA
    })
    return list
  }, [offers, sort])

  const acceptOffer = async (offer: Offer) => {
    const ok = await confirm(
      t('clientOffers.confirmTitle'),
      t('clientOffers.confirmMsg', { price: offer.price.toLocaleString('fr-FR') })
    )
    if (!ok) return
    setAccepting(offer._id)
    try {
      hapticLight()
      router.push(`/payment?offerId=${offer._id}&amount=${offer.price}&requestId=${requestId}`)
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setAccepting(null)
    }
  }

  const negotiateOffer = (offer: Offer) => {
    setNegotiateTarget(offer)
  }

  const cancelRequest = async () => {
    const ok = await confirm(
      t('clientOffers.cancelConfirmTitle'),
      t('clientOffers.cancelConfirmMsg')
    )
    if (!ok) return
    try {
      await apiPatch(`/api/services/requests/${requestId}`, { status: 'cancelled' })
      await cacheClear(cacheKey)
      await cacheClear('my-requests')
      await cacheClear('home-requests')
      toast.success(t('clientOffers.cancelSuccess'))
      router.back()
    } catch (e: any) {
      const code = e?.code || ''
      if (code === 'ALREADY_CANCELLED' || code === 'ALREADY_COMPLETED' || code === 'ALREADY_EXPIRED') {
        toast.info('Demande déjà clôturée')
        load(true)
      } else {
        toast.error(t('common.error'), humanErrorMessage(e))
      }
    }
  }

  // Compute published minutes ago
  const publishedMinutesAgo = useMemo(() => {
    if (!request?.createdAt) return undefined
    return Math.max(1, Math.round((Date.now() - new Date(request.createdAt).getTime()) / 60000))
  }, [request?.createdAt])

  // Voice message from request media
  const voiceMedia = useMemo(() => {
    return request?.media?.find((m: any) => m.type === 'audio') || null
  }, [request?.media])

  // Expires at for countdown
  const expiresAt = request?.validUntil || request?.expiresAt || undefined

  const hasAcceptedOffer = offers.some(o => o.status === 'accepted')

  const isCancelled = request?.status === 'cancelled'
  const isExpired = request?.status === 'expired'
  const isCompleted = request?.status === 'completed'
  const isTerminal = isCancelled || isExpired || isCompleted

  const isEmpty = !loading && offers.length === 0 && !isTerminal
  const hasOffers = !loading && offers.length > 0
  const requestRef = `#${(requestId || '').slice(-6).toUpperCase()}`
  const catLabel = request ? getCategoryMeta(request.category).label : ''
  const cheapestPrice = offers.length ? Math.min(...offers.map(o => o.price)) : Infinity
  const expiresInMin = expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000)) : null
  const reqLat = request?.location?.lat ?? request?.location?.coordinates?.[1]
  const reqLng = request?.location?.lng ?? request?.location?.coordinates?.[0]

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader
        title={t('clientOffers.title')}
        subtitle={`${t('clientOffers.requestRef', { ref: requestRef })}${catLabel ? ` · ${catLabel}` : ''}`}
        onBack={() => router.back()}
        right={
          <TouchableOpacity style={s.filterBtn} activeOpacity={0.8} onPress={() => setShowFilters(v => !v)}>
            <SlidersHorizontal size={20} color={showFilters ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {/* Request Summary Card */}
          {request && (
            <RequestSummaryCard
              title={request.title || getCategoryMeta(request.category).label}
              category={request.category || ''}
              location={request.location?.address || request.address || ''}
              publishedMinutesAgo={publishedMinutesAgo}
              budget={request.budget}
              voiceUri={voiceMedia?.url || voiceMedia?.uri}
              voiceDuration={voiceMedia?.durationSeconds || 23}
            />
          )}

          {/* Radar strip navy — recherche en cours (masqué une fois la demande close) */}
          {!isTerminal && !isEmpty && (
            <View style={s.radarStrip}>
              <RadarPulse />
              <View style={s.radarTexts}>
                <Text style={s.radarTitle}>
                  <Text style={{ color: colors.primaryLight }}>
                    {t('clientOffers.offersReceived', { count: offers.length })}
                  </Text>
                  {` · ${t('clientOffers.searchOngoing')}`}
                </Text>
                <Text style={s.radarSub}>
                  {t('clientOffers.providersViewing', { count: Math.max(viewersCount, 0) })}
                  {expiresInMin != null && expiresInMin > 0 ? ` · ${t('clientOffers.remainingTime', { minutes: expiresInMin })}` : ''}
                </Text>
              </View>
              <TouchableOpacity style={s.radarMapBtn} onPress={() => setShowMap(true)} activeOpacity={0.8}>
                <Text style={s.radarMapBtnText}>{t('clientOffers.seeMap')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {hasOffers && (
            <>
              {/* Sorting Pills */}
              {showFilters && <SortingPillsRow active={sort} onChange={setSort} />}

              {/* Offer Cards */}
              <View style={s.offersList}>
                {sortedOffers.map((offer, idx) => (
                  <OfferCard
                    key={offer._id}
                    offer={offer}
                    isBest={idx === 0 && sort === 'recommended'}
                    isCheapest={offer.price === cheapestPrice}
                    budget={request?.budget}
                    scheduledFor={request?.scheduledFor}
                    onChoose={acceptOffer}
                    onNegotiate={negotiateOffer}
                    disabled={accepting === offer._id || isTerminal}
                    hasAcceptedOffer={hasAcceptedOffer}
                  />
                ))}

                {/* Slot en pointillés — offres en préparation */}
                {!isTerminal && (
                  <View style={s.pendingSlot}>
                    <View style={s.pendingDotsWrap}>
                      <View style={s.pendingDot} />
                      <View style={s.pendingDot} />
                      <View style={s.pendingDot} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pendingSlotTitle}>
                        {viewersCount > 0
                          ? t('clientOffers.providersPreparing', { count: viewersCount })
                          : t('clientOffers.moreOffersComing')}
                      </Text>
                      <Text style={s.pendingSlotSub}>{t('clientOffers.offersArriveSoon')}</Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}

          {isTerminal && (
            <View style={s.terminalSection}>
              {isCancelled && <XCircle size={48} color={colors.danger} />}
              {isExpired && <Clock size={48} color={colors.textMuted} />}
              {isCompleted && <CheckCircle size={48} color={colors.success} />}
              <Text style={s.terminalTitle}>
                {isCancelled ? 'Demande annulée'
                  : isExpired ? 'Demande expirée'
                  : 'Mission terminée'}
              </Text>
              <Text style={s.terminalSubtitle}>
                {isCancelled ? 'Cette demande n\'est plus active. Les informations disponibles restent consultables.'
                  : isExpired ? 'Le délai prévu pour cette demande est terminé.'
                  : 'Cette demande a été finalisée. Vous pouvez consulter son historique.'}
              </Text>
              {offers.length > 0 && (
                <Text style={s.terminalOffersCount}>
                  {offers.length} offre{offers.length > 1 ? 's' : ''} reçue{offers.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {isEmpty && (
            <>
              {/* Radar pulse hero */}
              <View style={s.heroSection}>
                <RadarPulseIllustration viewers={liveViewers} />
                <Text style={s.heroTitle}>{t('clientOffers.searching')}</Text>
                <Text style={s.heroSubtitle}>
                  {t('clientOffers.emptySubtitle', {
                    category: request ? getCategoryMeta(request.category).label.toLowerCase() : 'prestataires',
                  })}
                </Text>
              </View>

              {/* How it works timeline */}
              <View style={s.timelineCard}>
                <VerticalTimeline
                  steps={[
                    {
                      key: 'published',
                      label: t('clientOffers.stepPublished'),
                      status: 'done',
                      statusText: t('clientOffers.stepPublishedTime', { minutes: publishedMinutesAgo || 1 }),
                    },
                    {
                      key: 'searching',
                      label: t('clientOffers.stepSearching'),
                      status: 'active',
                      statusText: t('clientOffers.stepSearchingStatus'),
                    },
                    {
                      key: 'choose',
                      label: t('clientOffers.stepChoose'),
                      status: 'pending',
                      statusText: t('clientOffers.stepChooseStatus'),
                    },
                  ]}
                />
              </View>

              {/* Estimated time */}
              <EstimatedTimeCard />

              {/* Tip */}
              <View style={s.tipWrap}>
                <TipCard />
              </View>

              {/* Action buttons */}
              <View style={s.emptyActions}>
                <TouchableOpacity
                  style={s.editBtn}
                  onPress={() => router.push(`/create-request?editId=${requestId}`)}
                  activeOpacity={0.85}
                >
                  <Pencil size={16} color={colors.primary} />
                  <Text style={s.editBtnText}>{t('clientOffers.editRequest')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelRequest} activeOpacity={0.7}>
                  <Text style={s.cancelLink}>{t('clientOffers.cancelRequest')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Carte temps réel des prestataires qui consultent la demande */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={s.mapModal}>
          <View style={s.mapHeader}>
            <MapPin size={16} color={colors.text} />
            <Text style={s.mapHeaderText}>{t('clientOffers.seeMap')}</Text>
            <TouchableOpacity style={s.mapCloseBtn} onPress={() => setShowMap(false)} activeOpacity={0.8}>
              <X size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <RequestOffersMap
            requestId={requestId || ''}
            requestLat={reqLat != null ? Number(reqLat) : undefined}
            requestLng={reqLng != null ? Number(reqLng) : undefined}
            wsConnected
            requestDone={isTerminal}
          />
        </SafeAreaView>
      </Modal>

      {/* Negotiate bottom sheet */}
      <NegotiateSheet
        visible={!!negotiateTarget}
        onClose={() => setNegotiateTarget(null)}
        offerId={negotiateTarget?._id || ''}
        offerPrice={negotiateTarget?.price || 0}
        providerName={negotiateTarget?.providerName}
        onSent={() => load(true)}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 60 },
  // Strip radar navy — « N offres reçues · recherche en cours »
  radarStrip: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: 2,
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.md,
  },
  radarWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  radarRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  radarCore: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarTexts: { flex: 1, minWidth: 0 },
  radarTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  radarSub: { fontSize: 11.5, color: '#B6C4D8', marginTop: 1 },
  radarMapBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  radarMapBtnText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: '#fff' },
  pendingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pendingDotsWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.bgDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  pendingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textDim },
  pendingSlotTitle: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.ink },
  pendingSlotSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  mapModal: { flex: 1, backgroundColor: colors.bg },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  mapHeaderText: { flex: 1, fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  mapCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersCount: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium as any,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  offersList: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  heroTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  heroSubtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
    lineHeight: 20,
  },
  timelineCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  tipWrap: { marginTop: spacing.md },
  emptyActions: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  editBtnText: {
    fontSize: typography.base.fontSize,
    color: colors.primary,
    fontWeight: typography.weight.semibold as any,
  },
  cancelLink: {
    fontSize: typography.sm.fontSize,
    color: colors.danger,
    fontWeight: typography.weight.medium as any,
  },
  terminalSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxl + spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  terminalTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    textAlign: 'center',
  },
  terminalSubtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  terminalOffersCount: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
})

export default withScreenBoundary(OffersReceived, 'OffersReceived')

