import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TextInput } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { fetchWithCache, cacheClear } from '../src/storage'
import { connectSocket } from '../src/socket'
import TabBar from '../src/components/TabBar'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import EmptyState from '../src/components/EmptyState'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  created:       { label: 'Publiée',            color: '#2563EB', bg: '#EFF6FF', dot: '#2563EB' },
  pending_offers:{ label: 'Offres reçues',      color: '#B45309', bg: '#FFFBEB', dot: '#D97706' },
  assigned:          { label: 'Prestataire trouvé', color: '#065F46', bg: '#ECFDF5', dot: '#059669' },
  provider_arriving: { label: 'En route',            color: '#0369A1', bg: '#EFF6FF', dot: '#0EA5E9' },
  in_progress:       { label: 'En cours',            color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED' },
  completed:     { label: 'Terminée',           color: '#374151', bg: '#F1F5F9', dot: '#64748B' },
  cancelled:     { label: 'Annulée',            color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
}

type CatEntry = { abbr: string; color: string; label: string }

export default function MyRequests() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'offers' | 'done'>('all')
  const [catMap, setCatMap] = useState<Record<string, CatEntry>>({})
  const { i18n } = useTranslation()

  useEffect(() => {
    loadCategories().then(cats => {
      const m: Record<string, CatEntry> = {}
      cats.forEach(c => { m[c.slug] = { abbr: c.abbr, color: c.color, label: getCategoryLabel(c, i18n.language) } })
      setCatMap(m)
    }).catch(() => {})
  }, [])

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
      // pull-to-refresh : invalide le cache et force le réseau
      await cacheClear('my-requests')
    } else {
      setLoading(true)
    }
    setErr(null)
    try {
      await fetchWithCache(
        'my-requests',
        () => apiGet('/api/services/requests?mine=1').then(r => r.items || []),
        (items, fromCache) => {
          setItems(items)
          if (!fromCache) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      )
    } catch (e: any) {
      setErr('Impossible de charger les demandes')
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [])

  // WebSocket: rafraîchir quand une offre arrive ou qu'un provider est assigné
  // Le serveur joint automatiquement user-{userId} à la connexion (cf server.js:111)
  useEffect(() => {
    const socket = connectSocket()
    const refresh = () => load(true)
    socket.on('user:offer-received', refresh)
    socket.on('user:request-assigned', refresh)
    return () => {
      socket.off('user:offer-received', refresh)
      socket.off('user:request-assigned', refresh)
    }
  }, [load])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      const matchesStatus =
        statusFilter === 'all'
        || (statusFilter === 'active' && ['assigned', 'provider_arriving', 'in_progress'].includes(it.status))
        || (statusFilter === 'offers' && (it.status === 'pending_offers' || it.pendingOfferCount > 0))
        || (statusFilter === 'done' && ['completed', 'cancelled'].includes(it.status))
      const catLabel = catMap[it.category]?.label || it.category || ''
      const haystack = `${catLabel} ${it.category || ''} ${it.description || ''} ${it.budget || ''} ${it.status}`.toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [items, query, statusFilter])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} accessibilityLabel="Retour">
          <Text style={s.iconBtnText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerLeft}>
          <Text style={s.title}>Mes demandes</Text>
          {items.length > 0 && (
            <View style={s.headerCount}>
              <Text style={s.headerCountText}>{items.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push('/create-request')} style={s.iconBtn} accessibilityLabel="Créer une demande">
          <Text style={s.iconBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {items.length > 0 && (
        <View style={s.filters}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher catégorie, description, budget..."
            placeholderTextColor="#94A3B8"
            style={s.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {[
              ['all', 'Toutes'],
              ['active', 'Actives'],
              ['offers', 'Avec offres'],
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
        <View style={s.center}><ActivityIndicator size="large" color="#F59E0B" /></View>
      ) : err ? (
        <View style={s.center}>
          <Text style={s.errIcon}>⚠️</Text>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#F59E0B" />}
        >
          {filteredItems.length === 0 && (
            <EmptyState
              icon={items.length === 0 ? '📨' : '🔍'}
              title={items.length === 0 ? 'Aucune demande' : 'Aucun résultat'}
              subtitle={items.length === 0 ? 'Publiez votre première demande et recevez des offres en quelques minutes.' : 'Essayez un autre statut ou une autre recherche.'}
              actionLabel="Créer une demande"
              onAction={() => router.push('/create-request')}
            />
          )}

          {filteredItems.map(it => {
            const st = STATUS_CONFIG[it.status] || { label: it.status, color: '#475569', bg: '#F1F5F9', dot: '#94A3B8' }
            const catLabel = catMap[it.category]?.label || it.category
            const title = it.description
              ? `${catLabel} — ${it.description.slice(0, 30)}${it.description.length > 30 ? '…' : ''}`
              : catLabel
            return (
              <TouchableOpacity
                key={it._id}
                style={s.card}
                activeOpacity={0.85}
                onPress={() => {
                  if (['assigned', 'provider_arriving', 'in_progress'].includes(it.status)) {
                    router.push(`/mission/${it._id}`)
                  } else {
                    router.push({ pathname: '/request-offers', params: { id: it._id } })
                  }
                }}
              >
                <View style={s.cardInner}>
                  {/* Monogram */}
                  <View style={[s.catMonogram, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                    <Text style={s.catMonogramText}>{catMap[it.category]?.abbr || it.category?.slice(0,2).toUpperCase()}</Text>
                  </View>
                  {/* Content */}
                  <View style={s.cardContent}>
                    <View style={s.cardTitleRow}>
                      <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {it.pendingOfferCount > 0 && (
                          <View style={s.offerCountBadge}>
                            <Text style={s.offerCountText}>{it.pendingOfferCount}</Text>
                          </View>
                        )}
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                          <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                    </View>
                    {it.description ? (
                      <Text style={s.desc} numberOfLines={2}>{it.description}</Text>
                    ) : null}
                    <Text style={s.meta}>
                      {it.createdAt ? new Date(it.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}
                      {it.budget ? ` • ${Number(it.budget).toLocaleString('fr-FR')} FCFA` : ''}
                    </Text>
                  </View>
                  <Text style={s.cardArrow}>›</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <TabBar active="requests" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCount: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  headerCountText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 18, color: '#0F172A' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  filters: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', fontSize: 14 },
  filterChips: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  filterChipText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  catMonogram: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  catMonogramText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  cardContent: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A', lineHeight: 19 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  meta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  offerCountBadge: { backgroundColor: '#F97316', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  offerCountText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errIcon: { fontSize: 36 },
  errText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0F172A', borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  offerIndicator: { backgroundColor: '#FFFBEB', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' },
  offerIndicatorText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  cardArrow: { position: 'absolute', right: 14, top: '50%', fontSize: 20, color: '#CBD5E1', fontWeight: '300' },
})
