import { useEffect, useState, useCallback, useMemo, useRef } from 'react'

import { colors, radius, shadows } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, TextInput, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPost } from '../src/api'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { connectSocket } from '../src/socket'
import TabBar from '../src/components/TabBar'
import { SkeletonCard } from '../src/components/Skeleton'
import EmptyState from '../src/components/EmptyState'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Map, AlertTriangle, Inbox, Search, MessageSquare, CheckCircle2, XCircle, Truck, Wrench, MapPin, Pause, Clock } from 'lucide-react-native'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  submitted: { label: 'En attente',  color: '#92400E', bg: colors.warningLight, dot: '#D97706' },
  accepted:  { label: 'Acceptée',   color: '#065F46', bg: '#ECFDF5', dot: colors.success },
  rejected:  { label: 'Refusée',    color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  expired:   { label: 'Expirée',    color: '#475569', bg: colors.slate100, dot: colors.textMuted },
  withdrawn: { label: 'Retirée',    color: '#475569', bg: colors.slate100, dot: colors.textMuted },
  cancelled: { label: 'Annulée',    color: '#475569', bg: colors.slate100, dot: colors.textMuted },
}

const MISSION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; banner: string }> = {
  assigned:          { label: 'À démarrer',     color: '#065F46', bg: '#ECFDF5', dot: colors.success, banner: 'Le client vous a sélectionné. Préparez-vous !' },
  on_the_way:        { label: 'En route',       color: '#0369A1', bg: '#E0F2FE', dot: '#0EA5E9', banner: 'Vous êtes en route vers le client.' },
  provider_arriving: { label: 'En route',       color: '#0369A1', bg: '#E0F2FE', dot: '#0EA5E9', banner: 'Vous êtes en route vers le client.' },
  arrived:           { label: 'Arrivé',         color: '#0369A1', bg: '#E0F2FE', dot: '#0EA5E9', banner: 'Vous êtes arrivé chez le client.' },
  in_progress:       { label: 'En cours',       color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED', banner: 'Mission en cours.' },
  paused:            { label: 'En pause',       color: '#B45309', bg: '#FEF3C7', dot: colors.warning, banner: 'Mission en pause.' },
  awaiting_validation:{ label: 'Validation client', color: '#B45309', bg: '#FEF3C7', dot: colors.warning, banner: 'En attente de validation client.' },
  completed:         { label: 'Terminée',       color: '#374151', bg: colors.slate100, dot: '#6B7280', banner: 'Mission terminée avec succès.' },
  cancelled:         { label: 'Annulée',        color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626', banner: 'Mission annulée.' },
  dispute:           { label: 'Litige',         color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626', banner: 'Un litige est ouvert.' },
}

function MyOffers() {
  const { t } = useTranslation()
  const { filter } = useLocalSearchParams<{ filter?: string }>()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done' | 'pending' | 'counter'>(filter === 'active' ? 'active' : 'all')
  const [respondLoading, setRespondLoading] = useState<string | null>(null)

  const busyRef = useRef(false)
  const load = useCallback(async (isRefresh = false) => {
    if (busyRef.current) return
    busyRef.current = true
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const r = await apiGet('/api/services/offers?mine=1')
      setItems(Array.isArray(r?.items) ? r.items : [])
    } catch (e: any) {
      setErr(humanErrorMessage(e))
    } finally {
      busyRef.current = false
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useFocusEffect(
    useCallback(() => {
      load(true)
    }, [load])
  )

  // WebSocket: écouter les notifications du canal provider
  useEffect(() => {
    const socket = connectSocket()

    const onAccepted = (payload: any) => {
      load(true)
      if (payload?.requestId) {
        router.push(`/active-mission/${payload.requestId}`)
      }
    }
    const onRejected = () => { load(true) }
    const onCounter = () => { load(true) }
    const onUpdated = () => { load(true) }
    const onStatus = () => { load(true) }

    socket.on('offer:accepted', onAccepted)
    socket.on('offer:rejected', onRejected)
    socket.on('offer:counter', onCounter)
    socket.on('offer:updated', onUpdated)
    socket.on('mission:status-changed', onStatus)

    // Fallback si la notif temps réel est manquée (silencieux)
    const interval = setInterval(() => { load(true) }, 30000)

    return () => {
      clearInterval(interval)
      socket.off('offer:accepted', onAccepted)
      socket.off('offer:rejected', onRejected)
      socket.off('offer:counter', onCounter)
      socket.off('offer:updated', onUpdated)
      socket.off('mission:status-changed', onStatus)
    }
  }, [load])

  const totalAccepted = items.filter(it => it.status === 'accepted').length
  const totalRevenu = items
    .filter(it => it.requestStatus === 'completed' || (it.status === 'accepted' && it.requestStatus === 'completed'))
    .reduce((sum, it) => sum + (it.price || 0), 0)
  const counterCount = items.filter(it => it.status === 'submitted' && it.clientCounterStatus === 'pending').length

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      const missionStatus = it.requestStatus || it.status
      const matchesStatus =
        (statusFilter === 'all')
        || (statusFilter === 'active' && ['assigned', 'provider_arriving', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute'].includes(missionStatus))
        || (statusFilter === 'done' && ['completed', 'cancelled', 'rejected', 'expired', 'withdrawn'].includes(missionStatus))
        || (statusFilter === 'pending' && it.status === 'submitted')
        || (statusFilter === 'counter' && it.status === 'submitted' && it.clientCounterStatus === 'pending')
      const haystack = `${it.requestCategory || ''} ${it.comment || ''} ${it.price || ''} ${missionStatus}`.toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [items, query, statusFilter])

  const respondToCounter = async (offerId: string, accept: boolean) => {
    setRespondLoading(offerId)
    try {
      const r = await apiPost(`/api/services/offers/${offerId}/counter-response`, { accept })
      toast[accept ? 'success' : 'info'](
        accept ? t('offers.counterAcceptTitle') : t('offers.counterRejectTitle'),
        accept ? t('offers.counterAcceptMsg') : t('offers.counterRejectMsg')
      )
      load(true)
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    }
    setRespondLoading(null)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('offers.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/nearby-requests')} style={s.addBtn}>
          <Map size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Stats résumé */}
      {items.length > 0 && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{items.length}</Text>
            <Text style={s.statLabel}>{t('offers.total')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: colors.success }]}>{totalAccepted}</Text>
            <Text style={s.statLabel}>{t('offers.accepted')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: colors.text }]}>{totalRevenu.toLocaleString('fr-FR')}</Text>
            <Text style={s.statLabel}>FCFA</Text>
          </View>
        </View>
      )}

      {items.length > 0 && (
        <View style={s.filters}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('offers.search')}
            placeholderTextColor={colors.textMuted}
            style={s.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {[
              ['all', t('offers.all')],
              ['active', t('offers.active')],
              ['pending', t('offers.pending')],
              ['counter', `${t('offers.counter')}${counterCount > 0 ? ` (${counterCount})` : ''}`],
              ['done', t('offers.done')],
            ].map(([key, label]) => (
              <TouchableOpacity key={key} style={[s.filterChip, statusFilter === key && s.filterChipActive]} onPress={() => setStatusFilter(key as any)}>
                <Text style={[s.filterChipText, statusFilter === key && s.filterChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
          <AlertTriangle size={40} color={colors.primary} />
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#059669" />}
        >
          {filteredItems.length === 0 && (
            <EmptyState
              icon={items.length === 0 ? <Inbox size={32} color={colors.textMuted} /> : <Search size={32} color={colors.textMuted} />}
              title={items.length === 0 ? t('offers.noOffers') : t('offers.noResult')}
              subtitle={items.length === 0 ? t('offers.noOffersSub') : t('offers.noResultSub')}
              actionLabel={t('offers.viewRequests')}
              onAction={() => router.push('/nearby-requests')}
            />
          )}

          {filteredItems.map(it => {
            const isActiveMission = it.status === 'accepted' && it.requestStatus
            const missionSt = isActiveMission ? MISSION_STATUS_CONFIG[it.requestStatus] : null
            const displaySt = missionSt || STATUS_CONFIG[it.status] || { label: it.status, color: '#475569', bg: colors.slate100, dot: colors.textMuted }
            const isTappable = it.status === 'accepted'
            return (
              <TouchableOpacity
                key={it._id}
                style={[s.card, it.status === 'accepted' && s.cardAccepted]}
                activeOpacity={isTappable ? 0.85 : 1}
                onPress={() => {
                  if (isTappable) router.push(`/active-mission/${it.requestId}`)
                }}
              >
                <View style={s.cardTop}>
                  <Text style={s.price}>{Number(it.price).toLocaleString('fr-FR')} FCFA</Text>
                  <View style={[s.badge, { backgroundColor: displaySt.bg }]}>
                    <View style={[s.statusDot, { backgroundColor: displaySt.dot }]} />
                    <Text style={[s.badgeText, { color: displaySt.color }]}>{displaySt.label}</Text>
                  </View>
                </View>

                {it.requestCategory && (
                  <Text style={s.categoryText}>{it.requestCategory}</Text>
                )}

                <View style={s.infoRow}>
                  {it.etaMinutes ? (
                    <View style={s.chip}><Text style={s.chipText}>Arr. {it.etaMinutes} min</Text></View>
                  ) : null}
                  <View style={s.chip}>
                    <Text style={s.chipText}>
                      {it.createdAt ? new Date(it.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                    </Text>
                  </View>
                </View>

                {it.comment ? <Text style={s.comment} numberOfLines={2}>{it.comment}</Text> : null}

                {/* Contre-offre en attente */}
                {it.status === 'submitted' && it.clientCounterStatus === 'pending' && (
                  <View style={s.counterBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MessageSquare size={14} color="#1D4ED8" />
                      <Text style={s.counterTitle}>{t('offers.counterClient')}</Text>
                    </View>
                    <Text style={s.counterText}>
                      {t('offers.counterText', { clientPrice: Number(it.clientCounterPrice).toLocaleString('fr-FR'), price: Number(it.price).toLocaleString('fr-FR') })}
                    </Text>
                    {it.clientCounterComment ? (
                      <Text style={s.counterComment}>« {it.clientCounterComment} »</Text>
                    ) : null}
                    <View style={s.counterActions}>
                      <TouchableOpacity
                        style={[s.counterBtn, s.counterBtnReject]}
                        onPress={() => respondToCounter(it._id, false)}
                        disabled={respondLoading === it._id}
                      >
                        {respondLoading === it._id ? (
                          <ActivityIndicator size="small" color="#B91C1C" />
                        ) : (
                          <Text style={s.counterBtnRejectText}>{t('offers.rejectBtn')}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.counterBtn, s.counterBtnAccept]}
                        onPress={() => respondToCounter(it._id, true)}
                        disabled={respondLoading === it._id}
                      >
                        {respondLoading === it._id ? (
                          <ActivityIndicator size="small" color={colors.surface} />
                        ) : (
                          <Text style={s.counterBtnAcceptText}>{t('offers.acceptBtn')}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Indicateur si contre-offre déjà traitée */}
                {it.status === 'submitted' && it.clientCounterStatus === 'accepted' && (
                  <View style={s.counterAcceptedBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} color="#15803D" />
                      <Text style={s.counterAcceptedText}>{t('offers.counterAccepted', { price: Number(it.price).toLocaleString('fr-FR') })}</Text>
                    </View>
                  </View>
                )}
                {it.status === 'submitted' && it.clientCounterStatus === 'rejected' && (
                  <View style={s.counterRejectedBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <XCircle size={14} color="#B91C1C" />
                      <Text style={s.counterRejectedText}>{t('offers.counterRejected')}</Text>
                    </View>
                  </View>
                )}

                {it.status === 'accepted' && missionSt && (
                  <View style={[s.acceptedBanner, { backgroundColor: missionSt.bg, borderColor: missionSt.color + '33' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {it.requestStatus === 'assigned' && <CheckCircle2 size={14} color={missionSt.color} />}
                      {(it.requestStatus === 'provider_arriving' || it.requestStatus === 'on_the_way') && <Truck size={14} color={missionSt.color} />}
                      {it.requestStatus === 'arrived' && <MapPin size={14} color={missionSt.color} />}
                      {it.requestStatus === 'in_progress' && <Wrench size={14} color={missionSt.color} />}
                      {it.requestStatus === 'paused' && <Pause size={14} color={missionSt.color} />}
                      {it.requestStatus === 'awaiting_validation' && <Clock size={14} color={missionSt.color} />}
                      {it.requestStatus === 'completed' && <CheckCircle2 size={14} color={missionSt.color} />}
                      {(it.requestStatus === 'cancelled' || it.requestStatus === 'dispute') && <XCircle size={14} color={missionSt.color} />}
                      <Text style={[s.acceptedText, { color: missionSt.color }]}>{missionSt.banner}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <TabBar active="offers" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate100 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  addBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statNum: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', marginTop: 2 },
  filters: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  filterChips: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  filterChipTextActive: { color: colors.surface },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  cardAccepted: { borderColor: colors.success, borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: '700', color: colors.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: colors.slate100, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  categoryText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' },
  comment: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  acceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.navy, borderRadius: 14, ...shadows.sm },
  retryTxt: { color: colors.surface, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { backgroundColor: colors.navy, borderRadius: radius.lg, paddingHorizontal: 28, paddingVertical: 14, minHeight: 50, marginTop: 8, ...shadows.md },
  btnText: { color: colors.surface, fontWeight: '600', fontSize: 14 },

  // ── Contre-offre ──
  counterBanner: { backgroundColor: colors.infoLight, borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#BFDBFE', gap: 6 },
  counterTitle: { fontSize: 13, fontWeight: '800', color: '#1D4ED8' },
  counterText: { fontSize: 13, color: '#374151' },
  counterComment: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  counterActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  counterBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  counterBtnAccept: { backgroundColor: '#059669' },
  counterBtnAcceptText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  counterBtnReject: { backgroundColor: colors.dangerLight },
  counterBtnRejectText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  counterAcceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  counterAcceptedText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  counterRejectedBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  counterRejectedText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },
})

export default withScreenBoundary(MyOffers, 'MyOffers')
