import { useEffect, useState, useCallback, useMemo } from 'react'

import { colors, radius, shadows } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPatch } from '../src/api'
import { confirm, notify } from '../src/confirm'
import { fetchWithCache, cacheClear } from '../src/storage'
import { connectSocket } from '../src/socket'
import { SkeletonCard } from '../src/components/Skeleton'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import EmptyState from '../src/components/EmptyState'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { hapticWarning } from '../src/haptics'
import { Plus, AlertTriangle, Inbox, Search, ChevronRight, Menu } from 'lucide-react-native'
import SideMenu from '../src/components/SideMenu'

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string; dot: string }> = {
  created:       { key: 'requests.status_created',            color: '#2563EB', bg: colors.infoLight, dot: '#2563EB' },
  pending_offers:{ key: 'requests.status_pending_offers',      color: '#B45309', bg: colors.warningLight, dot: '#D97706' },
  assigned:          { key: 'requests.status_assigned', color: '#065F46', bg: '#ECFDF5', dot: '#059669' },
  provider_arriving: { key: 'requests.status_provider_arriving',            color: '#0369A1', bg: colors.infoLight, dot: '#0EA5E9' },
  in_progress:       { key: 'requests.status_in_progress',            color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED' },
  completed:     { key: 'requests.status_completed',           color: '#374151', bg: colors.slate100, dot: colors.textSecondary },
  cancelled:     { key: 'requests.status_cancelled',            color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
}

type CatEntry = { abbr: string; color: string; label: string }

function MyRequests() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'offers' | 'done'>('all')
  const [catMap, setCatMap] = useState<Record<string, CatEntry>>({})
  const { t, i18n } = useTranslation()

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
      setErr(t('requests.loadError'))
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleCancel = async (id: string) => {
    const ok = await confirm(t('requests.cancelRequestConfirm'), t('requests.cancelRequestMsg'))
    if (!ok) return
    hapticWarning()
    try {
      await apiPatch(`/api/services/requests/${id}`, { status: 'cancelled' })
      notify(t('requests.cancelRequestSuccess'), '')
      await load(true)
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('déjà') || msg.includes('Statut déjà')) {
        notify('Demande déjà annulée', '')
        load(true)
      } else {
        notify(t('common.error'), msg || 'Erreur')
      }
    }
  }

  useEffect(() => { load() }, [])

  useFocusEffect(
    useCallback(() => {
      load(true)
    }, [load])
  )

  // WebSocket: rafraîchir quand une offre arrive, qu'un provider est assigné ou qu'un statut change
  // Le serveur joint automatiquement user-{userId} à la connexion (cf server.js:111)
  useEffect(() => {
    const socket = connectSocket()
    const refresh = () => load(true)
    socket.on('user:offer-received', refresh)
    socket.on('user:request-assigned', refresh)
    socket.on('request:status-changed', refresh)
    return () => {
      socket.off('user:offer-received', refresh)
      socket.off('user:request-assigned', refresh)
      socket.off('request:status-changed', refresh)
    }
  }, [load])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      const matchesStatus =
        (statusFilter === 'all' && !['completed', 'cancelled', 'expired'].includes(it.status))
        || (statusFilter === 'active' && ['assigned', 'provider_arriving', 'in_progress'].includes(it.status))
        || (statusFilter === 'offers' && (it.status === 'pending_offers' || it.pendingOfferCount > 0))
        || (statusFilter === 'done' && ['completed', 'cancelled', 'expired'].includes(it.status))
      const catLabel = catMap[it.category]?.label || it.category || ''
      const haystack = `${catLabel} ${it.category || ''} ${it.description || ''} ${it.budget || ''} ${it.status}`.toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [items, query, statusFilter])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.iconBtn} accessibilityLabel="Menu">
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerLeft}>
          <Text style={s.title}>{t('requests.title')}</Text>
          {items.length > 0 && (
            <View style={s.headerCount}>
              <Text style={s.headerCountText}>{items.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.push('/create-request')} style={s.iconBtn} accessibilityLabel={t('requests.createRequest')}>
          <Plus size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {items.length > 0 && (
        <View style={s.filters}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('requests.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={s.searchInput}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {[
              ['all', t('requests.filterAll')],
              ['active', t('requests.filterActive')],
              ['offers', t('requests.filterOffers')],
              ['done', t('requests.filterDone')],
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
          <AlertTriangle size={36} color={colors.primary} />
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
        >
          {filteredItems.length === 0 && (
            <EmptyState
              icon={items.length === 0 ? <Inbox size={32} color={colors.textMuted} /> : <Search size={32} color={colors.textMuted} />}
              title={items.length === 0 ? t('requests.noRequests') : t('requests.noResult')}
              subtitle={items.length === 0 ? t('requests.noRequestsSub') : t('requests.noResultSub')}
              actionLabel={t('requests.createRequest')}
              onAction={() => router.push('/create-request')}
            />
          )}

          {filteredItems.map(it => {
            const st = STATUS_CONFIG[it.status] || { key: it.status, color: '#475569', bg: colors.slate100, dot: colors.textMuted }
            const catLabel = catMap[it.category]?.label || it.category
            const title = it.description
              ? `${catLabel} — ${it.description.slice(0, 30)}${it.description.length > 30 ? '…' : ''}`
              : catLabel
            return (
              <TouchableOpacity
                key={it._id}
                style={[s.card, ['cancelled', 'expired', 'completed'].includes(it.status) && s.cardDisabled]}
                activeOpacity={0.85}
                onPress={() => {
                  if (['cancelled', 'expired', 'completed'].includes(it.status)) {
                    return
                  }
                  if (['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'in_progress'].includes(it.status)) {
                    router.push(`/mission/${it._id}`)
                  } else {
                    router.push(`/offers/${it._id}`)
                  }
                }}
                disabled={['cancelled', 'expired', 'completed'].includes(it.status)}
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
                        {(it.unseenOfferCount ?? it.pendingOfferCount) > 0 && (
                          <View style={s.offerCountBadge}>
                            <Text style={s.offerCountText}>{it.unseenOfferCount ?? it.pendingOfferCount}</Text>
                          </View>
                        )}
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                          <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                          <Text style={[s.statusText, { color: st.color }]}>{t(st.key)}</Text>
                        </View>
                      </View>
                    </View>
                    {it.description ? (
                      <Text style={s.desc} numberOfLines={2}>{it.description}</Text>
                    ) : null}
                    <Text style={s.meta}>
                      {it.createdAt ? new Date(it.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : ''}
                      {it.budget ? ` • ${Number(it.budget).toLocaleString()} FCFA` : ''}
                    </Text>
                    {['created', 'pending_offers', 'broadcasted'].includes(it.status) && (
                      <TouchableOpacity
                        style={s.cancelBtn}
                        onPress={() => handleCancel(it._id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.cancelBtnText}>{t('requests.cancelRequest')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {['cancelled', 'expired', 'completed'].includes(it.status) ? null : (
                    <ChevronRight size={20} color="#CBD5E1" />
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate100 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCount: { backgroundColor: colors.infoLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  headerCountText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { color: colors.text },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  filters: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  filterChips: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.slate100, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  filterChipTextActive: { color: colors.surface },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  cardDisabled: { opacity: 0.6 },
  cardInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  catMonogram: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  catMonogramText: { fontSize: 13, fontWeight: '800', color: colors.surface },
  cardContent: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, lineHeight: 19 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  offerCountBadge: { backgroundColor: '#F97316', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  offerCountText: { fontSize: 11, fontWeight: '800', color: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errIcon: { color: colors.primary },
  errText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.navy, borderRadius: 14, ...shadows.sm },
  retryText: { color: colors.surface, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { backgroundColor: colors.navy, borderRadius: radius.lg, paddingHorizontal: 28, paddingVertical: 14, minHeight: 50, marginTop: 8, ...shadows.md },
  btnText: { color: colors.surface, fontWeight: '600', fontSize: 14 },
  offerIndicator: { backgroundColor: colors.warningLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#FDE68A' },
  offerIndicatorText: { fontSize: 10, fontWeight: '700', color: '#B45309' },
  cancelBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  cardArrow: { position: 'absolute', right: 14, top: '50%', color: '#CBD5E1' },
})

export default withScreenBoundary(MyRequests, 'MyRequests')
