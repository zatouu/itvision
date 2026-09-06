import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { getAuthUser } from '../src/auth'
import { fetchWithCache } from '../src/storage'
import { connectSocket, requestOnlineProviders, onOnlineProvidersCount } from '../src/socket'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { loadNotifications, subscribeNotifications, unreadCount } from '../src/notifications'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Logo from '../src/components/Logo'
import MissionHero from '../src/components/home/MissionHero'
import EmptyHero from '../src/components/home/EmptyHero'
import OffersHero from '../src/components/home/OffersHero'
import NearbyStrip from '../src/components/home/NearbyStrip'
import Skeleton from '../src/components/Skeleton'
import { colors, radius, spacing, typography } from '../src/design'
import { BellRing, ChevronRight, Zap, Menu, Star, LucideIcon } from 'lucide-react-native'
import { pickOption } from '../src/option-sheet'
import SideMenu from '../src/components/SideMenu'

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  created:           { label: 'Publiée',              color: '#2563EB', dot: '#2563EB' },
  pending_offers:    { label: 'Offres reçues',        color: '#B45309', dot: '#D97706' },
  accepted:          { label: 'Prestataire assigné',  color: '#065F46', dot: '#059669' },
  assigned:          { label: 'Prestataire assigné',  color: '#065F46', dot: '#059669' },
  on_the_way:        { label: 'En route',             color: '#0369A1', dot: '#0EA5E9' },
  provider_arriving: { label: 'En route',             color: '#0369A1', dot: '#0EA5E9' },
  in_progress:       { label: 'En cours',             color: '#5B21B6', dot: '#7C3AED' },
  completed:         { label: 'Terminée',             color: '#475569', dot: colors.textMuted },
  cancelled:         { label: 'Annulée',              color: '#991B1B', dot: '#DC2626' },
}

const ACTIVE_STATUSES = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'in_progress']
const MISSION_ROUTE_STATUSES = [...ACTIVE_STATUSES, 'completed']
// Most actionable status first when picking the hero mission
const STATUS_RANK: Record<string, number> = {
  in_progress: 4, provider_arriving: 3, on_the_way: 3, accepted: 2, assigned: 2,
}

type CatItem = { id: string; label: string; abbr: string; color: string }

const FALLBACK_CATS: CatItem[] = [
  { id: 'electricite', label: 'Electricite', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Securite', abbr: 'SE', color: '#065F46' },
  { id: 'maconnerie', label: 'Maçonnerie', abbr: 'MA', color: '#78350F' },
  { id: 'nettoyage', label: 'Nettoyage', abbr: 'NE', color: '#0D9488' },
]

function greetingByHour(t: any): string {
  const h = new Date().getHours()
  if (h < 5) return t('home.greeting_night')
  if (h < 12) return t('home.greeting_morning')
  if (h < 18) return t('home.greeting_afternoon')
  return t('home.greeting_evening')
}

function isPhoneLike(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  return /^\+?[\d\s]{7,}$/.test(s.trim()) || digits.length >= 9
}

function formatPhone(phone?: string, full = true): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 9) {
    const local = digits.slice(-9)
    const prefix = digits.slice(0, -9)
    const localFormatted = local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')
    return full ? `${prefix ? '+' + prefix + ' ' : ''}${localFormatted}` : localFormatted
  }
  return phone
}

function getInitials(raw: string): string {
  if (!raw) return '?'
  const trimmed = raw.trim()
  if (isPhoneLike(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    return digits.slice(-2).toUpperCase() || '?'
  }
  return trimmed.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Home() {
  const [recent, setRecent] = useState<any[]>([])
  const [userName, setUserName] = useState<string>(() => {
    const authUser = getAuthUser()
    const n = authUser?.name?.trim() || ''
    return n && !/^\d{7,}$/.test(n) ? n.split(' ')[0] : ''
  })
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [cats, setCats] = useState<CatItem[]>(FALLBACK_CATS)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [onlineProviders, setOnlineProviders] = useState(0)
  const [urgentEligibility, setUrgentEligibility] = useState<{
    eligible: boolean
    count: number
    bestEta: number | null
    radiusKm: number
    maxEta: number
  } | null>(null)
  const [unread, setUnread] = useState(0)
  const [liveProviders, setLiveProviders] = useState<Array<{
    providerId: string
    name?: string
    status: string
    lat: number
    lng: number
    distanceKm?: number | null
    etaMinutes?: number | null
  }>>([])
  const [recommended, setRecommended] = useState<any[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const applyItems = useCallback((items: any[]) => {
    setRecent(items.slice(0, 10))
  }, [])

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      await fetchWithCache(
        'home-requests',
        () => apiGet('/api/services/requests?mine=1').then(r => r.items || []),
        (items) => applyItems(items)
      )
    } catch { /* silent */ }
    finally { setLoadingRecent(false) }
  }, [applyItems])

  useEffect(() => {
    const socket = connectSocket()
    const unsub = onOnlineProvidersCount((data) => setOnlineProviders(data.count))
    requestOnlineProviders()
    const interval = setInterval(() => requestOnlineProviders(), 15000)
    // Temps réel : offres et changements de statut
    const refresh = () => loadRecent()
    socket.on('user:offer-received', refresh)
    socket.on('user:request-assigned', refresh)
    socket.on('request:status-changed', refresh)
    return () => {
      unsub()
      clearInterval(interval)
      socket.off('user:offer-received', refresh)
      socket.off('user:request-assigned', refresh)
      socket.off('request:status-changed', refresh)
    }
  }, [loadRecent])

  useEffect(() => {
    let mounted = true
    loadNotifications().then(() => { if (mounted) setUnread(unreadCount()) })
    const unsubscribe = subscribeNotifications(() => {
      if (mounted) setUnread(unreadCount())
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadRecent()
    }, [loadRecent])
  )

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
    loadRecent()
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({ id: c.slug, label: getCategoryLabel(c, i18n.language), abbr: c.abbr, color: c.color })))
    }).catch(() => {})
    apiGet('/api/client/profile')
      .then((res: any) => {
        const name = res?.profile?.name
        if (name && name.trim() && !/^\d{7,}$/.test(name.trim())) setUserName(name.split(' ')[0])
      })
      .catch(() => {})
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
      .catch(() => {})
    apiGet('/api/services/providers/top?limit=10')
      .then((res: any) => { if (res?.providers) setRecommended(res.providers) })
      .catch(() => {})
  }, [loadRecent])

  useEffect(() => {
    let mounted = true
    const fetchLive = async () => {
      const merged = new Map<string, typeof liveProviders[0]>()

      // 1) Toujours récupérer les prestataires autour de l'utilisateur (live count)
      if (userLocation) {
        try {
          const r: any = await apiGet(`/api/services/nearby-providers?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=10`)
          ;(r.providers || []).forEach((p: any) => {
            if (Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
              merged.set(String(p.providerId), {
                providerId: String(p.providerId),
                name: p.name,
                status: p.status || 'available',
                lat: Number(p.lat),
                lng: Number(p.lng),
                distanceKm: p.distanceKm ?? null,
                etaMinutes: p.etaMinutes ?? null,
              })
            }
          })
        } catch {}
      }

      // 2) Ajouter viewers / offerors / assigned depuis les demandes actives
      //    (sans fusionner le "nearby" de chaque demande qui est basé sur la
      //    position de la demande, pas de l'utilisateur)
      const activeIds = recent
        .filter(it => it._id && !['completed', 'cancelled'].includes(it.status))
        .map(it => String(it._id))

      for (const id of activeIds) {
        try {
          const r: any = await apiGet(`/api/services/requests/${id}/live`)
          ;[...(r.viewers || []), ...(r.offerors || []), ...(r.assigned ? [r.assigned] : [])]
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
  }, [recent, userLocation])

  // ── Urgent eligibility check ────────────────────────────────────
  useEffect(() => {
    if (!userLocation) return
    let mounted = true
    apiGet(`/api/services/urgent-eligibility?lat=${userLocation.lat}&lng=${userLocation.lng}`)
      .then((res: any) => {
        if (!mounted) return
        setUrgentEligibility({
          eligible: !!res?.eligible,
          count: res?.count ?? 0,
          bestEta: res?.bestEta ?? null,
          radiusKm: res?.radiusKm ?? 15,
          maxEta: res?.maxEta ?? 30,
        })
      })
      .catch(() => {
        if (mounted) setUrgentEligibility({ eligible: false, count: 0, bestEta: null, radiusKm: 15, maxEta: 30 })
      })
    return () => { mounted = false }
  }, [userLocation])

  // ── Hero selection ──────────────────────────────────────────────
  const offersPending = recent.filter(it => {
    const unseen = it.unseenOfferCount ?? it.pendingOfferCount
    return it.status === 'pending_offers' && unseen > 0
  })
  const activeMissions = recent
    .filter(it => ACTIVE_STATUSES.includes(it.status))
    .sort((a, b) =>
      (STATUS_RANK[b.status] || 0) - (STATUS_RANK[a.status] || 0) ||
      new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    )

  const heroMission = activeMissions[0] || null
  const heroOffer = !heroMission ? (offersPending[0] || null) : null
  const heroId = heroMission?._id || heroOffer?._id
  const secondaryItems = recent.filter(it => String(it._id) !== String(heroId)).slice(0, 6)
  const hasNoActivity = recent.length === 0 && !loadingRecent
  const heroLive = heroMission
    ? liveProviders.find(p => String(p.providerId) === String(heroMission.acceptedOffer?.providerId)) || null
    : null

  const catFor = (it: any) => cats.find(c => c.id === it.category)
  const requestTitle = (it: any, maxLen = 28) => {
    const catLabel = catFor(it)?.label || it.category
    return it.description
      ? `${catLabel} — ${it.description.slice(0, maxLen)}${it.description.length > maxLen ? '…' : ''}`
      : catLabel
  }

  const openItem = (it: any) => {
    if (MISSION_ROUTE_STATUSES.includes(it.status)) {
      router.push(`/mission/${it._id}` as any)
    } else {
      router.push(`/offers/${it._id}` as any)
    }
  }

  const openUrgent = async () => {
    const choice = await pickOption(t('home.urgentSheetTitle'), [
      { key: 'electricite', label: t('home.urgentElectricity') },
      { key: 'plomberie', label: t('home.urgentPlumbing') },
      { key: 'securite', label: t('home.urgentSecurity') },
    ])
    if (choice) {
      router.push({
        pathname: '/create-request',
        params: { category: choice, urgent: 'true' },
      } as any)
    }
  }

  const displayName = (userName ? (isPhoneLike(userName) ? formatPhone(userName) : userName) : '') || formatPhone(getAuthUser()?.phone)

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <TouchableOpacity
              style={s.headerBtn}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={t('menu.navigation')}
            >
              <Menu size={20} color={colors.text} />
            </TouchableOpacity>
            <Logo size={26} />
            <Text style={s.appName}>Xeuy Bi</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
              <BellRing size={18} color={colors.text} />
              {unread > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/profile')} accessibilityLabel="Profil">
              <Text style={s.avatarText}>{getInitials(displayName)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour(t)} 👋</Text>
          {!!displayName && <Text style={s.greetName} numberOfLines={1}>{displayName}</Text>}
        </View>

        {/* Hero — Mission active / Offres reçues / Vide */}
        {loadingRecent && recent.length === 0 ? (
          <Skeleton height={210} radius={24} style={{ marginHorizontal: spacing.lg }} />
        ) : heroMission ? (
          <MissionHero
            mission={heroMission}
            title={requestTitle(heroMission)}
            categoryColor={catFor(heroMission)?.color || '#B85818'}
            liveProvider={heroLive}
            userLocation={userLocation}
          />
        ) : heroOffer ? (
          <OffersHero
            request={heroOffer}
            title={requestTitle(heroOffer)}
            categoryColor={catFor(heroOffer)?.color || colors.navy}
            CategoryIcon={getCategoryIcon(heroOffer.category)}
            offerCount={heroOffer.unseenOfferCount ?? heroOffer.pendingOfferCount ?? 0}
          />
        ) : (
          <EmptyHero />
        )}

        {/* Secondary strip — autres demandes */}
        {secondaryItems.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.stripScroll}
            contentContainerStyle={s.stripContent}
          >
            {secondaryItems.map(it => {
              const st = STATUS_LABEL[it.status] || { label: it.status, color: colors.textSecondary, dot: colors.textMuted }
              const CatIcon: LucideIcon = getCategoryIcon(it.category)
              const color = catFor(it)?.color || '#475569'
              const offerCount = it.unseenOfferCount ?? it.pendingOfferCount ?? 0
              const statusText = it.status === 'pending_offers' && offerCount > 0
                ? t('home.offersReceived', { count: offerCount })
                : st.label
              return (
                <TouchableOpacity
                  key={String(it._id)}
                  style={s.stripCard}
                  activeOpacity={0.8}
                  onPress={() => openItem(it)}
                >
                  <View style={[s.stripIcon, { backgroundColor: color }]}>
                    <CatIcon size={18} color={colors.surface} />
                  </View>
                  <View style={s.stripInfo}>
                    <Text style={s.stripLabel} numberOfLines={1}>{catFor(it)?.label || it.category}</Text>
                    <View style={s.stripStatusRow}>
                      <View style={[s.stripDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.stripStatus, { color: st.color }]} numberOfLines={1}>{statusText}</Text>
                    </View>
                  </View>
                  <ChevronRight size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {/* Urgent — strip compacte dynamique */}
        <TouchableOpacity
          style={[s.urgentStrip, !urgentEligibility?.eligible && s.urgentStripDisabled]}
          onPress={openUrgent}
          disabled={!urgentEligibility?.eligible}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('home.emergencyRepair')}
        >
          <Zap
            size={16}
            color={urgentEligibility?.eligible ? colors.danger : colors.textMuted}
            fill={urgentEligibility?.eligible ? colors.danger : 'transparent'}
            strokeWidth={2.4}
          />
          <Text style={[s.urgentStripText, !urgentEligibility?.eligible && s.urgentStripTextDisabled]}>
            {t('home.emergencyRepair')}
          </Text>
        </TouchableOpacity>

        {/* Catégories — compact */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.categories')}</Text>
          <TouchableOpacity onPress={() => router.push('/all-categories')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.seeAllText}>{t('home.allCategories')} →</Text>
          </TouchableOpacity>
        </View>
        <View style={s.catCard}>
          {cats.slice(0, 5).map(c => {
            const CatIcon = getCategoryIcon(c.id)
            return (
              <TouchableOpacity
                key={c.id}
                style={s.catTile}
                activeOpacity={0.75}
                onPress={() => router.push({ pathname: '/create-request', params: { category: c.id } })}
                accessibilityLabel={c.label}
              >
                <View style={[s.catIcon, { backgroundColor: c.color }]}>
                  <CatIcon size={18} color={colors.surface} />
                </View>
                <Text style={s.catLabel} numberOfLines={2}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Vos favoris */}
        {recommended.length > 0 && (
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('home.favorites')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10, paddingBottom: spacing.sm }}
            >
              {recommended.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={s.favCard}
                  activeOpacity={0.75}
                  onPress={() => router.push({
                    pathname: '/offers/provider/[id]',
                    params: {
                      id: String(p.id),
                      name: p.name || '',
                      rating: String(p.rating?.avg ?? 0),
                      missions: String(p.completedMissions ?? 0),
                    },
                  } as any)}
                  accessibilityLabel={p.name}
                >
                  <View style={s.favTop}>
                    <View style={s.favAvatarWrap}>
                      <View style={[s.favAvatar, { backgroundColor: colors.primaryLight }]}>
                        <Text style={s.favAvatarText}>{getInitials(p.name)}</Text>
                      </View>
                    </View>
                    <View style={s.favInfo}>
                      <Text style={s.favName} numberOfLines={1}>{formatProviderName(p.name) || t('home.newProvider')}</Text>
                      <Text style={s.favJobs}>{p.completedMissions ?? 0} {t('home.missions')}</Text>
                    </View>
                  </View>
                  <View style={s.favRating}>
                    <Star size={12} color={colors.warning} fill={colors.warning} />
                    <Text style={s.favRatingText}>{(p.rating?.avg ?? 0).toFixed(1)}</Text>
                    <ChevronRight size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Autour de vous — version compacte */}
        <NearbyStrip providers={liveProviders} onlineCount={onlineProviders} />

        {/* Onboarding: Comment ça marche */}
        {hasNoActivity && (
          <View style={s.howItWorksSection}>
            <Text style={s.sectionTitle}>{t('home.howItWorks')}</Text>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={s.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step1')}</Text>
                <Text style={s.stepSub}>{t('home.step1Sub')}</Text>
              </View>
            </View>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.warning }]}>
                <Text style={s.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step2')}</Text>
                <Text style={s.stepSub}>{t('home.step2Sub')}</Text>
              </View>
            </View>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.info }]}>
                <Text style={s.stepNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step3')}</Text>
                <Text style={s.stepSub}>{t('home.step3Sub')}</Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

function formatProviderName(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  // Si c'est un numéro, afficher la partie locale (sans indicatif) pour gagner de la place
  if (isPhoneLike(trimmed)) return formatPhone(trimmed, false)
  return trimmed.split(/\s+/)[0]
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appName: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  notifDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.surface },
  avatarBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.surface },
  greeting: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  greetTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  greetName: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.4, marginTop: 2 },

  // Secondary strip
  stripScroll: { marginTop: 10 },
  stripContent: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 4 },
  stripCard: {
    minWidth: 190, backgroundColor: colors.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  stripIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stripInfo: { minWidth: 0, flex: 1 },
  stripLabel: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  stripStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  stripDot: { width: 6, height: 6, borderRadius: 3 },
  stripStatus: { fontSize: 11, fontWeight: typography.weight.semibold as any },

  // Urgent strip — sous le hero, compacte et centrée
  urgentStrip: {
    marginHorizontal: spacing.lg, marginTop: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#FEF4F2', borderWidth: 1, borderColor: '#FCD8D4',
  },
  urgentStripDisabled: { backgroundColor: colors.slate100, borderColor: colors.border },
  urgentStripText: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.danger },
  urgentStripTextDisabled: { color: colors.textMuted },

  // Categories
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.lg, marginBottom: 12, marginTop: 22 },
  sectionTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: typography.weight.semibold as any },
  catCard: {
    flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface,
    borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingVertical: 16, paddingHorizontal: 8,
  },
  catTile: { flex: 1, alignItems: 'center', gap: 8 },
  catIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 11.5, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },

  // Favorites
  favCard: {
    minWidth: 170, backgroundColor: colors.surface, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  favTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favAvatarWrap: { position: 'relative' },
  favAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  favAvatarText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.primary },
  favInfo: { minWidth: 0, flex: 1 },
  favName: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  favJobs: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  favRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  favRatingText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.text },

  // How it works
  howItWorksSection: { marginHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.sm },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  stepTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})

export default withScreenBoundary(Home, 'Home')
