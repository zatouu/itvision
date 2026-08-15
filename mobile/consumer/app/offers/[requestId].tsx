import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, Pencil, XCircle, CheckCircle, Clock } from 'lucide-react-native'
import AppHeader from '../../src/components/AppHeader'
import { colors, spacing, radius, shadows, typography, getCategoryMeta } from '../../src/design'
import { apiGet, apiPost, apiPatch } from '../../src/api'
import { confirm } from '../../src/confirm'
import { toast } from '../../src/toast'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { cacheSet, cacheGet, cacheClear } from '../../src/storage'
import { hapticLight } from '../../src/haptics'

import RequestSummaryCard from '../../src/components/offers/RequestSummaryCard'
import LiveStatusBar from '../../src/components/offers/LiveStatusBar'
import SortingPillsRow, { SortKey } from '../../src/components/offers/SortingPillsRow'
import OfferCard, { Offer } from '../../src/components/offers/OfferCard'
import RadarPulseIllustration, { RadarViewer } from '../../src/components/offers/RadarPulseIllustration'
import VerticalTimeline from '../../src/components/offers/VerticalTimeline'
import EstimatedTimeCard from '../../src/components/offers/EstimatedTimeCard'
import TipCard from '../../src/components/offers/TipCard'
import NegotiateSheet from '../../src/components/offers/NegotiateSheet'

export default function OffersReceived() {
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
  const transitionAnim = useRef(false)

  const cacheKey = `offers-${requestId}`

  const load = useCallback(async (silent = false) => {
    if (!requestId) return
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
      if (!silent) toast.error(t('common.error'), e?.message || t('offers.loadError'))
    } finally {
      setLoading(false)
    }
  }, [requestId, t, cacheKey])

  useEffect(() => { load() }, [load])

  // Fetch live viewers (providers currently consulting this request)
  useEffect(() => {
    if (!requestId) return
    let active = true
    const fetchLive = async () => {
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
    fetchLive()
    const interval = setInterval(fetchLive, 15000)
    return () => { active = false; clearInterval(interval) }
  }, [requestId])

  // Socket: listen for new offers, viewers updates
  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    joinRequestRoom(requestId)

    const handleConnect = () => {
      joinRequestRoom(requestId)
      load(true)
    }
    const handleDisconnect = () => {}
    const handleOfferNew = () => { load(true) }
    const handleViewers = (data: any) => {
      if (data?.requestId === requestId && typeof data.count === 'number') {
        setViewersCount(data.count)
      }
    }
    const handleAssigned = () => { load(true) }
    const handleOfferUpdated = () => { load(true) }
    const handleCounterAccepted = () => { load(true) }
    const handleCounterRejected = () => { load(true) }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('offer:new', handleOfferNew)
    socket.on('request:viewers_updated', handleViewers)
    socket.on('request:assigned', handleAssigned)
    socket.on('offer:updated', handleOfferUpdated)
    socket.on('offer:counter-accepted', handleCounterAccepted)
    socket.on('offer:counter-rejected', handleCounterRejected)

    // Fallback: auto-refresh when WS disconnected
    const interval = setInterval(() => {
      if (!socket.connected && AppState.currentState === 'active') load(true)
    }, 30000)

    return () => {
      clearInterval(interval)
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
  }, [requestId, load])

  // Redirect to mission if already assigned
  useEffect(() => {
    if (request && ['assigned', 'provider_arriving', 'in_progress'].includes(request.status)) {
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
      toast.error(t('common.error'), e?.message || t('clientOffers.acceptError'))
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
      const msg = e?.message || ''
      if (msg.includes('déjà') || msg.includes('Statut déjà')) {
        toast.info(t('clientOffers.alreadyCancelled') || 'Demande déjà annulée')
        load(true)
      } else {
        toast.error(t('common.error'), msg || t('clientOffers.cancelError'))
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

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader
        title={t('clientOffers.title')}
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

          {/* Live Status Bar — hidden for terminal states */}
          {!isTerminal && (
            <View style={s.liveBarWrap}>
              <LiveStatusBar
                viewersCount={viewersCount || (offers.length > 0 ? 3 : 1)}
                expiresAt={expiresAt}
                compact={isEmpty}
              />
            </View>
          )}

          {hasOffers && (
            <>
              {/* Sorting Pills */}
              {showFilters && <SortingPillsRow active={sort} onChange={setSort} />}

              {/* Offers count */}
              <Text style={s.offersCount}>
                {t('clientOffers.offersReceived', { count: offers.length })}
              </Text>

              {/* Offer Cards */}
              <View style={s.offersList}>
                {sortedOffers.map((offer, idx) => (
                  <OfferCard
                    key={offer._id}
                    offer={offer}
                    isBest={idx === 0 && sort === 'recommended'}
                    budget={request?.budget}
                    onChoose={acceptOffer}
                    onNegotiate={negotiateOffer}
                    disabled={accepting === offer._id || isTerminal}
                    hasAcceptedOffer={hasAcceptedOffer}
                  />
                ))}
              </View>
            </>
          )}

          {isTerminal && (
            <View style={s.terminalSection}>
              {isCancelled && <XCircle size={48} color={colors.danger} />}
              {isExpired && <Clock size={48} color={colors.textMuted} />}
              {isCompleted && <CheckCircle size={48} color={colors.success} />}
              <Text style={s.terminalTitle}>
                {isCancelled ? (t('clientOffers.cancelledTitle') || 'Demande annulée')
                  : isExpired ? (t('clientOffers.expiredTitle') || 'Demande expirée')
                  : (t('clientOffers.completedTitle') || 'Demande terminée')}
              </Text>
              <Text style={s.terminalSubtitle}>
                {isCancelled ? (t('clientOffers.cancelledMsg') || 'Cette demande a été annulée. Les prestataires ne peuvent plus y répondre.')
                  : isExpired ? (t('clientOffers.expiredMsg') || 'Cette demande a expiré. Aucun prestataire n\'a répondu à temps.')
                  : (t('clientOffers.completedMsg') || 'Cette demande a été complétée.')}
              </Text>
              {offers.length > 0 && (
                <Text style={s.terminalOffersCount}>
                  {t('clientOffers.offersReceived', { count: offers.length })}
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
  liveBarWrap: { marginTop: spacing.md, alignItems: 'center' },
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
