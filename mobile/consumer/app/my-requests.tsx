import { useEffect, useState, useCallback, useMemo } from 'react'

import { colors, shadows } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPatch } from '../src/api'
import { confirm, notify } from '../src/confirm'
import { fetchWithCache, cacheClear } from '../src/storage'
import { connectSocket } from '../src/socket'
import { humanErrorMessage } from '../src/errorMessages'
import { SkeletonCard } from '../src/components/Skeleton'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import EmptyState from '../src/components/EmptyState'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { hapticWarning } from '../src/haptics'
import { Plus, AlertTriangle, Inbox, Search, ChevronRight, Menu, CheckCircle2, CalendarClock } from 'lucide-react-native'
import SideMenu from '../src/components/SideMenu'
import { formatSlot } from '../src/components/SchedulePicker'

const ACTIVE_MISSION_STATUSES = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']

const STATUS_CONFIG: Record<string, { key: string; color: string; bg: string; dot: string }> = {
  created:       { key: 'requests.status_created',            color: '#2563EB', bg: colors.infoLight, dot: '#2563EB' },
  broadcasted:   { key: 'requests.status_broadcasted',        color: '#2563EB', bg: colors.infoLight, dot: '#2563EB' },
  pending_offers:{ key: 'requests.status_pending_offers',      color: '#B45309', bg: colors.warningLight, dot: '#D97706' },
  accepted:          { key: 'requests.status_assigned', color: '#065F46', bg: '#ECFDF5', dot: '#059669' },
  assigned:          { key: 'requests.status_assigned', color: '#065F46', bg: '#ECFDF5', dot: '#059669' },
  on_the_way:        { key: 'mission.arriving',                 color: '#0369A1', bg: colors.infoLight, dot: '#0EA5E9' },
  provider_arriving: { key: 'requests.status_provider_arriving',            color: '#0369A1', bg: colors.infoLight, dot: '#0EA5E9' },
  arrived:           { key: 'mission.arrived',                  color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED' },
  in_progress:       { key: 'requests.status_in_progress',            color: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED' },
  paused:            { key: 'mission.paused',                   color: '#B45309', bg: colors.warningLight, dot: '#D97706' },
  awaiting_validation:{ key: 'mission.awaitingValidation',      color: '#B45309', bg: colors.warningLight, dot: '#D97706' },
  dispute:           { key: 'mission.dispute',                  color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  completed:     { key: 'requests.status_completed',           color: '#374151', bg: colors.slate100, dot: colors.textSecondary },
  cancelled:     { key: 'requests.status_cancelled',            color: '#991B1B', bg: '#FEF2F2', dot: '#DC2626' },
  expired:       { key: 'requests.status_expired',              color: '#6B7280', bg: colors.slate100, dot: '#9CA3AF' },
}

type CatEntry = { abbr: string; color: string; label: string }

function MyRequests() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
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
      const code = e?.code || ''
      if (code === 'ALREADY_CANCELLED' || code === 'ALREADY_COMPLETED' || code === 'ALREADY_EXPIRED') {
        notify('Demande déjà clôturée', '')
        load(true)
      } else {
        notify(t('common.error'), humanErrorMessage(e))
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

  const awaitingValidationItems = useMemo(() => items.filter(it => it.status === 'awaiting_validation'), [items])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(it => {
      const matchesStatus =
        (statusFilter === 'all' && !['completed', 'cancelled', 'expired'].includes(it.status))
        || (statusFilter === 'active' && ACTIVE_MISSION_STATUSES.includes(it.status))
        || (statusFilter === 'offers' && (it.status === 'pending_offers' || it.pendingOfferCount > 0))
        || (statusFilter === 'done' && ['completed', 'cancelled', 'expired'].includes(it.status))
      const catLabel = catMap[it.category]?.label || it.category || ''
      const haystack = `${catLabel} ${it.category || ''} ${it.description || ''} ${it.budget || ''} ${it.status}`.toLowerCase()
      return matchesStatus && (!q || haystack.includes(q))
    })
  }, [items, query, statusFilter])

  const activeCount = items.filter(it => ACTIVE_MISSION_STATUSES.includes(it.status)).length
  const offersCount = items.filter(it => it.status === 'pending_offers' || it.pendingOfferCount > 0).length
  const doneCount = items.filter(it => ['completed', 'cancelled', 'expired'].includes(it.status)).length
  const openCount = items.length - doneCount
  const FILTER_DEFS = [
    { key: 'all', label: t('requests.filterAll'), count: openCount },
    { key: 'active', label: t('requests.filterActive'), count: activeCount },
    { key: 'offers', label: t('requests.filterOffers'), count: offersCount },
    { key: 'done', label: t('requests.filterDone'), count: doneCount },
  ] as const

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.iconBtn} accessibilityLabel="Menu">
          <Menu size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={s.headerLeft}>
          <Text style={s.title}>{t('requests.title')}</Text>
          {items.length > 0 && (
            <Text style={s.subtitle}>
              {activeCount} {t('requests.subActive', { defaultValue: 'en cours' })} · {doneCount} {t('requests.subDone', { defaultValue: 'terminées' })}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => setSearchOpen(v => !v)} style={s.iconBtn} accessibilityLabel={t('requests.searchPlaceholder')}>
            <Search size={17} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/create-request')} style={[s.iconBtn, s.iconBtnPrimary]} accessibilityLabel={t('requests.createRequest')}>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {items.length > 0 && (
        <View style={s.filters}>
          {searchOpen && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('requests.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={s.searchInput}
              autoFocus
            />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChips}>
            {FILTER_DEFS.map(f => {
              const active = statusFilter === f.key
              return (
                <TouchableOpacity key={f.key} style={[s.filterChip, active && s.filterChipActive]} onPress={() => setStatusFilter(f.key)}>
                  <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{f.label}</Text>
                  {f.count > 0 && (
                    <View style={[s.filterCount, active && s.filterCountActive]}>
                      <Text style={[s.filterCountText, active && { color: colors.primary }]}>{f.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      )}

      {/* Alerte validation en attente */}
      {awaitingValidationItems.length > 0 && (
        <TouchableOpacity
          style={s.validationAlert}
          activeOpacity={0.8}
          onPress={() => router.push(`/mission/${awaitingValidationItems[0]._id}`)}
        >
          <View style={s.validationAlertIcon}>
            <CheckCircle2 size={20} color="#92400E" />
          </View>
          <Text style={s.validationAlertText}>
            {t('requests.awaitingValidationAlert', { count: awaitingValidationItems.length })}
          </Text>
          <ChevronRight size={18} color="#B45309" />
        </TouchableOpacity>
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
            const st = STATUS_CONFIG[it.status] || { key: 'requests.status_created', color: '#475569', bg: colors.slate100, dot: colors.textMuted }
            const catLabel = catMap[it.category]?.label || it.category
            const offerCount = it.unseenOfferCount ?? it.pendingOfferCount
            const title = it.description
              ? `${catLabel} — ${it.description.slice(0, 30)}${it.description.length > 30 ? '…' : ''}`
              : catLabel
            const providerName = it.acceptedOffer?.providerName
            const providerIni = (providerName || '').trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <TouchableOpacity
                key={it._id}
                style={[s.card, ['cancelled', 'expired', 'completed'].includes(it.status) && s.cardDisabled, it.status === 'awaiting_validation' && s.cardAwaitingValidation]}
                activeOpacity={0.85}
                onPress={() => {
                  if (ACTIVE_MISSION_STATUSES.includes(it.status)) {
                    router.push(`/mission/${it._id}`)
                  } else {
                    router.push(`/offers/${it._id}`)
                  }
                }}
              >
                {/* Icône catégorie + badge offres */}
                <View style={{ position: 'relative', flexShrink: 0 }}>
                  <View style={[s.catIcon, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                    <Text style={s.catIconText}>{catMap[it.category]?.abbr || it.category?.slice(0,2).toUpperCase()}</Text>
                  </View>
                  {offerCount > 0 && (
                    <View style={s.iconBadge}>
                      <Text style={s.iconBadgeText}>{offerCount}</Text>
                    </View>
                  )}
                </View>
                {/* Content */}
                <View style={s.cardContent}>
                  <View style={s.cardTitleRow}>
                    <Text style={s.cardTitle} numberOfLines={1}>{title}</Text>
                    <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                      <View style={[s.statusDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.statusText, { color: st.color }]}>{t(st.key)}</Text>
                    </View>
                  </View>
                  <Text style={s.meta} numberOfLines={1}>
                    <Text style={s.metaRef}>#{String(it._id).slice(-6).toUpperCase()}</Text>
                    {'  ·  '}
                    {it.createdAt ? new Date(it.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : ''}
                    {it.budget ? ` · ${Number(it.budget).toLocaleString()} FCFA` : ''}
                  </Text>
                  {providerName ? (
                    <View style={s.providerLine}>
                      <View style={[s.providerAvatar, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                        <Text style={s.providerAvatarText}>{providerIni}</Text>
                      </View>
                      <Text style={s.providerName} numberOfLines={1}>{providerName}</Text>
                      <Text style={s.providerExtra} numberOfLines={1}>
                        {' · '}{it.status === 'on_the_way' || it.status === 'provider_arriving' ? t('mission.arriving') : it.acceptedOffer?.price ? `${Number(it.acceptedOffer.price).toLocaleString()} FCFA` : ''}
                      </Text>
                    </View>
                  ) : offerCount > 0 ? (
                    <Text style={s.offersExtra}>{t('requests.toReview', { defaultValue: 'À examiner' })}</Text>
                  ) : null}
                  {it.scheduledFor && new Date(it.scheduledFor).getTime() > Date.now() && (
                    <View style={s.scheduledChip}>
                      <CalendarClock size={12} color={colors.info} />
                      <Text style={s.scheduledChipText}>
                        {t('requests.scheduledAt', { defaultValue: 'Programmée' })} · {formatSlot(it.scheduledFor, i18n.language)}
                      </Text>
                    </View>
                  )}
                  {it.status === 'awaiting_validation' && (
                    <View style={s.validationBanner}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.validationBannerTitle}>{t('requests.awaitingValidationBannerTitle')}</Text>
                        <Text style={s.validationBannerSub}>{t('requests.awaitingValidationBannerSub')}</Text>
                      </View>
                      <TouchableOpacity
                        style={s.validateNowBtn}
                        onPress={() => router.push(`/mission/${it._id}`)}
                        activeOpacity={0.8}
                      >
                        <CheckCircle2 size={14} color={colors.surface} />
                        <Text style={s.validateNowBtnText}>{t('requests.validateNow')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
                <ChevronRight size={18} color={colors.textDim} />
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
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, backgroundColor: colors.bg, gap: 10 },
  headerLeft: { flex: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  filters: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, gap: 10 },
  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 14 },
  filterChips: { gap: 8, paddingRight: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },
  filterCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterCountActive: { backgroundColor: '#fff' },
  filterCountText: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.xs },
  cardDisabled: { opacity: 0.65 },
  cardAwaitingValidation: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  validationAlert: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 16, paddingVertical: 12 },
  validationAlertIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },
  validationAlertText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#92400E' },
  validationBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A', padding: 10 },
  validationBannerTitle: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  validationBannerSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
  validateNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D97706', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  validateNowBtnText: { fontSize: 12, fontWeight: '800', color: colors.surface },
  catIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catIconText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  iconBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.warning, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  iconBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  cardContent: { flex: 1, minWidth: 0, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.ink },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10.5, fontWeight: '700' },
  meta: { fontSize: 11, color: colors.textMuted },
  metaRef: { fontWeight: '700', color: colors.textMuted },
  providerLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  providerAvatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  providerAvatarText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  providerName: { fontSize: 11.5, fontWeight: '700', color: colors.text },
  providerExtra: { fontSize: 11, color: colors.textMuted, flexShrink: 1 },
  offersExtra: { fontSize: 11.5, color: '#B45309', fontWeight: '600', marginTop: 4 },
  scheduledChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 6, backgroundColor: colors.infoLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  scheduledChipText: { fontSize: 11.5, fontWeight: '700', color: colors.info },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.navy, borderRadius: 14, ...shadows.sm },
  retryText: { color: colors.surface, fontWeight: '600' },
  cancelBtn: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
})

export default withScreenBoundary(MyRequests, 'MyRequests')
