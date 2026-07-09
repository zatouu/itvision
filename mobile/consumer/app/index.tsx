import { Text, View, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import * as Location from 'expo-location'
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { fetchWithCache } from '../src/storage'
import { connectSocket, requestOnlineProviders, onOnlineProvidersCount } from '../src/socket'
import TabBar from '../src/components/TabBar'
import { SkeletonCard } from '../src/components/Skeleton'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import EmptyState from '../src/components/EmptyState'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Logo from '../src/components/Logo'
import ProviderCard from '../src/components/ProviderCard'
import { colors, radius, shadows, spacing, typography } from '../src/design'
import { Bell, User, Plus, Inbox, ChevronRight, MapPin, Crosshair } from 'lucide-react-native'

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [onlineProviders, setOnlineProviders] = useState(0)
  const [liveProviders, setLiveProviders] = useState<Array<{
    providerId: string
    name?: string
    status: string
    lat: number
    lng: number
    distanceKm?: number | null
    etaMinutes?: number | null
  }>>([])
  const { t, i18n } = useTranslation()

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

  // Online providers count via WebSocket
  useEffect(() => {
    const socket = connectSocket()
    const unsub = onOnlineProvidersCount((data) => setOnlineProviders(data.count))
    requestOnlineProviders()
    const interval = setInterval(() => requestOnlineProviders(), 15000)
    return () => { unsub(); clearInterval(interval) }
  }, [])

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
    // Charger la position de l'utilisateur pour la carte home
    setMapLoading(true)
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
      .catch(() => { /* permission refusée ou indisponible */ })
      .finally(() => setMapLoading(false))
    // Charger les prestataires recommandés
    setLoadingRecommended(true)
    apiGet('/api/services/providers/top?limit=10')
      .then((res: any) => { if (res?.providers) setRecommended(res.providers) })
      .catch(() => {})
      .finally(() => setLoadingRecommended(false))
  }, [loadRecent])

  // Récupérer les providers en live pour les demandes actives
  useEffect(() => {
    const activeIds = recent
      .filter(it => it._id && !['completed', 'cancelled'].includes(it.status))
      .map(it => String(it._id))
    if (activeIds.length === 0) {
      setLiveProviders([])
      return
    }
    let mounted = true
    const fetchLive = async () => {
      const merged = new Map<string, typeof liveProviders[0]>()
      for (const id of activeIds) {
        try {
          const r: any = await apiGet(`/api/services/requests/${id}/live`)
          ;[...(r.viewers || []), ...(r.offerors || []), ...(r.assigned ? [r.assigned] : []), ...(r.nearby || [])]
            .filter((p: any) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
            .forEach((p: any) => {
              merged.set(String(p.providerId), {
                providerId: String(p.providerId),
                name: p.name,
                status: p.status || 'available',
                lat: Number(p.lat),
                lng: Number(p.lng),
                distanceKm: p.distanceKm ?? null,
                etaMinutes: p.etaMinutes ?? null,
              })
            })
        } catch {}
      }
      if (mounted) setLiveProviders(Array.from(merged.values()))
    }
    fetchLive()
    const interval = setInterval(fetchLive, 15000)
    return () => { mounted = false; clearInterval(interval) }
  }, [recent])

  const [recommended, setRecommended] = useState<any[]>([])
  const [loadingRecommended, setLoadingRecommended] = useState(false)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <Logo size={28} />
            <Text style={s.appName}>Xeuy Bi</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
              <Bell size={18} color={colors.text} />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/profile')} accessibilityLabel="Profil">
              {userName ? (
                <Text style={s.avatarText}>{userName.slice(0, 2).toUpperCase()}</Text>
              ) : (
                <User size={18} color={colors.surface} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour(t)}{userName ? `, ${userName}` : ''}</Text>
          <Text style={s.greetSub}>Que souhaitez-vous réparer aujourd'hui ?</Text>
        </View>

        {/* CTA Principal */}
        <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/create-request')} activeOpacity={0.88}>
          <View style={s.ctaLeft}>
            <Text style={s.ctaTitle}>Publier une demande</Text>
            <Text style={s.ctaSub}>Recevez des offres en quelques minutes</Text>
          </View>
          <View style={s.ctaPlus}>
            <Plus size={28} color={colors.surface} />
          </View>
        </TouchableOpacity>

        {/* Stats chips */}
        <View style={s.statsRow}>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')}>
            <View style={s.statDot}><View style={[s.statDotInner, { backgroundColor: colors.info }]} /></View>
            <Text style={s.statText}>{stats.active} demande active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')}>
            <View style={s.statDot}><View style={[s.statDotInner, { backgroundColor: colors.warning }]} /></View>
            <Text style={s.statText}>{stats.offers} offres reçues</Text>
            {stats.offers > 0 && <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Carte autour de vous */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.nearbyMap')}</Text>
          <TouchableOpacity onPress={() => loadRecent()}>
            <Crosshair size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={s.mapCard}>
          {Platform.OS === 'web' ? (
            <View style={s.mapPlaceholder}>
              <MapPin size={32} color="#94A3B8" />
              <Text style={s.mapPlaceholderText}>{t('home.mapWeb')}</Text>
            </View>
          ) : mapLoading || !userLocation ? (
            <View style={s.mapPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.mapPlaceholderText}>{mapLoading ? t('home.locating') : t('home.locationNeeded')}</Text>
            </View>
          ) : (
            <MapView
              provider={PROVIDER_DEFAULT}
              style={s.map}
              initialRegion={{
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
            >
              <Circle
                center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                radius={1500}
                strokeColor="rgba(37,99,235,0.4)"
                fillColor="rgba(37,99,235,0.06)"
                strokeWidth={2}
              />
              {liveProviders.map(p => {
                const statusColor =
                  p.status === 'arriving' || p.status === 'in_progress' || p.status === 'selected' ? '#2563EB'
                  : p.status === 'offered' ? '#F59E0B'
                  : p.status === 'viewing' ? '#10B981'
                  : '#64748B'
                const label = p.status === 'arriving' ? t('offers.statusArriving')
                  : p.status === 'in_progress' ? t('offers.statusInProgress')
                  : p.status === 'selected' ? t('offers.statusSelected')
                  : p.status === 'offered' ? t('offers.statusOffered')
                  : p.status === 'viewing' ? t('offers.statusViewing')
                  : t('offers.viewer')
                const sub = [p.distanceKm ? `${p.distanceKm} km` : null, p.etaMinutes ? `${p.etaMinutes} min` : null].filter(Boolean).join(' · ')
                return (
                  <Marker
                    key={p.providerId}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                  >
                    <View style={[s.providerMarker, { borderColor: statusColor }]}>
                      <Text style={[s.providerMarkerText, { color: statusColor }]}>{(p.name || 'P').slice(0, 1).toUpperCase()}</Text>
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
          {onlineProviders > 0 && (
            <View style={s.onlineBadge}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>{t('home.providersOnline', { count: onlineProviders })}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.mapFab}
            onPress={() => router.push('/create-request')}
            activeOpacity={0.88}
          >
            <Plus size={18} color={colors.surface} />
            <Text style={s.mapFabText}>{t('home.newRequest')}</Text>
          </TouchableOpacity>
        </View>

        {/* Catégories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Catégories</Text>
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
                {(() => { const Icon = getCategoryIcon(c.id); return <Icon size={20} color="#fff" /> })()}
              </View>
              <Text style={s.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activité récente */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Activité récente</Text>
          {recent.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/my-requests')}>
              <Text style={s.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          )}
        </View>

        {loadingRecent && recent.length === 0 ? (
          <View style={{ gap: 10, paddingHorizontal: spacing.lg }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recent.length === 0 ? (
          <View style={{ marginHorizontal: spacing.lg }}>
            <EmptyState
              icon={<Inbox size={32} color="#94A3B8" />}
              title={t('home.noRequestsTitle')}
              subtitle={t('home.noRequestsSub')}
              actionLabel={t('home.createRequest')}
              onAction={() => router.push('/create-request')}
            />
          </View>
        ) : (
          recent.map(it => {
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
                <ChevronRight size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )
          })
        )}

        {/* Prestataires recommandés — affichés uniquement si données réelles */}
        {recommended.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Prestataires recommandés près de vous</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              {recommended.map((p, i) => (
                <ProviderCard
                  key={i}
                  name={p.name}
                  rating={p.rating?.avg ?? 0}
                  jobCount={p.completedMissions ?? 0}
                  jobLabel={t('home.missions')}
                  specialty={p.rating?.count ? `${p.rating.count} avis` : t('home.newProvider')}
                  verified={p.completedMissions > 0}
                />
              ))}
            </ScrollView>
          </>
        )}

      </ScrollView>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appName: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  iconBtnText: { color: colors.text },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  avatarBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  greeting: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  greetTitle: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
  greetSub: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  ctaCard: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.navy, padding: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.lg },
  ctaLeft: { flex: 1 },
  ctaTitle: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.surface, marginBottom: 4 },
  ctaSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  ctaPlus: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.md },
  ctaPlusText: { color: colors.surface },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xxl },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  statText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text, flex: 1 },
  statDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  statDotInner: { width: 5, height: 5, borderRadius: 2.5 },
  newBadge: { backgroundColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  newBadgeText: { fontSize: 9, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  recentCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, ...shadows.sm },
  recentMonogram: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentMonogramText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  recentInfo: { flex: 1, gap: 4 },
  recentTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  recentStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentDot: { width: 6, height: 6, borderRadius: 3 },
  recentStatusText: { fontSize: 12, fontWeight: typography.weight.semibold as any },
  recentArrow: { color: colors.textMuted },
  mapCard: { marginHorizontal: spacing.lg, height: 220, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bg },
  mapPlaceholderText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  mapMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#475569', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF', ...shadows.md },
  mapMarkerText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  providerMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, ...shadows.md },
  providerMarkerText: { fontSize: 13, fontWeight: typography.weight.extrabold as any },
  providerMarkerTail: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -3 },
  providerMarkerCallout: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 4, ...shadows.md, alignSelf: 'center', marginBottom: 6, minWidth: 80 },
  providerMarkerStatus: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  providerMarkerSub: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  onlineBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.md },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.text },
  mapFab: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, ...shadows.md },
  mapFabText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  catCard: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  catMonogram: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  catMonogramText: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  catLabel: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },
})

export default withScreenBoundary(Home, 'Home')
