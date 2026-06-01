import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, TextInput, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPost } from '../src/api'
import { connectSocket } from '../src/socket'
import TabBar from '../src/components/TabBar'
import { SkeletonCard } from '../src/components/Skeleton'
import EmptyState from '../src/components/EmptyState'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  submitted: { label: 'En attente',  color: '#92400E', bg: '#FFFBEB', dot: '#D97706' },
  accepted:  { label: 'Acceptée',   color: '#065F46', bg: '#ECFDF5', dot: '#16A34A' },
  rejected:  { label: 'Refusée',    color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  expired:   { label: 'Expirée',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  withdrawn: { label: 'Retirée',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
  cancelled: { label: 'Annulée',    color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' },
}

const MISSION_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; banner: string }> = {
  assigned:          { label: 'À démarrer',     color: '#065F46', bg: '#ECFDF5', dot: '#16A34A', banner: '✅ Le client vous a sélectionné. Préparez-vous !' },
  provider_arriving: { label: 'En route',       color: '#0369A1', bg: '#E0F2FE', dot: '#0EA5E9', banner: '🚗 Vous êtes en route vers le client.' },
  in_progress:       { label: 'En cours',       color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED', banner: '🛠️ Mission en cours.' },
  completed:         { label: 'Terminée',       color: '#374151', bg: '#F1F5F9', dot: '#6B7280', banner: '✅ Mission terminée avec succès.' },
  cancelled:         { label: 'Annulée',        color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626', banner: '❌ Mission annulée.' },
}

export default function MyOffers() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'done' | 'pending' | 'counter'>('all')
  const [respondLoading, setRespondLoading] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const r = await apiGet('/api/services/offers?mine=1')
      setItems(r.items || [])
    } catch {
      setErr('Impossible de charger les offres')
    }
    if (isRefresh) setRefreshing(false)
    else setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // WebSocket: écouter les notifications du canal provider
  useEffect(() => {
    const socket = connectSocket()

    socket.on('offer:accepted', (payload: any) => {
      load(true)
      if (payload?.requestId) {
        router.push(`/active-mission/${payload.requestId}`)
      }
    })
    socket.on('offer:rejected', () => { load(true) })
    socket.on('offer:counter', () => { load(true) })
    socket.on('mission:status-changed', () => { load(true) })

    // Fallback si la notif temps réel est manquée
    const interval = setInterval(() => {
      load(true)
    }, 15000)

    return () => {
      clearInterval(interval)
      socket.off('offer:accepted')
      socket.off('offer:rejected')
      socket.off('offer:counter')
      socket.off('mission:status-changed')
    }
  }, [load])

  const totalAccepted = items.filter(it => it.status === 'accepted').length
  const totalRevenu = items
    .filter(it => it.status === 'accepted')
    .reduce((sum, it) => sum + (it.price || 0), 0)
  const counterCount = items.filter(it => it.status === 'submitted' && it.clientCounterStatus === 'pending').length

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      const missionStatus = it.requestStatus || it.status
      const matchesStatus =
        statusFilter === 'all'
        || (statusFilter === 'active' && ['assigned', 'provider_arriving', 'in_progress'].includes(missionStatus))
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
      Alert.alert(
        accept ? 'Contre-offre acceptée' : 'Contre-offre refusée',
        accept
          ? 'Le prix de votre offre a été mis à jour. Le client peut maintenant payer.'
          : 'Vous avez refusé la contre-offre du client.'
      )
      load(true)
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de répondre')
    }
    setRespondLoading(null)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Mes offres</Text>
        <TouchableOpacity onPress={() => router.push('/nearby-requests')} style={s.addBtn}>
          <Text style={{ fontSize: 18 }}>🗺️</Text>
        </TouchableOpacity>
      </View>

      {/* Stats résumé */}
      {items.length > 0 && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{items.length}</Text>
            <Text style={s.statLabel}>Total</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#16A34A' }]}>{totalAccepted}</Text>
            <Text style={s.statLabel}>Acceptées</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#0F172A' }]}>{totalRevenu.toLocaleString('fr-FR')}</Text>
            <Text style={s.statLabel}>FCFA</Text>
          </View>
        </View>
      )}

      {items.length > 0 && (
        <View style={s.filters}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher catégorie, prix, commentaire..."
            placeholderTextColor="#94A3B8"
            style={s.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {[
              ['all', 'Toutes'],
              ['active', 'Actives'],
              ['pending', 'En attente'],
              ['counter', `Contre-offres${counterCount > 0 ? ` (${counterCount})` : ''}`],
              ['done', 'Terminées'],
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
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#059669" />}
        >
          {filteredItems.length === 0 && (
            <EmptyState
              icon={items.length === 0 ? '📨' : '🔍'}
              title={items.length === 0 ? 'Aucune offre envoyée' : 'Aucun résultat'}
              subtitle={items.length === 0 ? 'Parcourez les demandes proches et faites vos premières offres.' : 'Essayez un autre statut ou une autre recherche.'}
              actionLabel="Voir les demandes"
              onAction={() => router.push('/nearby-requests')}
            />
          )}

          {filteredItems.map(it => {
            const isActiveMission = it.status === 'accepted' && it.requestStatus
            const missionSt = isActiveMission ? MISSION_STATUS_CONFIG[it.requestStatus] : null
            const displaySt = missionSt || STATUS_CONFIG[it.status] || { label: it.status, color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' }
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
                    <Text style={s.counterTitle}>💬 Contre-offre client</Text>
                    <Text style={s.counterText}>
                      Le client propose {Number(it.clientCounterPrice).toLocaleString('fr-FR')} FCFA au lieu de {Number(it.price).toLocaleString('fr-FR')} FCFA
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
                          <Text style={s.counterBtnRejectText}>Refuser</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.counterBtn, s.counterBtnAccept]}
                        onPress={() => respondToCounter(it._id, true)}
                        disabled={respondLoading === it._id}
                      >
                        {respondLoading === it._id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={s.counterBtnAcceptText}>Accepter</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Indicateur si contre-offre déjà traitée */}
                {it.status === 'submitted' && it.clientCounterStatus === 'accepted' && (
                  <View style={s.counterAcceptedBanner}>
                    <Text style={s.counterAcceptedText}>✅ Vous avez accepté la contre-offre à {Number(it.price).toLocaleString('fr-FR')} FCFA</Text>
                  </View>
                )}
                {it.status === 'submitted' && it.clientCounterStatus === 'rejected' && (
                  <View style={s.counterRejectedBanner}>
                    <Text style={s.counterRejectedText}>❌ Vous avez refusé la contre-offre</Text>
                  </View>
                )}

                {it.status === 'accepted' && missionSt && (
                  <View style={[s.acceptedBanner, { backgroundColor: missionSt.bg, borderColor: missionSt.color + '33' }]}>
                    <Text style={[s.acceptedText, { color: missionSt.color }]}>{missionSt.banner}</Text>
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
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 16, color: '#0F172A' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F172A', letterSpacing: -0.2 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statNum: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  filters: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', fontSize: 14 },
  filterChips: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  filterChipText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardAccepted: { borderColor: '#16A34A', borderWidth: 1.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  chipText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  categoryText: { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'capitalize' },
  comment: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  acceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedText: { fontSize: 13, color: '#15803D', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0F172A', borderRadius: 10 },
  retryTxt: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // ── Contre-offre ──
  counterBanner: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#BFDBFE', gap: 6 },
  counterTitle: { fontSize: 13, fontWeight: '800', color: '#1D4ED8' },
  counterText: { fontSize: 13, color: '#374151' },
  counterComment: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
  counterActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  counterBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  counterBtnAccept: { backgroundColor: '#059669' },
  counterBtnAcceptText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  counterBtnReject: { backgroundColor: '#FEE2E2' },
  counterBtnRejectText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  counterAcceptedBanner: { backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  counterAcceptedText: { fontSize: 12, color: '#15803D', fontWeight: '600' },
  counterRejectedBanner: { backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#FECACA' },
  counterRejectedText: { fontSize: 12, color: '#B91C1C', fontWeight: '600' },
})
