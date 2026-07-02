import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPost } from '../src/api'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../src/socket'
import { fetchWithCache, cacheClear } from '../src/storage'
import { confirm } from '../src/confirm'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '../src/components/Skeleton'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const STATUS_OFFER: Record<string, { key: string; color: string; bg: string; dot: string }> = {
  submitted: { key: 'offers.status_submitted',  color: '#92400E', bg: '#FFFBEB', dot: '#D97706' },
  accepted:  { key: 'offers.status_accepted',   color: '#065F46', bg: '#ECFDF5', dot: '#16A34A' },
  rejected:  { key: 'offers.status_rejected',    color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  withdrawn: { key: 'offers.status_withdrawn',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  expired:   { key: 'offers.status_expired',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
}

function formatCountdown(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return ''
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

function RequestOffers() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [offers, setOffers] = useState<any[]>([])
  const [serviceRequest, setServiceRequest] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const cacheKey = id ? `offers-${id}` : ''

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return
    if (isRefresh) {
      setRefreshing(true)
      await cacheClear(cacheKey)
    } else {
      setLoading(true)
    }
    setErr(null)
    try {
      await fetchWithCache(
        cacheKey,
        () => apiGet(`/api/services/requests/${id}/offers`),
        (data, fromCache) => {
          setOffers(data.offers || [])
          setServiceRequest(data.request || null)
          if (!fromCache) {
            setLoading(false)
            setRefreshing(false)
          }
        },
        2 * 60 * 1000 // 2 min TTL pour les offres
      )
    } catch (e: any) {
      setErr(e.message)
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, cacheKey])

  useEffect(() => { load() }, [load])

  const [wsConnected, setWsConnected] = useState(false)
  const [now, setNow] = useState<number>(Date.now())
  const [filter, setFilter] = useState<'recommended' | 'cheapest' | 'fastest' | 'bestRated'>('recommended')
  // Contre-offre modal
  const [counterModal, setCounterModal] = useState(false)
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterComment, setCounterComment] = useState('')
  const [counterLoading, setCounterLoading] = useState(false)

  // Tick 1s pour countdown des offres (stop si demande terminée)
  const requestDone = serviceRequest && ['assigned','provider_arriving','in_progress','completed','cancelled','expired'].includes(serviceRequest.status)
  useEffect(() => {
    if (requestDone) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [requestDone])

  // WebSocket: rejoindre la room de la demande
  useEffect(() => {
    if (!id) return
    const socket = connectSocket()
    joinRequestRoom(id)
    setWsConnected(socket.connected)

    const handleConnect = () => {
      setWsConnected(true)
      joinRequestRoom(id) // s'assurer que la room est rejointe après reconnexion
    }
    const handleDisconnect = () => setWsConnected(false)
    const handleOfferNew = () => { load(true) }
    const handleAssigned = () => { load(true) }
    const handleCounterAccepted = () => { load(true) }
    const handleCounterRejected = () => { load(true) }
    const handleOfferUpdated = () => { load(true) }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('offer:new', handleOfferNew)
    socket.on('request:assigned', handleAssigned)
    socket.on('offer:counter-accepted', handleCounterAccepted)
    socket.on('offer:counter-rejected', handleCounterRejected)
    socket.on('offer:updated', handleOfferUpdated)

    // Fallback: auto-refresh toutes les 10s si WS déconnecté
    const interval = setInterval(() => {
      if (!socket.connected) load(true)
    }, 10000)

    return () => {
      clearInterval(interval)
      leaveRequestRoom(id)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('offer:new', handleOfferNew)
      socket.off('request:assigned', handleAssigned)
      socket.off('offer:counter-accepted', handleCounterAccepted)
      socket.off('offer:counter-rejected', handleCounterRejected)
      socket.off('offer:updated', handleOfferUpdated)
    }
  }, [id, load])

  const getInitials = (id: string) =>
    (id || '').slice(0, 2).toUpperCase() || 'XX'

  const sortedOffers = (() => {
    const list = [...offers]
    switch (filter) {
      case 'cheapest':
        return list.sort((a, b) => Number(a.price) - Number(b.price))
      case 'fastest':
        return list.sort((a, b) => Number(a.etaMinutes || Infinity) - Number(b.etaMinutes || Infinity))
      case 'bestRated':
        return list.sort((a, b) => (Number(b.providerRating?.avg) || 0) - (Number(a.providerRating?.avg) || 0))
      default:
        // Recommandé : équilibre prix/rating/eta
        return list.sort((a, b) => {
          const score = (o: any) => {
            const rating = Number(o.providerRating?.avg) || 0
            const price = Number(o.price) || Infinity
            const eta = Number(o.etaMinutes) || 60
            return rating * 10 - price / 5000 - eta / 5
          }
          return score(b) - score(a)
        })
    }
  })()

  const bestChoiceId = (() => {
    if (offers.length === 0) return null
    if (filter === 'cheapest') return sortedOffers[0]._id
    if (filter === 'fastest') return sortedOffers[0]._id
    if (filter === 'bestRated') return sortedOffers[0]._id
    return sortedOffers[0]._id
  })()

  const acceptOffer = async (offerId: string, price: number) => {
    const ok = await confirm(
      t('offers.confirmTitle'),
      t('offers.confirmMsg', { price: price.toLocaleString('fr-FR') })
    )
    if (!ok) return
    router.push(`/payment?offerId=${offerId}&amount=${price}&requestId=${id}`)
  }

  const openCounterModal = (offerId: string, currentPrice: number) => {
    setCounterOfferId(offerId)
    setCounterPrice(String(Math.round(currentPrice * 0.85)))
    setCounterComment('')
    setCounterModal(true)
  }

  const viewProfile = (offer: any) => {
    Alert.alert(
      offer.providerName || t('offers.providerProfile'),
      [offer.providerRating ? `${t('offers.rating')}: ${offer.providerRating.avg} (${offer.providerRating.count})` : t('offers.noRating'), offer.providerVerified ? t('offers.verifiedFull') : '', offer.comment || ''].filter(Boolean).join('\n'),
      [{ text: t('common.close') }]
    )
  }

  const sendCounterOffer = async () => {
    if (!counterOfferId || !counterPrice) return
    const price = Number(counterPrice.replace(/\s/g, ''))
    if (!price || price <= 0) {
      Alert.alert(t('offers.invalidPrice'), t('offers.invalidPriceMsg'))
      return
    }
    setCounterLoading(true)
    try {
      await apiPost(`/api/services/offers/${counterOfferId}/counter`, {
        price,
        comment: counterComment || undefined,
      })
      setCounterModal(false)
      setCounterOfferId(null)
      setCounterPrice('')
      setCounterComment('')
      Alert.alert(t('offers.counterSent'), t('offers.counterSentMsg'))
      load(true)
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('offers.counterError'))
    }
    setCounterLoading(false)
  }

  // Si la demande est déjà assignée, rediriger vers l'écran mission
  useEffect(() => {
    if (serviceRequest && ['assigned', 'provider_arriving', 'in_progress', 'completed'].includes(serviceRequest.status)) {
      router.replace(`/mission/${id}`)
    }
  }, [serviceRequest, id])

  const isAssigned = serviceRequest?.status === 'assigned' || serviceRequest?.status === 'in_progress'
  const { t, i18n } = useTranslation()
  const [catMap, setCatMap] = useState<Record<string, { abbr: string; color: string; label: string }>>({})
  useEffect(() => {
    loadCategories().then(cats => {
      const m: Record<string, { abbr: string; color: string; label: string }> = {}
      cats.forEach(c => { m[c.slug] = { abbr: c.abbr, color: c.color, label: getCategoryLabel(c, i18n.language) } })
      setCatMap(m)
    }).catch(() => {})
  }, [])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>{t('offers.title')}</Text>
          <Text style={s.subtitle}>{offers.length} {offers.length === 1 ? 'offre' : 'offres'}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Fiche demande */}
      {serviceRequest && (
        <View style={s.requestCard}>
          <View style={[s.reqMonogram, { backgroundColor: catMap[serviceRequest.category]?.color || '#475569' }]}>
            <Text style={s.reqMonogramText}>{catMap[serviceRequest.category]?.abbr || serviceRequest.category?.slice(0,2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.reqTitle}>
              {catMap[serviceRequest.category]?.label || serviceRequest.category}
            </Text>
            <Text style={s.reqMeta}>
              {[serviceRequest.location?.address, serviceRequest.budget ? `${Number(serviceRequest.budget).toLocaleString('fr-FR')} FCFA` : null].filter(Boolean).join(' • ')}
            </Text>
          </View>
        </View>
      )}

      {/* Indicateur temps réel */}
      <View style={s.rtRow}>
        <View style={[s.rtDot, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8' }]} />
        <Text style={s.rtText}>
          {offers.length} {offers.length === 1 ? t('offers.offerReceived') : t('offers.offersReceived')} • {t('offers.realtimeUpdate')}
        </Text>
      </View>

      {/* Filtres */}
      {offers.length > 0 && !loading && (
        <View style={s.filterRow}>
          {(['recommended', 'cheapest', 'fastest', 'bestRated'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.85}
            >
              <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>{t(`offers.filter_${f}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ScrollView contentContainerStyle={s.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : err ? (
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#F59E0B" />}
        >
          {offers.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{t('offers.noOffers')}</Text>
              <Text style={s.emptyText}>{t('offers.noOffersSub')}</Text>
            </View>
          ) : (
            sortedOffers.map(offer => {
              const st = STATUS_OFFER[offer.status] || STATUS_OFFER.submitted
              const isAccepted = offer.status === 'accepted'
              const isRejected = offer.status === 'rejected'
              const validMs = offer.validUntil ? new Date(offer.validUntil).getTime() - now : Infinity
              const isExpired = offer.status === 'expired' || (offer.status === 'submitted' && validMs <= 0)
              const countdownLabel = formatCountdown(validMs)
              const displayName = offer.providerName || null
              const initials = displayName
                ? displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                : getInitials(offer.providerId || offer._id)
              const avatarColors = ['#1D4ED8','#0369A1','#6D28D9','#0891B2','#065F46','#92400E']
              const avatarColor = avatarColors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % avatarColors.length]
              const isBest = bestChoiceId === offer._id && offer.status === 'submitted' && !isExpired
              return (
                <View key={offer._id} style={[s.card, isAccepted && s.cardAccepted, isRejected && s.cardRejected]}>
                  {isBest && (
                    <View style={s.bestChoiceBadge}>
                      <Text style={s.bestChoiceText}>{t('offers.bestChoice')}</Text>
                    </View>
                  )}
                  <View style={s.cardTop}>
                    <View style={[s.avatar, { backgroundColor: avatarColor }]}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={s.providerInfo}>
                      <Text style={s.providerName}>{displayName || t('offers.providerInitials', { initials })}</Text>
                      <View style={s.chips}>
                        {offer.providerRating ? (
                          <View style={s.chipRating}><Text style={s.chipRatingText}>N {offer.providerRating.avg} ({offer.providerRating.count})</Text></View>
                        ) : null}
                        {offer.providerVerified ? (
                          <View style={s.chipVerified}><Text style={s.chipVerifiedText}>{t('offers.verified')}</Text></View>
                        ) : null}
                        {offer.etaMinutes ? (
                          <View style={s.chip}><Text style={s.chipText}>{t('offers.arrIn', { min: offer.etaMinutes })}</Text></View>
                        ) : null}
                        {offer.status === 'submitted' && !isExpired ? (
                          <View style={s.chipAvail}><Text style={s.chipAvailText}>{t('offers.available')}</Text></View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={s.price}>{Number(offer.price).toLocaleString('fr-FR')} FCFA</Text>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <View style={[s.dot, { backgroundColor: st.dot }]} />
                        <Text style={[s.badgeText, { color: st.color }]}>{t(st.key)}</Text>
                      </View>
                    </View>
                  </View>

                  {offer.validUntil && !isAccepted && !requestDone ? (
                    <View style={[s.countdown, isExpired && s.countdownExpired, !isExpired && validMs < 120_000 && s.countdownUrgent]}>
                      <Text style={[s.countdownText, isExpired && s.countdownExpiredText, !isExpired && validMs < 120_000 && s.countdownUrgentText]}>
                        {isExpired ? t('offers.expired') : `${t('offers.expiresIn') || 'Expire dans'} ${countdownLabel}`}
                      </Text>
                    </View>
                  ) : null}

                  {offer.comment ? (
                    <Text style={s.comment} numberOfLines={3}>{offer.comment}</Text>
                  ) : null}

                  {offer.clientCounterStatus === 'pending' && (
                    <View style={s.counterPendingBanner}>
                      <Text style={s.counterPendingText}>{t('offers.counterPending', { price: Number(offer.clientCounterPrice).toLocaleString('fr-FR') })}</Text>
                    </View>
                  )}
                  {offer.clientCounterStatus === 'accepted' && (
                    <View style={s.counterAcceptedBanner}>
                      <Text style={s.counterAcceptedText}>{t('offers.counterAcceptedText', { price: Number(offer.price).toLocaleString('fr-FR') })}</Text>
                      <TouchableOpacity
                        style={s.payNewPriceBtn}
                        onPress={() => acceptOffer(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.payNewPriceBtnText}>{t('offers.payAndConfirm')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {offer.clientCounterStatus === 'rejected' && (
                    <View style={s.counterRejectedBanner}>
                      <Text style={s.counterRejectedText}>{t('offers.counterRejectedText', { price: Number(offer.clientCounterPrice).toLocaleString('fr-FR') })}</Text>
                    </View>
                  )}

                  {!isAssigned && offer.status === 'submitted' && !isExpired && !offer.clientCounterStatus && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.profileBtn}
                        onPress={() => viewProfile(offer)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.profileBtnText}>{t('offers.viewProfile')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.acceptBtn}
                        onPress={() => acceptOffer(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.acceptBtnText}>{t('offers.choose')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isExpired && offer.status !== 'accepted' && offer.status !== 'rejected' && (
                    <View style={s.expiredBanner}>
                      <Text style={s.expiredText}>{t('offers.expiredBanner')}</Text>
                    </View>
                  )}

                  {isAccepted && (
                    <View style={s.acceptedBanner}>
                      <Text style={s.acceptedText}>{t('offers.acceptedBanner')}</Text>
                    </View>
                  )}
                </View>
              )
            })
          )}
        </ScrollView>
      )}

      {/* Modal de contre-offre */}
      <Modal
        visible={counterModal}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!counterLoading) setCounterModal(false) }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('offers.counterModalTitle')}</Text>
            <Text style={s.modalSubtitle}>{t('offers.counterModalSub')}</Text>
            <Text style={s.modalLabel}>{t('offers.counterPriceLabel')}</Text>
            <TextInput
              style={s.modalInput}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              placeholder={t('offers.counterPricePlaceholder')}
              placeholderTextColor="#94A3B8"
            />
            <Text style={s.modalLabel}>{t('offers.counterCommentLabel')}</Text>
            <TextInput
              style={[s.modalInput, { height: 80 }]}
              value={counterComment}
              onChangeText={setCounterComment}
              placeholder={t('offers.counterCommentPlaceholder')}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={200}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnCancel]}
                onPress={() => setCounterModal(false)}
                disabled={counterLoading}
              >
                <Text style={s.modalBtnCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnSend]}
                onPress={sendCounterOffer}
                disabled={counterLoading}
              >
                {counterLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalBtnSendText}>{t('common.send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#0F172A', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 2 },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reqMonogram: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reqMonogramText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  reqTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', lineHeight: 20 },
  reqMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },
  rtRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rtDot: { width: 7, height: 7, borderRadius: 4 },
  rtText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardAccepted: { borderColor: '#16A34A', borderWidth: 2 },
  cardRejected: { opacity: 0.55 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  providerInfo: { flex: 1, gap: 6 },
  providerName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  price: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  chipAvail: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  chipAvailText: { fontSize: 11, color: '#15803D', fontWeight: '700' },
  chipRating: { backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FDE68A' },
  chipRatingText: { fontSize: 11, color: '#92400E', fontWeight: '800' },
  chipVerified: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  chipVerifiedText: { fontSize: 11, color: '#1D4ED8', fontWeight: '800' },
  countdown: { backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0' },
  countdownExpired: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  countdownUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  countdownText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  countdownExpiredText: { color: '#B91C1C' },
  countdownUrgentText: { color: '#B91C1C' },
  expiredBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  expiredText: { fontSize: 13, color: '#B91C1C', fontWeight: '700', textAlign: 'center' },
  comment: { fontSize: 14, color: '#475569', lineHeight: 21 },
  acceptBtn: { flex: 1.2, backgroundColor: '#0F172A', borderRadius: 14, padding: 15, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  acceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedText: { fontSize: 13, color: '#15803D', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0F172A', borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  // ── Filtres & meilleur choix ──
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1F5F9' },
  filterBtnActive: { backgroundColor: '#0F172A' },
  filterBtnText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  filterBtnTextActive: { color: '#fff' },
  bestChoiceBadge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  bestChoiceText: { fontSize: 11, fontWeight: '800', color: '#16A34A' },

  // ── Contre-offre ──
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  profileBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  profileBtnText: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  negotiateBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  negotiateBtnText: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  counterPendingBanner: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FDE68A' },
  counterPendingText: { fontSize: 13, color: '#92400E', fontWeight: '700' },
  counterAcceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#BBF7D0', gap: 10 },
  counterAcceptedText: { fontSize: 13, color: '#15803D', fontWeight: '700' },
  payNewPriceBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 12, alignItems: 'center' },
  payNewPriceBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  counterRejectedBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  counterRejectedText: { fontSize: 13, color: '#B91C1C', fontWeight: '700' },

  // ── Modal contre-offre ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, paddingBottom: 48 },
  modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 4 },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#0F172A' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalBtn: { flex: 1, borderRadius: 14, padding: 15, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { color: '#475569', fontSize: 15, fontWeight: '800' },
  modalBtnSend: { backgroundColor: '#0F172A' },
  modalBtnSendText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})

export default withScreenBoundary(RequestOffers, 'RequestOffers')
