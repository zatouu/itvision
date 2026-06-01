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

const STATUS_OFFER: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  submitted: { label: 'En attente',  color: '#92400E', bg: '#FFFBEB', dot: '#D97706' },
  accepted:  { label: 'Acceptée',   color: '#065F46', bg: '#ECFDF5', dot: '#16A34A' },
  rejected:  { label: 'Refusée',    color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  withdrawn: { label: 'Retirée',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  expired:   { label: 'Expirée',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
}

function formatCountdown(ms: number): string {
  if (!isFinite(ms) || ms <= 0) return 'Expirée'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export default function RequestOffers() {
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
  // Contre-offre modal
  const [counterModal, setCounterModal] = useState(false)
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterComment, setCounterComment] = useState('')
  const [counterLoading, setCounterLoading] = useState(false)

  // Tick 1s pour countdown des offres (stop si demande terminée)
  const requestDone = serviceRequest && ['assigned','provider_arriving','in_progress','completed','cancelled'].includes(serviceRequest.status)
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

  const acceptOffer = async (offerId: string, price: number) => {
    const ok = await confirm(
      'Confirmer le choix',
      `Accepter cette offre à ${price.toLocaleString('fr-FR')} FCFA ?`
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

  const sendCounterOffer = async () => {
    if (!counterOfferId || !counterPrice) return
    const price = Number(counterPrice.replace(/\s/g, ''))
    if (!price || price <= 0) {
      Alert.alert('Prix invalide', 'Veuillez entrer un prix supérieur à 0')
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
      Alert.alert('Contre-offre envoyée', 'Le prestataire va être notifié de votre proposition.')
      load(true)
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible d\'envoyer la contre-offre')
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
  const { i18n } = useTranslation()
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
        <Text style={s.title}>Offres reçues</Text>
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

      {/* Indicateur temps réel */}
      <View style={s.rtRow}>
        <View style={[s.rtDot, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8' }]} />
        <View style={[s.rtDot2, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8', opacity: 0.4 }]} />
        <Text style={s.rtText}>Mise à jour en temps réel</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : err ? (
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563EB" />}
        >
          {offers.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>Aucune offre pour l'instant</Text>
              <Text style={s.emptyText}>Les prestataires proches verront votre demande et proposeront leurs prix. Tirez vers le bas pour actualiser.</Text>
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
                      <Text style={s.providerName}>{displayName || `Prestataire ${initials}`}</Text>
                      <View style={s.chips}>
                        {offer.etaMinutes ? (
                          <View style={s.chip}><Text style={s.chipText}>⏱ Arr. {offer.etaMinutes} min</Text></View>
                        ) : null}
                          {offer.providerRating ? (
                          <View style={s.chipRating}><Text style={s.chipRatingText}>★ {offer.providerRating.avg} ({offer.providerRating.count})</Text></View>
                        ) : null}
                        {offer.providerVerified ? (
                          <View style={s.chipVerified}><Text style={s.chipVerifiedText}>✓ Vérifié</Text></View>
                        ) : null}
                        {offer.status === 'submitted' && !isExpired ? (
                          <View style={s.chipAvail}><Text style={s.chipAvailText}>Disponible</Text></View>
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
                              {isExpired ? '⌛ Expirée' : `⏳ ${countdownLabel}`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={s.price}>{Number(offer.price).toLocaleString('fr-FR')} FCFA</Text>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <View style={[s.dot, { backgroundColor: st.dot }]} />
                        <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>

                  {offer.comment ? (
                    <Text style={s.comment} numberOfLines={3}>{offer.comment}</Text>
                  ) : null}

                  {/* Indicateur de contre-offre */}
                  {offer.clientCounterStatus === 'pending' && (
                    <View style={s.counterPendingBanner}>
                      <Text style={s.counterPendingText}>💬 Votre contre-offre de {Number(offer.clientCounterPrice).toLocaleString('fr-FR')} FCFA est en attente…</Text>
                    </View>
                  )}
                  {offer.clientCounterStatus === 'accepted' && (
                    <View style={s.counterAcceptedBanner}>
                      <Text style={s.counterAcceptedText}>✅ Contre-offre acceptée ! Nouveau prix : {Number(offer.price).toLocaleString('fr-FR')} FCFA</Text>
                      <TouchableOpacity
                        style={s.payNewPriceBtn}
                        onPress={() => acceptOffer(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.payNewPriceBtnText}>Payer et confirmer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {offer.clientCounterStatus === 'rejected' && (
                    <View style={s.counterRejectedBanner}>
                      <Text style={s.counterRejectedText}>❌ Le prestataire a refusé votre contre-offre de {Number(offer.clientCounterPrice).toLocaleString('fr-FR')} FCFA</Text>
                    </View>
                  )}

                  {!isAssigned && offer.status === 'submitted' && !isExpired && !offer.clientCounterStatus && (
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={s.negotiateBtn}
                        onPress={() => openCounterModal(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.negotiateBtnText}>💬 Négocier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.acceptBtn}
                        onPress={() => acceptOffer(offer._id, offer.price)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.acceptBtnText}>Choisir</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isExpired && offer.status !== 'accepted' && offer.status !== 'rejected' && (
                    <View style={s.expiredBanner}>
                      <Text style={s.expiredText}>⌛ Cette offre a expiré</Text>
                    </View>
                  )}

                  {isAccepted && (
                    <View style={s.acceptedBanner}>
                      <Text style={s.acceptedText}>✓ Prestataire notifié — mission en cours</Text>
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
            <Text style={s.modalTitle}>Proposer un autre prix</Text>
            <Text style={s.modalSubtitle}>Le prestataire recevra votre proposition en temps réel.</Text>
            <Text style={s.modalLabel}>Votre prix (FCFA)</Text>
            <TextInput
              style={s.modalInput}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              placeholder="Ex: 12000"
              placeholderTextColor="#94A3B8"
            />
            <Text style={s.modalLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={[s.modalInput, { height: 72 }]}
              value={counterComment}
              onChangeText={setCounterComment}
              placeholder="Ex: C'est urgent, j'accepte 12 000 max"
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
                <Text style={s.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.modalBtnSend]}
                onPress={sendCounterOffer}
                disabled={counterLoading}
              >
                {counterLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.modalBtnSendText}>Envoyer</Text>
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
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 16, color: '#0F172A' },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  countBadge: { minWidth: 28, height: 28, borderRadius: 14, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  countText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  reqMonogram: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  reqMonogramText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  reqTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 19 },
  reqMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rtRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  rtDot: { width: 7, height: 7, borderRadius: 4 },
  rtDot2: { width: 5, height: 5, borderRadius: 3 },
  rtText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardAccepted: { borderColor: '#16A34A', borderWidth: 2 },
  cardRejected: { opacity: 0.55 },
  providerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  providerName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  price: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  chipAvail: { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' },
  chipAvailText: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  chipRating: { backgroundColor: '#FFFBEB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#FDE68A' },
  chipRatingText: { fontSize: 11, color: '#92400E', fontWeight: '700' },
  chipVerified: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  chipVerifiedText: { fontSize: 11, color: '#1D4ED8', fontWeight: '700' },
  chipUrgent: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  chipUrgentText: { color: '#B91C1C' },
  chipExpired: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  chipExpiredText: { color: '#94A3B8' },
  expiredBanner: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  expiredText: { fontSize: 13, color: '#64748B', fontWeight: '600', textAlign: 'center' },
  comment: { fontSize: 13, color: '#475569', lineHeight: 19, fontStyle: 'italic' },
  acceptBtn: { backgroundColor: '#0F172A', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  acceptBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  acceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0F172A', borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  // ── Contre-offre ──
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  negotiateBtn: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#BFDBFE' },
  negotiateBtnText: { color: '#1D4ED8', fontSize: 14, fontWeight: '700' },
  counterPendingBanner: { backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FDE68A' },
  counterPendingText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  counterAcceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0', gap: 8 },
  counterAcceptedText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  payNewPriceBtn: { backgroundColor: '#059669', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  payNewPriceBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  counterRejectedBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  counterRejectedText: { fontSize: 13, color: '#B91C1C', fontWeight: '600' },

  // ── Modal contre-offre ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 4 },
  modalInput: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0F172A' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F1F5F9' },
  modalBtnCancelText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  modalBtnSend: { backgroundColor: '#0F172A' },
  modalBtnSendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
