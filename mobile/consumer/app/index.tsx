import { Text, View, TouchableOpacity, ScrollView, StyleSheet, Modal, Animated, Dimensions, Platform, Share } from 'react-native'
import { useEffect, useState, useCallback, useRef } from 'react'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { fetchWithCache } from '../src/storage'
import TabBar from '../src/components/TabBar'
import { SkeletonCard } from '../src/components/Skeleton'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import EmptyState from '../src/components/EmptyState'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { clearAuth, getAuthUser } from '../src/auth'
import { resetSocket } from '../src/socket'
import { resetNotificationBinding } from '../src/notifications'
import LanguagePicker from '../src/components/LanguagePicker'

const { width: SCREEN_W } = Dimensions.get('window')
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320)

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  created:        { label: 'Publiée',           color: '#2563EB', dot: '#2563EB' },
  pending_offers: { label: 'Offres reçues',     color: '#B45309', dot: '#D97706' },
  assigned:          { label: 'Prestataire assigné', color: '#065F46', dot: '#059669' },
  provider_arriving: { label: 'En route',            color: '#0369A1', dot: '#0EA5E9' },
  in_progress:       { label: 'En cours',            color: '#5B21B6', dot: '#7C3AED' },
  completed:      { label: 'Terminée',          color: '#475569', dot: '#94A3B8' },
  cancelled:      { label: 'Annulée',           color: '#991B1B', dot: '#DC2626' },
}

type CatItem = { id: string; label: string; abbr: string; color: string }

const FALLBACK_CATS: CatItem[] = [
  { id: 'electricite', label: 'Électricité', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Sécurité', abbr: 'SE', color: '#065F46' },
]

function greetingByHour(t: any): string {
  const h = new Date().getHours()
  if (h < 5) return t('home.greeting_night')
  if (h < 12) return t('home.greeting_morning')
  if (h < 18) return t('home.greeting_afternoon')
  return t('home.greeting_evening')
}

function Home() {
  const [recent, setRecent] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, offers: 0 })
  const [userName, setUserName] = useState<string>('')
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [cats, setCats] = useState<CatItem[]>(FALLBACK_CATS)
  const [recommended, setRecommended] = useState<any[]>([])
  const { t, i18n } = useTranslation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerX = useRef(new Animated.Value(-DRAWER_W)).current
  const [user, setUser] = useState(getAuthUser())

  const applyItems = useCallback((items: any[]) => {
    setRecent(items.slice(0, 3))
    setStats({
      active: items.filter((it: any) => !['completed', 'cancelled'].includes(it.status)).length,
      offers: items.filter((it: any) => it.pendingOfferCount > 0).length,
    })
  }, [])

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      await fetchWithCache(
        'home-requests',
        () => apiGet('/api/services/requests?mine=1').then(r => r.items || []),
        (items) => applyItems(items)
      )
    } catch { /* silencieux */ }
    finally { setLoadingRecent(false) }
  }, [applyItems])

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
    loadRecent()
    // Charger les catégories dynamiques
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({ id: c.slug, label: getCategoryLabel(c, i18n.language), abbr: c.abbr, color: c.color })))
    }).catch(() => {})
    // Charger le prénom utilisateur
    apiGet('/api/client/profile')
      .then((res: any) => {
        const name = res?.profile?.name
        if (name) setUserName(name.split(' ')[0])
      })
      .catch(() => { /* silencieux */ })
    // Prestataires recommandés
    apiGet('/api/services/providers/recommended').then((res: any) => {
      setRecommended((res.items || res.providers || []).slice(0, 5))
    }).catch(() => { /* silencieux */ })
  }, [loadRecent])

  const openDrawer = () => {
    setDrawerOpen(true)
    Animated.timing(drawerX, { toValue: 0, duration: 220, useNativeDriver: true }).start()
  }
  const closeDrawer = () => {
    Animated.timing(drawerX, { toValue: -DRAWER_W, duration: 200, useNativeDriver: true }).start(() => setDrawerOpen(false))
  }
  const logout = async () => {
    closeDrawer()
    await clearAuth()
    resetSocket()
    resetNotificationBinding()
    router.replace('/login')
  }

  const MENU = [
    { icon: 'H', label: t('home.history'), action: () => { closeDrawer(); router.push('/my-requests') } },
    { icon: 'P', label: t('home.payments'), action: () => { closeDrawer(); router.push('/wallet') } },
    { icon: 'S', label: t('home.settings'), action: () => { closeDrawer(); router.push('/profile') } },
    { icon: '?', label: t('home.help'), action: () => { closeDrawer(); Share.share({ message: 'Support Xeuy Bi: contact@xeuy.sn' }) } },
  ]

  const activeMission = recent.find(it => ['assigned', 'provider_arriving', 'in_progress'].includes(it.status))

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBlock}>
            <View style={s.logoDot} />
            <Text style={s.logoText}>Xeuy Bi</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
              <Text style={s.iconBtnText}>N</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.hamburgerBtn} onPress={openDrawer} accessibilityLabel={t('home.menuTitle')}>
              <Text style={s.hamburgerIcon}>≡</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour(t)}{userName ? `, ${userName}` : ''}</Text>
          <Text style={s.greetSub}>{t('home.greetSub')}</Text>
        </View>

        {/* Mission active */}
        {activeMission && (
          <TouchableOpacity
            style={s.activeMissionCard}
            activeOpacity={0.88}
            onPress={() => router.push(`/mission/${activeMission._id}`)}
          >
            <View style={s.activeMissionLeft}>
              <Text style={s.activeMissionLabel}>{t('home.activeMission')}</Text>
              <Text style={s.activeMissionTitle} numberOfLines={1}>
                {activeMission.description
                  ? `${activeMission.category || ''} — ${activeMission.description.slice(0, 30)}${activeMission.description.length > 30 ? '…' : ''}`
                  : activeMission.category || ''}
              </Text>
            </View>
            <View style={s.activeMissionCta}>
              <Text style={s.activeMissionCtaText}>{t('home.viewMission')}</Text>
              <Text style={s.activeMissionArrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* CTA Principal */}
        <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/create-request')} activeOpacity={0.88}>
          <View style={s.ctaLeft}>
            <Text style={s.ctaTitle}>{t('home.publishRequest')}</Text>
            <Text style={s.ctaSub}>{t('home.publishRequestSub')}</Text>
          </View>
          <View style={s.ctaPlus}>
            <Text style={s.ctaPlusText}>+</Text>
          </View>
        </TouchableOpacity>

        {/* Stats cliquables */}
        <View style={s.statsRow}>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')} activeOpacity={0.85}>
            <View style={[s.statIcon, { backgroundColor: '#EFF6FF' }]}><Text style={[s.statIconText, { color: '#3B82F6' }]}>D</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.statText}>{t('home.activeRequests', { count: stats.active })}</Text>
            </View>
            <View style={s.statDotBlue} />
          </TouchableOpacity>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')} activeOpacity={0.85}>
            <View style={[s.statIcon, { backgroundColor: '#FFFBEB' }]}><Text style={[s.statIconText, { color: '#D97706' }]}>O</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.statText}>{t('home.offersReceived', { count: stats.offers })}</Text>
            </View>
            {stats.offers > 0 && (
              <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>
            )}
            <View style={s.statDotAmber} />
          </TouchableOpacity>
        </View>

        {/* Activité récente */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.recentActivity')}</Text>
        </View>

        {loadingRecent && recent.length === 0 ? (
          <View style={{ gap: 10, paddingHorizontal: 20 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recent.length === 0 ? (
          <EmptyState
            icon=""
            title={t('home.noRequestsTitle')}
            subtitle={t('home.noRequestsSub')}
            actionLabel={t('home.createRequest')}
            onAction={() => router.push('/create-request')}
          />
        ) : (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            {recent.map(it => {
              const st = STATUS_LABEL[it.status] || { label: it.status, color: '#64748B', dot: '#94A3B8' }
              const catMatch = cats.find(c => c.id === it.category)
              const abbr = catMatch?.abbr || it.category?.slice(0,2).toUpperCase()
              const color = catMatch?.color || '#475569'
              const catLabel = catMatch?.label || it.category
              const title = it.description
                ? `${catLabel} — ${it.description.slice(0, 28)}${it.description.length > 28 ? '…' : ''}`
                : catLabel
              return (
                <TouchableOpacity
                  key={it._id}
                  style={s.recentCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (['assigned', 'provider_arriving', 'in_progress', 'completed'].includes(it.status)) {
                      router.push(`/mission/${it._id}`)
                    } else {
                      router.push({ pathname: '/request-offers', params: { id: it._id } })
                    }
                  }}
                >
                  <View style={[s.recentMonogram, { backgroundColor: color }]}>
                    <Text style={s.recentMonogramText}>{abbr}</Text>
                  </View>
                  <View style={s.recentInfo}>
                    <Text style={s.recentTitle} numberOfLines={1}>{title}</Text>
                    <View style={s.recentStatus}>
                      <View style={[s.recentDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.recentStatusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={s.recentArrow}>›</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {recent.length > 0 && (
          <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/my-requests')}>
            <Text style={s.seeAllText}>{t('home.seeAllRequests')}</Text>
          </TouchableOpacity>
        )}

        {/* Prestataires recommandés */}
        {recommended.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('home.recommendedProviders')}</Text>
              <TouchableOpacity onPress={() => router.push('/create-request')}>
                <Text style={s.seeAllText}>{t('home.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recommendedList}>
              {recommended.map((p: any, idx: number) => {
                const initials = (p.name || p.providerName || 'P').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                const color = p.categoryColor || '#0F7B4F'
                return (
                  <View key={p._id || idx} style={s.providerCard}>
                    <View style={[s.providerAvatar, { backgroundColor: color }]}>
                      <Text style={s.providerAvatarText}>{initials}</Text>
                    </View>
                    <Text style={s.providerName} numberOfLines={1}>{p.name || p.providerName}</Text>
                    <View style={s.providerRating}>
                      <Text style={s.providerStar}>★</Text>
                      <Text style={s.providerRatingText}>{p.rating?.avg || p.avgRating || 0} ({p.rating?.count || p.reviewCount || 0})</Text>
                    </View>
                    <Text style={s.providerMeta}>{p.category || p.specialty || ''}</Text>
                  </View>
                )
              })}
            </ScrollView>
          </>
        )}

        {/* Catégories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.categories')}</Text>
        </View>
        <View style={s.catGrid}>
          {cats.map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.catCard}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/create-request', params: { category: c.id } })}
            >
              <View style={[s.catMonogram, { backgroundColor: c.color }]}>
                <Text style={s.catMonogramText}>{c.abbr}</Text>
              </View>
              <Text style={s.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Drawer latéral gauche */}
      <Modal
        transparent
        visible={drawerOpen}
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={s.drawerOverlay}>
          <TouchableOpacity style={s.drawerBackdrop} activeOpacity={1} onPress={closeDrawer} />
          <Animated.View style={[s.drawer, { transform: [{ translateX: drawerX }] }]}>
            <View style={s.drawerHeader}>
              <View style={s.drawerAvatar}>
                <Text style={s.drawerAvatarText}>{user?.name ? user.name.slice(0, 2).toUpperCase() : '??'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.drawerName}>{user?.name || userName || 'Xeuy Bi'}</Text>
                <Text style={s.drawerPhone}>{user?.phone || ''}</Text>
              </View>
              <TouchableOpacity style={s.drawerClose} onPress={closeDrawer}>
                <Text style={s.drawerCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={s.drawerMenu}>
              {MENU.map((m, idx) => (
                <TouchableOpacity key={idx} style={s.drawerItem} onPress={m.action}>
                  <View style={s.drawerItemIcon}><Text style={s.drawerItemIconText}>{m.icon}</Text></View>
                  <Text style={s.drawerItemText}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.drawerLanguage}>
              <Text style={s.drawerLanguageLabel}>{t('profile.language')}</Text>
              <LanguagePicker />
            </View>

            <TouchableOpacity style={s.drawerLogout} onPress={logout}>
              <Text style={s.drawerLogoutText}>{t('auth.logout')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  hamburgerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  hamburgerIcon: { fontSize: 26, color: '#0F172A', fontWeight: '300', lineHeight: 28 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  iconBtnText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  avatarChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  greeting: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greetTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  greetSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  activeMissionCard: { marginHorizontal: 20, marginBottom: 14, borderRadius: 18, backgroundColor: '#ECFDF5', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#A7F3D0' },
  activeMissionLeft: { flex: 1, gap: 3 },
  activeMissionLabel: { fontSize: 11, fontWeight: '800', color: '#065F46', textTransform: 'uppercase', letterSpacing: 0.6 },
  activeMissionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  activeMissionCta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeMissionCtaText: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  activeMissionArrow: { fontSize: 16, color: '#065F46', fontWeight: '700' },
  ctaCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 18, backgroundColor: '#0F172A', padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaLeft: { flex: 1 },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  ctaSub: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  ctaPlus: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  ctaPlusText: { fontSize: 24, color: '#fff', lineHeight: 28, fontWeight: '300' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  statDotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  statDotAmber: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' },
  sectionRow: { paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  recentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  recentMonogram: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentMonogramText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  recentInfo: { flex: 1, gap: 5 },
  recentTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  recentStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentDot: { width: 6, height: 6, borderRadius: 3 },
  recentStatusText: { fontSize: 12, fontWeight: '700' },
  recentArrow: { fontSize: 20, color: '#CBD5E1' },
  seeAllBtn: { marginHorizontal: 20, marginBottom: 20, marginTop: 4 },
  seeAllText: { fontSize: 13, color: '#2563EB', fontWeight: '700', textAlign: 'right' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  catCard: { width: '30.5%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  catMonogram: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catMonogramText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  catLabel: { fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'center' },

  // ── Header logo ──
  logoBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#0F7B4F', transform: [{ rotate: '45deg' }] },
  logoText: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },

  // ── Stats ──
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 13, fontWeight: '800' },
  newBadge: { backgroundColor: '#0F172A', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // ── Prestataires recommandés ──
  recommendedList: { paddingHorizontal: 20, gap: 10, paddingBottom: 8 },
  providerCard: { width: 140, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  providerAvatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  providerAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  providerName: { fontSize: 14, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  providerRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 },
  providerStar: { fontSize: 12, color: '#F59E0B' },
  providerRatingText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  providerMeta: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },

  // ── Drawer ──
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  drawer: { width: DRAWER_W, height: '100%', backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  drawerAvatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  drawerAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  drawerName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  drawerPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },
  drawerClose: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  drawerCloseText: { fontSize: 24, color: '#64748B', lineHeight: 26, fontWeight: '300' },
  drawerMenu: { gap: 4 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderRadius: 12, paddingHorizontal: 12 },
  drawerItemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  drawerItemIconText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  drawerItemText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  drawerLanguage: { marginTop: 24, padding: 14, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  drawerLanguageLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  drawerLogout: { marginTop: 'auto', backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  drawerLogoutText: { color: '#B91C1C', fontWeight: '800', fontSize: 15 },
})

export default withScreenBoundary(Home, 'Home')
