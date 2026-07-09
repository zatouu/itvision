import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { apiGet, apiPost } from '../src/api'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../src/socket'
import { fetchWithCache, cacheClear } from '../src/storage'
import { confirm } from '../src/confirm'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import { SkeletonCard } from '../src/components/Skeleton'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { colors, radius, shadows, spacing, typography } from '../src/design'
import { hapticSuccess, hapticWarning, hapticLight } from '../src/haptics'
import { ArrowLeft, Star, Clock, Hourglass } from 'lucide-react-native'

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

function toLatLng(location: any): { lat: number; lng: number } | null {
  if (Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))) {
    return { lat: Number(location.lat), lng: Number(location.lng) }
  }
  const coords = location?.coordinates
  if (Array.isArray(coords) && coords.length === 2 && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
    return { lat: Number(coords[1]), lng: Number(coords[0]) }
  }
  return null
}

function isValidLatLng(value: any): value is { lat: number; lng: number } {
  return (
    Number.isFinite(Number(value?.lat))
    && Number.isFinite(Number(value?.lng))
    && Math.abs(Number(value.lat)) <= 90
    && Math.abs(Number(value.lng)) <= 180
  )
}

function RequestOffers() {
  const { t, i18n } = useTranslation()
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
  const [viewerLocations, setViewerLocations] = useState<Record<string, { lat: number; lng: number; name?: string; providerId?: string; lastSeen: number; status?: string; distanceKm?: number; etaMinutes?: number }>>({})
  const [liveData, setLiveData] = useState<any>(null)
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
    const handleProviderLocation = (data: any) => {
      if (!data?.providerId) return
      if (!Number.isFinite(Number(data?.lat)) || !Number.isFinite(Number(data?.lng))) return
      setViewerLocations(prev => ({
        ...prev,
        [data.providerId]: {
          lat: Number(data.lat),
          lng: Number(data.lng),
          name: data.providerName,
          providerId: data.providerId,
          lastSeen: Number(data.timestamp) || Date.now(),
          status: data.status || 'assigned',
          distanceKm: data.distance,
          etaMinutes: data.eta,
        },
      }))
    }
    const handleRequestViewing = (data: any) => {
      if (!data?.providerId) return
      const viewerLocation = toLatLng(data)
      if (!viewerLocation) return
      setViewerLocations(prev => ({
        ...prev,
        [data.providerId]: {
          ...viewerLocation,
          name: data.providerName,
          providerId: data.providerId,
          lastSeen: Number(data.timestamp) || Date.now(),
          status: 'viewing',
        },
      }))
    }
    const handleStopViewing = (data: any) => {
      if (!data?.providerId) return
      setViewerLocations(prev => {
        const next = { ...prev }
        delete next[data.providerId]
        return next
      })
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('offer:new', handleOfferNew)
    socket.on('request:assigned', handleAssigned)
    socket.on('offer:counter-accepted', handleCounterAccepted)
    socket.on('offer:counter-rejected', handleCounterRejected)
    socket.on('offer:updated', handleOfferUpdated)
    socket.on('provider:location', handleProviderLocation)
    socket.on('request:viewing', handleRequestViewing)
    socket.on('request:stop-viewing', handleStopViewing)

    // Snapshot de présence provider depuis l'API (fallback + données complètes)
    const fetchLive = () => {
      apiGet(`/api/services/requests/${id}/live`).then(data => {
        setLiveData(data)
        setViewerLocations(prev => {
          const next = { ...prev }
          const merge = (p: any) => {
            if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) return
            next[String(p.providerId)] = {
              lat: Number(p.lat),
              lng: Number(p.lng),
              name: p.name,
              providerId: String(p.providerId),
              lastSeen: new Date(p.lastSeenAt || Date.now()).getTime(),
              status: p.status,
              distanceKm: p.distanceKm,
              etaMinutes: p.etaMinutes,
            }
          }
          data.assigned && merge(data.assigned)
          ;(data.offerors || []).forEach(merge)
          ;(data.viewers || []).forEach(merge)
          ;(data.nearby || []).forEach(merge)
          return next
        })
      }).catch(() => {})
    }
    fetchLive()
    const liveInterval = setInterval(fetchLive, 15_000)

    // Fallback: auto-refresh toutes les 10s si WS déconnecté
    const interval = setInterval(() => {
      if (!socket.connected) load(true)
    }, 10000)
    // Nettoyage des viewers inactifs (> 60s)
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 60_000
      setViewerLocations(prev => {
        const next: typeof prev = {}
        let changed = false
        Object.entries(prev).forEach(([key, v]) => {
          if (v.lastSeen >= cutoff) next[key] = v
          else changed = true
        })
        return changed ? next : prev
      })
    }, 10_000)

    return () => {
      clearInterval(interval)
      clearInterval(liveInterval)
      clearInterval(cleanup)
      leaveRequestRoom(id)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('offer:new', handleOfferNew)
      socket.off('request:assigned', handleAssigned)
      socket.off('offer:counter-accepted', handleCounterAccepted)
      socket.off('offer:counter-rejected', handleCounterRejected)
      socket.off('offer:updated', handleOfferUpdated)
      socket.off('provider:location', handleProviderLocation)
      socket.off('request:viewing', handleRequestViewing)
      socket.off('request:stop-viewing', handleStopViewing)
    }
  }, [id, load])

  const getInitials = (id: string) =>
    (id || '').slice(0, 2).toUpperCase() || 'XX'

  const acceptOffer = async (offerId: string, price: number) => {
    const ok = await confirm(
      t('offers.confirmTitle'),
      t('offers.confirmMsg', { price: price.toLocaleString('fr-FR') })
    )
    if (!ok) return
    hapticLight()
    router.push(`/payment?offerId=${offerId}&amount=${price}&requestId=${id}`)
  }

  const openCounterModal = (offerId: string, currentPrice: number) => {
    setCounterOfferId(offerId)
    setCounterPrice(String(Math.round(currentPrice * 0.85)))
    setCounterComment('')
    setCounterModal(true)
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
      hapticSuccess()
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
  const requestLocation = toLatLng(serviceRequest?.location)
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
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('offers.title')}</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{offers.length}</Text>
        </View>
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
              {serviceRequest.description ? ` — ${serviceRequest.description.slice(0, 30)}` : ''}
            </Text>
            <Text style={s.reqMeta}>
              {[serviceRequest.location?.address, serviceRequest.budget ? `Budget ${Number(serviceRequest.budget).toLocaleString('fr-FR')} FCFA` : null].filter(Boolean).join(' • ')}
            </Text>
          </View>
        </View>
      )}

      {/* Carte live des prestataires qui consultent la demande (style InDriver) */}
      {requestLocation && !requestDone ? (
        <View style={s.mapWrap}>
          <View style={s.mapHeader}>
            <View style={[s.rtDot, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8' }]} />
            <Text style={s.mapTitle}>{t('offers.liveViewers', { count: Object.keys(viewerLocations).length })}</Text>
          </View>
          {Platform.OS === 'web' ? (
            <View style={s.mapPlaceholder}>
              <Text style={s.mapPlaceholderText}>{t('offers.mapWebViewers')}</Text>
            </View>
          ) : (
            <MapView
              provider={PROVIDER_DEFAULT}
              style={s.map}
              initialRegion={{
                latitude: requestLocation.lat,
                longitude: requestLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              {/* Position de la demande */}
              <Marker
                coordinate={{ latitude: requestLocation.lat, longitude: requestLocation.lng }}
                title={t('offers.requestLocation')}
                pinColor={colors.primary}
              />
              {/* Prestataires en live avec statut, distance, ETA */}
              {Object.entries(viewerLocations)
                .filter(([, v]) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
                .map(([key, v]) => {
                  const statusColor = v.status === 'selected' || v.status === 'arriving' || v.status === 'in_progress' ? '#2563EB'
                    : v.status === 'offered' ? '#F59E0B'
                    : v.status === 'viewing' ? '#10B981'
                    : '#64748B'
                  const label = v.status === 'arriving' ? t('offers.statusArriving')
                    : v.status === 'in_progress' ? t('offers.statusInProgress')
                    : v.status === 'selected' ? t('offers.statusSelected')
                    : v.status === 'offered' ? t('offers.statusOffered')
                    : v.status === 'viewing' ? t('offers.statusViewing')
                    : t('offers.viewer')
                  const sub = [v.distanceKm ? `${v.distanceKm} km` : null, v.etaMinutes ? `${v.etaMinutes} min` : null].filter(Boolean).join(' · ')
                  return (
                    <Marker
                      key={key}
                      coordinate={{ latitude: v.lat, longitude: v.lng }}
                    >
                      <View style={[s.providerMarker, { borderColor: statusColor }]}>
                        <Text style={[s.providerMarkerText, { color: statusColor }]}>{(v.name || 'P').slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={[s.providerMarkerTail, { borderTopColor: statusColor }]} />
                      {(sub || label) ? (
                        <View style={s.providerMarkerCallout}>
                          <Text style={s.providerMarkerStatus}>{label}</Text>
                          {!!sub && <Text style={s.providerMarkerSub}>{sub}</Text>}
                        </View>
                      ) : null}
                    </Marker>
                  )
                })}
            </MapView>
          )}
        </View>
      ) : null}

      {/* Indicateur temps réel */}
      <View style={s.rtRow}>
        <View style={[s.rtDot, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8' }]} />
        <View style={[s.rtDot2, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8', opacity: 0.4 }]} />
        <Text style={s.rtText}>{t('offers.realtimeUpdate')}</Text>
      </View>

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563EB" />}
        >
          {offers.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>{t('offers.noOffers')}</Text>
              <Text style={s.emptyText}>{t('offers.noOffersSub')}</Text>
            </View>
          ) : (
            offers.map(offer => {
              const st = STATUS_OFFER[offer.status] || STATUS_OFFER.submitted
              const isAccepted = offer.status === 'accepted'
              const isRejected = offer.status === 'rejected'
              // Expiration
              const validMs = offer.validUntil ? new Date(offer.validUntil).getTime() - now : Infinity
              const isExpired = offer.status === 'expired' || (offer.status === 'submitted' && validMs <= 0)
              const countdownLabel = formatCountdown(validMs)
              const displayName = offer.providerName || null
              const initials = displayName
                ? displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                : getInitials(offer.providerId || offer._id)
              const avatarColors = ['#1D4ED8','#0369A1','#6D28D9','#0891B2','#065F46','#92400E']
              const avatarColor = avatarColors[(initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % avatarColors.length]
              return (
                <View key={offer._id} style={[s.card, isAccepted && s.cardAccepted, isRejected && s.cardRejected]}>
                  {/* Ligne prestataire */}
                  <View style={s.providerRow}>
                    <View style={[s.avatar, { backgroundColor: avatarColor }]}>
                      <Text style={s.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.providerName}>{displayName || t('offers.providerInitials', { initials })}</Text>
                      <View style={s.chips}>
                        {offer.etaMinutes ? (
                          <View style={s.chip}><Text style={s.chipText}>{t('offers.arrIn', { min: offer.etaMinutes })}</Text></View>
                        ) : null}
                          {offer.providerRating ? (
                          <View style={s.chipRating}><Text style={s.chipRatingText}><Star size={11} color={colors.warning} fill={colors.warning} /> {offer.providerRating.avg} ({offer.providerRating.count})</Text></View>
                        ) : null}
                        {offer.providerVerified ? (
                          <View style={s.chipVerified}><Text style={s.chipVerifiedText}>{t('offers.verified')}</Text></View>
                        ) : null}
                        {offer.status === 'submitted' && !isExpired ? (
                          <View style={s.chipAvail}><Text style={s.chipAvailText}>{t('offers.available')}</Text></View>
                        ) : null}
                        {offer.validUntil && !isAccepted && !requestDone ? (
                          <View style={[
                            s.chip,
                            isExpired && s.chipExpired,
                            !isExpired && validMs < 120_000 && s.chipUrgent,
                          ]}>
                            <Text style={[
                              s.chipText,
                              isExpired && s.chipExpiredText,
                              !isExpired && validMs < 120_000 && s.chipUrgentText,
                            ]}>
                              {isExpired ? <Hourglass size={11} color={colors.textMuted} /> : <Clock size={11} color={colors.textSecondary} />} {isExpired ? t('offers.expired') : countdownLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.price}>{Number(offer.price).toLocaleString('fr-FR')} FCFA</Text>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <View style={[s.dot, { backgroundColor: st.dot }]} />
                        <Text style={[s.badgeText, { color: st.color }]}>{t(st.key)}</Text>
                      </View>
                    </View>
                  </View>

                  {offer.comment ? (
                    <Text style={s.comment} numberOfLines={3}>{offer.comment}</Text>
                  ) : null}

                  {/* Indicateur de contre-offre */}
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
                        style={s.negotiateBtn}
                        onPress={() => openCounterModal(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.negotiateBtnText}>{t('offers.negotiate')}</Text>
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
              style={[s.modalInput, { height: 72 }]}
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
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text },
  title: { flex: 1, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.2 },
  countBadge: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reqMonogram: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reqMonogramText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  reqTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text, lineHeight: 21 },
  reqMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  rtRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  rtDot: { width: 7, height: 7, borderRadius: 4 },
  rtDot2: { width: 5, height: 5, borderRadius: 3 },
  rtText: { fontSize: 12, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  mapWrap: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.sm },
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  mapTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text, flex: 1 },
  map: { width: '100%', height: 220 },
  mapPlaceholder: { width: '100%', height: 220, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  mapPlaceholderText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  providerMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.success, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  providerMarkerText: { fontSize: 14, fontWeight: typography.weight.extrabold as any },
  providerMarkerTail: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  providerMarkerCallout: { position: 'absolute', top: -34, backgroundColor: 'rgba(15,23,42,0.88)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 70, alignItems: 'center' },
  providerMarkerStatus: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  providerMarkerSub: { fontSize: 9, color: '#CBD5E1', marginTop: 1 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardAccepted: { borderColor: colors.success, borderWidth: 2 },
  cardRejected: { opacity: 0.55 },
  providerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  providerName: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 4 },
  price: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: typography.weight.extrabold as any },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 11, color: colors.textSecondary, fontWeight: typography.weight.extrabold as any },
  chipAvail: { backgroundColor: colors.successLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  chipAvailText: { fontSize: 11, color: colors.success, fontWeight: typography.weight.extrabold as any },
  chipRating: { backgroundColor: colors.warningLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FDE68A' },
  chipRatingText: { fontSize: 11, color: colors.warning, fontWeight: typography.weight.extrabold as any },
  chipVerified: { backgroundColor: colors.infoLight, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  chipVerifiedText: { fontSize: 11, color: colors.info, fontWeight: typography.weight.extrabold as any },
  chipUrgent: { backgroundColor: colors.dangerLight, borderColor: '#FECACA' },
  chipUrgentText: { color: colors.danger },
  chipExpired: { backgroundColor: colors.bg, borderColor: colors.border },
  chipExpiredText: { color: colors.textMuted },
  expiredBanner: { backgroundColor: colors.bg, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: colors.border },
  expiredText: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.extrabold as any, textAlign: 'center' },
  comment: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, fontStyle: 'italic' },
  acceptBtn: { backgroundColor: colors.navy, borderRadius: radius.md, padding: 14, alignItems: 'center', marginTop: 4 },
  acceptBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  acceptedBanner: { backgroundColor: colors.successLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedText: { fontSize: 13, color: colors.success, fontWeight: typography.weight.extrabold as any },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.navy, borderRadius: radius.md },
  retryTxt: { color: colors.surface, fontWeight: typography.weight.extrabold as any },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  // ── Contre-offre ──
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  negotiateBtn: { flex: 1, backgroundColor: colors.infoLight, borderRadius: radius.md, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#BFDBFE' },
  negotiateBtnText: { color: colors.info, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  counterPendingBanner: { backgroundColor: colors.warningLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FDE68A' },
  counterPendingText: { fontSize: 13, color: colors.warning, fontWeight: typography.weight.extrabold as any },
  counterAcceptedBanner: { backgroundColor: colors.successLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0', gap: 8 },
  counterAcceptedText: { fontSize: 13, color: colors.success, fontWeight: typography.weight.extrabold as any },
  payNewPriceBtn: { backgroundColor: colors.success, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  payNewPriceBtnText: { color: colors.surface, fontSize: 13, fontWeight: typography.weight.extrabold as any },
  counterRejectedBanner: { backgroundColor: colors.dangerLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  counterRejectedText: { fontSize: 13, color: colors.danger, fontWeight: typography.weight.extrabold as any },

  // ── Modal contre-offre ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  modalLabel: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text, marginTop: 4 },
  modalInput: { backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: colors.bg },
  modalBtnCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  modalBtnSend: { backgroundColor: colors.navy },
  modalBtnSendText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(RequestOffers, 'RequestOffers')
