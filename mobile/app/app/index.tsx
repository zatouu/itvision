import { createThemedStyles } from '../src/theme'
import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { getAuthUser, getUserIdFromToken, isLoggedIn } from '../src/auth'
import { isPhoneLike, formatPhone } from '../src/user-display'
import { fetchWithCache } from '../src/storage'
import { connectSocket, requestOnlineProviders, onOnlineProvidersCount, joinRequestRoom, leaveRequestRoom, onProviderLocation } from '../src/socket'
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
import { radius, spacing, typography, fonts } from '../src/design'
import { BellRing, Check, LucideIcon, Sparkles } from 'lucide-react-native'
import { pickOption } from '../src/option-sheet'
import TabBar from '../src/components/TabBar'



const ACTIVE_STATUSES = ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']
const MISSION_ROUTE_STATUSES = [...ACTIVE_STATUSES, 'completed']
// Most actionable status first when picking the hero mission
const STATUS_RANK: Record<string, number> = {
  awaiting_validation: 5, dispute: 5, in_progress: 4, paused: 4, arrived: 3, provider_arriving: 3, on_the_way: 3, accepted: 2, assigned: 2,
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

function Home() {
  const { colors, STATUS_LABEL, s } = useStyles()
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
  const [missionLive, setMissionLive] = useState<{
    providerId: string
    name?: string
    lat: number
    lng: number
    etaMinutes?: number | null
  } | null>(null)
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
    if (isLoggedIn()) {
      apiGet('/api/client/profile')
        .then((res: any) => {
          const name = res?.profile?.name
          if (name && name.trim() && !/^\d{7,}$/.test(name.trim())) setUserName(name.split(' ')[0])
        })
        .catch(() => {})
    }
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
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

      if (mounted) {
        // Même si l'utilisateur est aussi prestataire en ligne, il ne doit pas se voir « autour de lui »
        const selfId = String(getAuthUser()?._id || getUserIdFromToken() || '')
        setLiveProviders(Array.from(merged.values()).filter(p => !selfId || String(p.providerId) !== selfId))
      }
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

  // ── Live socket subscription for the active mission ───────────────
  useEffect(() => {
    if (!heroMission?._id) {
      setMissionLive(null)
      return
    }
    const requestId = String(heroMission._id)
    joinRequestRoom(requestId)
    const unsub = onProviderLocation((data: any) => {
      if (String(data.requestId) !== requestId) return
      if (!Number.isFinite(Number(data.lat)) || !Number.isFinite(Number(data.lng))) return
      setMissionLive({
        providerId: String(data.providerId),
        name: data.providerName,
        lat: Number(data.lat),
        lng: Number(data.lng),
        etaMinutes: data.eta ?? null,
      })
    })
    return () => {
      leaveRequestRoom(requestId)
      unsub()
      setMissionLive(null)
    }
  }, [heroMission?._id])

  const heroLive = heroMission
    ? (missionLive
        ? { ...missionLive, status: 'assigned' }
        : liveProviders.find(p => String(p.providerId) === String(heroMission.acceptedOffer?.providerId)) || null)
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

  const hasRealName = !!userName && !isPhoneLike(userName)
  const displayName = (hasRealName ? userName : '') || formatPhone(getAuthUser()?.phone)
  const showNamePrompt = !hasRealName

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <Logo size={26} />
            <Text style={s.appName}>Xeuy Bi</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/assistant')} accessibilityLabel={t('menu.assistant', { defaultValue: 'Assistant IA' })}>
              <Sparkles size={18} color={colors.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel={t('menu.notifications')}>
              <BellRing size={18} color={colors.text} />
              {unread > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour(t)}</Text>
          {showNamePrompt ? (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
              <Text style={s.greetName} numberOfLines={1}>{displayName}</Text>
              <Text style={s.greetNameHint}>{t('home.addName')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/profile')}>
              <Text style={s.greetName} numberOfLines={1}>{displayName}</Text>
            </TouchableOpacity>
          )}
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
          <EmptyHero urgentEligibility={urgentEligibility} onUrgent={openUrgent} />
        )}

        {/* Secondary strip — dernières demandes */}
        {secondaryItems.length > 0 && (
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('home.latestRequests')}</Text>
            </View>
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
                const isCompleted = it.status === 'completed'
                const statusText = it.status === 'pending_offers' && offerCount > 0
                  ? t('home.offersReceived', { count: offerCount })
                  : t(`requests.status_${it.status}`, { defaultValue: st.label })
                return (
                  <TouchableOpacity
                    key={String(it._id)}
                    style={s.stripChip}
                    activeOpacity={0.8}
                    onPress={() => openItem(it)}
                    accessibilityRole="button"
                    accessibilityLabel={`${catFor(it)?.label || it.category}, ${statusText}`}
                  >
                    <View style={[s.stripIcon, { backgroundColor: color }]}>
                      <CatIcon size={14} color={colors.onPrimary} />
                    </View>
                    <View style={s.stripTextCol}>
                      <Text style={s.stripLabel} numberOfLines={1}>{catFor(it)?.label || it.category}</Text>
                      <Text style={[s.stripStatus, { color: st.color }]} numberOfLines={1}>{statusText}</Text>
                    </View>
                    {isCompleted ? (
                      <View style={[s.stripCheckWrap, { backgroundColor: st.dot }]}>
                        <Check size={10} color={colors.onPrimary} strokeWidth={3} />
                      </View>
                    ) : it.status === 'pending_offers' && offerCount > 0 ? (
                      <View style={s.stripOfferBadge}>
                        <Text style={s.stripOfferBadgeText}>{offerCount}</Text>
                      </View>
                    ) : (
                      <View style={[s.stripDot, { backgroundColor: st.dot }]} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Catégories — compact */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.categories')}</Text>
          <TouchableOpacity onPress={() => router.push('/all-categories')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.seeAllText}>{t('home.allCategories')}</Text>
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
                  <CatIcon size={18} color={colors.onPrimary} />
                </View>
                <Text style={s.catLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{c.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

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

      <TabBar active="home" />
    </SafeAreaView>
  )
}



export default withScreenBoundary(Home, 'Home')

const useStyles = createThemedStyles(colors => {
  const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
    created:           { label: 'Publiée',              color: colors.infoInk, dot: '#2563EB' },
    pending_offers:    { label: 'Offres reçues',        color: colors.warnInk, dot: '#D97706' },
    accepted:          { label: 'Prestataire assigné',  color: colors.successInk, dot: '#059669' },
    assigned:          { label: 'Prestataire assigné',  color: colors.successInk, dot: '#059669' },
    on_the_way:        { label: 'En route',             color: colors.infoInk, dot: '#0EA5E9' },
    provider_arriving: { label: 'En route',             color: colors.infoInk, dot: '#0EA5E9' },
    arrived:           { label: 'Sur place',            color: colors.successInk, dot: '#059669' },
    in_progress:       { label: 'En cours',             color: colors.violetInk, dot: '#7C3AED' },
    paused:            { label: 'En pause',             color: colors.warnInk, dot: '#D97706' },
    dispute:           { label: 'Litige',               color: colors.dangerInk, dot: '#DC2626' },
    awaiting_validation: { label: 'À valider',          color: colors.warnInk, dot: '#F59E0B' },
    completed:         { label: 'Terminée',             color: colors.textSecondary, dot: colors.textMuted },
    cancelled:         { label: 'Annulée',              color: colors.dangerInk, dot: '#DC2626' },
  }

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    appName: { fontSize: 17, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerBtn: {
      width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    notifDot: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.dangerStrong, borderWidth: 2, borderColor: colors.surface },
    greeting: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    greetTitle: { fontSize: 15, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
    greetName: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.5, marginTop: 2 },
    greetNameHint: { fontSize: 14, color: colors.primaryText, fontWeight: typography.weight.semibold as any, marginTop: 4 },

    // Secondary strip — compact chips
    stripScroll: { marginTop: 4, flexGrow: 0, flexShrink: 0 },
    stripContent: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 4 },
    stripChip: {
      backgroundColor: colors.surface, borderRadius: 16, minHeight: 52,
      paddingHorizontal: 12, paddingVertical: 8,
      flexDirection: 'row', gap: 10, alignItems: 'center',
    },
    stripIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    stripTextCol: { maxWidth: 150 },
    stripLabel: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.ink },
    stripStatus: { fontSize: 12, fontWeight: typography.weight.medium as any, marginTop: 1 },
    stripDot: { width: 6, height: 6, borderRadius: 3 },
    stripCheckWrap: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    stripOfferBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    stripOfferBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: typography.weight.extrabold as any },

    // Categories
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: spacing.lg, marginBottom: 12, marginTop: 28 },
    sectionTitle: { fontSize: 20, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.3 },
    seeAllText: { fontSize: 15, color: colors.primaryText, fontWeight: typography.weight.medium as any },
    catCard: {
      flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface,
      borderRadius: 18, paddingVertical: 16, paddingHorizontal: 6,
    },
    catTile: { flex: 1, alignItems: 'center', gap: 8, minHeight: 72 },
    catIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catLabel: { fontSize: 12, fontWeight: typography.weight.medium as any, color: colors.ink, textAlign: 'center' },

    // How it works
    howItWorksSection: { marginHorizontal: spacing.lg, marginTop: 28, gap: spacing.sm },
    stepCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: 16, padding: 14 },
    stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.onPrimary },
    stepTitle: { fontSize: 16, fontWeight: typography.weight.semibold as any, color: colors.ink },
    stepSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2, lineHeight: 19 },
  })
  return { colors, STATUS_LABEL, s }
})
