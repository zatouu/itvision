import { createThemedStyles } from '../src/theme'
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Alert, Animated, Image, Dimensions } from 'react-native'
import Toggle from '../src/components/Toggle'
import { logError } from '../src/log'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadInitial, toggleOnline, subscribe } from '../src/online'
import { getAuthUser } from '../src/auth'
import { toast } from '../src/toast'
import { subscribeProfile } from '../src/user-profile'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import TabBar from '../src/components/TabBar'
import {
  onNearbyRequest,
  onOfferAccepted,
  onOfferRejected,
  onMissionStatusChanged,
  connectSocket,
} from '../src/socket'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import NearbyMapCard from '../src/components/home/NearbyMapCard'
import { MissionKpiCard, OffersKpiCard, RevenueKpiCard } from '../src/components/home/ProKpiCards'
import Logo from '../src/components/Logo'
import { spacing, radius, shadows, typography, fonts, getCategoryMeta } from '../src/design'
import { BellRing, Briefcase, ChevronRight, Sparkles, MessageCircle } from 'lucide-react-native'
import { ListGroup, ListRow } from '../src/components/ListGroup'
import { loadNotifications, subscribeNotifications, unreadCount } from '../src/notifications'
import { apiGet, apiPost } from '../src/api'

const REQUEST_TTL_HOURS = 2
const DEFAULT_RADIUS_KM = 10

/** Rayon du profil borné comme côté serveur (1 à 25 km). */
function clampRadius(raw: unknown): number {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? Math.min(Math.max(Math.round(value), 1), 25) : DEFAULT_RADIUS_KM
}
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

function formatMoney(n: number) {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' FCFA'
}

function formatTimeShort(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

/** Durée lisible : « 35 min », « 3 h 05 », « 17 j » (au-delà de 24 h, HH:MM devenait « 410:44 »). */
function elapsedHM(iso?: string) {
  if (!iso) return '—'
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const totalMin = Math.floor(diff / 60000)
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  if (h < 24) return `${h} h ${String(totalMin % 60).padStart(2, '0')}`
  return `${Math.floor(h / 24)} j`
}

function remainingHM(iso?: string) {
  if (!iso) return '—'
  const end = new Date(new Date(iso).getTime() + REQUEST_TTL_HOURS * 60 * 60 * 1000)
  const diff = Math.max(0, end.getTime() - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

type AdviceItem = { title: string; sub: string }

function getAdviceList(profile: any, offers: any[], nearbyCount: number, earnings: any, activeMission: number, gpsActive: boolean, online: boolean, t: (k: string, o?: any) => string): AdviceItem[] {
  const user = profile?.user || profile || {}
  const provider = profile?.provider || user?.providerProfile || {}
  const kyc = user.kycVerified || provider.kycVerified || false
  const hasAvatar = !!user.avatarUrl
  const score = provider.scoreXeuy || user.scoreXeuy || 0
  const pending = offers.filter((o: any) => o.status === 'submitted').length
  const totalOffers = offers.length

  const tips: AdviceItem[] = []

  if (!online) {
    tips.push({ title: t('proHome.tips.goOnline.title', { defaultValue: 'Activez-vous pour recevoir des demandes' }), sub: t('proHome.tips.goOnline.sub', { defaultValue: 'Passez en ligne dès que vous êtes disponible.' }) })
  } else {
    if (!gpsActive) tips.push({ title: t('proHome.tips.gps.title', { defaultValue: 'Activez votre GPS' }), sub: t('proHome.tips.gps.sub', { defaultValue: 'Les clients voient les prestataires proches en priorité.' }) })
    if (nearbyCount > 0 && pending === 0) tips.push({ title: t('proHome.tips.fastReply.title', { defaultValue: 'Répondez en moins de 3 minutes' }), sub: t('proHome.tips.fastReply.sub', { defaultValue: 'La rapidité augmente vos chances d’acceptation.' }) })
    if (activeMission > 0) tips.push({ title: t('proHome.tips.missionOn.title', { defaultValue: 'Mission en cours' }), sub: t('proHome.tips.missionOn.sub', { defaultValue: 'Soyez ponctuel et professionnel pour gagner 5 étoiles.' }) })
    if (nearbyCount === 0 && totalOffers === 0) tips.push({ title: t('proHome.tips.completeProfile.title', { defaultValue: 'Profitez-en pour compléter votre profil' }), sub: t('proHome.tips.completeProfile.sub', { defaultValue: 'Un profil complet attire plus de demandes.' }) })
    if ((earnings.last7Days || 0) === 0) tips.push({ title: t('proHome.tips.radius.title', { defaultValue: 'Augmentez votre rayon de visibilité' }), sub: t('proHome.tips.radius.sub', { defaultValue: 'Plus de visibilité = plus d’opportunités.' }) })
  }
  if (!hasAvatar) tips.push({ title: t('proHome.tips.avatar.title', { defaultValue: 'Ajoutez une photo de profil' }), sub: t('proHome.tips.avatar.sub', { defaultValue: 'Les clients font confiance aux profils visibles.' }) })
  if (!kyc) tips.push({ title: t('proHome.tips.kyc.title', { defaultValue: 'Complétez votre vérification' }), sub: t('proHome.tips.kyc.sub', { defaultValue: 'Gagnez le badge vérifié et rassurez les clients.' }) })
  if (score < 50) tips.push({ title: t('proHome.tips.score.title', { defaultValue: 'Améliorez votre Score Xeuy' }), sub: t('proHome.tips.score.sub', { defaultValue: 'Ajoutez des réalisations, diplômes et catégories.' }) })

  // Bonnes pratiques génériques
  tips.push({ title: t('proHome.tips.askReview.title', { defaultValue: 'Demandez un avis après chaque mission' }), sub: t('proHome.tips.askReview.sub', { defaultValue: 'Les avis positifs boostent votre ranking.' }) })
  tips.push({ title: t('proHome.tips.reactive.title', { defaultValue: 'Gardez une réactivité rapide' }), sub: t('proHome.tips.reactive.sub', { defaultValue: 'Répondez aux messages clients dans les plus brefs délais.' }) })
  tips.push({ title: t('proHome.tips.availability.title', { defaultValue: 'Mettez à jour vos disponibilités' }), sub: t('proHome.tips.availability.sub', { defaultValue: 'Un planning à jour évite les missions manquées.' }) })
  tips.push({ title: t('proHome.tips.pricing.title', { defaultValue: 'Soyez clair sur vos tarifs' }), sub: t('proHome.tips.pricing.sub', { defaultValue: 'Des prix transparents rassurent les clients.' }) })

  return tips.slice(0, 8)
}

function Home() {
  const { colors, s } = useStyles()
  const { t, i18n } = useTranslation()
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hour] = useState(new Date().getHours())
  const [providerName, setProviderName] = useState(() => {
    const authUser = getAuthUser()
    const n = authUser?.name?.trim() || ''
    return n && !/^\d{7,}$/.test(n) ? n.split(' ')[0] : ''
  })
  const [unread, setUnread] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const [nearbyCount, setNearbyCount] = useState(0)
  const [nearbyItems, setNearbyItems] = useState<any[]>([])
  const [pendingOffers, setPendingOffers] = useState(0)
  const [activeMission, setActiveMission] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [hideRevenue, setHideRevenue] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [earnings, setEarnings] = useState<any>({})
  const [offers, setOffers] = useState<any[]>([])
  const [onlineAt, setOnlineAt] = useState<Date | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null)
  // Rayon du profil (connu après le 1er chargement) : la recherche de demandes l'utilise ensuite
  const radiusRef = useRef(DEFAULT_RADIUS_KM)
  const loadDashboardRef = useRef<(() => void) | null>(null)
  const [synced, setSynced] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [aiTips, setAiTips] = useState<AdviceItem[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const prevNearbyCount = useRef(0)
  const adviceScrollRef = useRef<ScrollView>(null)
  const [tipsAutoplay, setTipsAutoplay] = useState(true)

  const screenWidth = Dimensions.get('window').width
  const adviceCardWidth = screenWidth - spacing.lg * 2
  const requestCardWidth = screenWidth - spacing.lg * 2

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
  }, [])

  // Point rouge de la cloche : nombre réel de non-lues (comme l'accueil client)
  useEffect(() => {
    let mounted = true
    loadNotifications().then(() => { if (mounted) setUnread(unreadCount()) })
    const unsubscribe = subscribeNotifications(() => {
      if (mounted) setUnread(unreadCount())
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  // Fetch AI daily tips once per day (cached in AsyncStorage)
  useEffect(() => {
    if (!profile) return
    let mounted = true
    ;(async () => {
      const today = new Date().toISOString().slice(0, 10)
      const cacheKey = `provider:aiTips:${today}`
      try {
        const cached = await AsyncStorage.getItem(cacheKey)
        if (cached) {
          if (mounted) setAiTips(JSON.parse(cached))
          return
        }
        const res = await apiPost('/api/ai/assist', {
          type: 'daily_tips',
          profile: { completedMissions: profile?.completedMissions, kycVerified: profile?.kycVerified, online },
          nearbyCount,
          earnings,
          rating: profile?.rating,
        })
        if (res.text && mounted) {
          // Parse AI response into AdviceItem[] (one per line)
          const lines = res.text.split('\n').filter((l: string) => l.trim()).slice(0, 3)
          const tips: AdviceItem[] = lines.map((line: string) => {
            const clean = line.replace(/^[\d\-*•\s]+/, '').trim()
            const parts = clean.split(/[:\-–]/)
            return {
              title: (parts[0] || clean).trim().slice(0, 60),
              sub: (parts.slice(1).join(':').trim() || 'Conseil IA').slice(0, 100),
            }
          })
          if (tips.length > 0) {
            setAiTips(tips)
            await AsyncStorage.setItem(cacheKey, JSON.stringify(tips))
          }
        }
      } catch { /* AI unavailable — static tips still work */ }
    })()
    return () => { mounted = false }
  }, [profile, nearbyCount, online])

  useEffect(() => {
    return subscribeProfile(p => {
      const name = p?.name?.trim() || ''
      const clean = name && !/^\d{7,}$/.test(name) ? name : ''
      setProviderName(clean.split(' ')[0] || '')
    })
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (online) {
        const stored = await AsyncStorage.getItem('provider:onlineAt')
        if (stored) {
          if (mounted) setOnlineAt(new Date(stored))
        } else {
          const now = new Date()
          await AsyncStorage.setItem('provider:onlineAt', now.toISOString())
          if (mounted) setOnlineAt(now)
        }
      } else {
        await AsyncStorage.removeItem('provider:onlineAt')
        if (mounted) setOnlineAt(null)
      }
    })()
    return () => { mounted = false }
  }, [online])

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync()
      const initial = await loadInitial()
      setOnline(initial)
    })()
    const unsub = subscribe(setOnline)
    return unsub
  }, [])

  useEffect(() => {
    if (!pulse) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      { iterations: 3 }
    )
    anim.start()
    const timer = setTimeout(() => {
      anim.stop()
      pulseAnim.setValue(1)
      setPulse(false)
    }, 2500)
    return () => { clearTimeout(timer); anim.stop() }
  }, [pulse])

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    try { await toggleOnline() } finally { setBusy(false) }
  }

  const loadDashboard = useCallback(async () => {
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 1000 }).catch(() => null)
      const lat = last?.coords?.latitude
      const lng = last?.coords?.longitude
      if (lat !== undefined && lng !== undefined) setMyCoords({ lat, lng })
      const matchProm = (lat !== undefined && lng !== undefined)
        ? apiGet(`/api/services/matching?lng=${lng}&lat=${lat}&radiusKm=${radiusRef.current}&excludeMine=true`)
        : Promise.resolve({ items: [] })

      const [dash, earn, prof, off, match] = await Promise.allSettled([
        apiGet('/api/services/provider-dashboard'),
        apiGet('/api/provider/earnings'),
        apiGet('/api/provider/profile'),
        apiGet('/api/services/offers?mine=1'),
        matchProm,
      ])

      // Réseau / API KO sur les sources principales → on le dit au lieu
      // d'afficher des zéros qui ressemblent à « aucune activité ».
      setLoadError(dash.status === 'rejected' && earn.status === 'rejected' && off.status === 'rejected')

      if (dash.status === 'fulfilled' && dash.value?.success) {
        setPendingOffers(dash.value.pendingOffers ?? 0)
        setActiveMission(dash.value.activeMissions ?? 0)
        setDailyRevenue(dash.value.dailyRevenue ?? 0)
      }
      if (earn.status === 'fulfilled') setEarnings(earn.value || {})
      if (prof.status === 'fulfilled') {
        setProfile(prof.value)
        const profileRadius = clampRadius(prof.value?.provider?.zone?.radiusKm)
        if (profileRadius !== radiusRef.current) {
          radiusRef.current = profileRadius
          // Les demandes ont été cherchées avec l'ancien rayon : on relance une fois
          setTimeout(() => { loadDashboardRef.current?.() }, 0)
        }
      }
      if (off.status === 'fulfilled') setOffers(Array.isArray(off.value?.items) ? off.value.items : [])
      if (match.status === 'fulfilled') {
        const items = Array.isArray(match.value?.items) ? match.value.items : []
        const filtered = items.filter((it: any) => !it._hasOffered)
        if (filtered.length > prevNearbyCount.current && prevNearbyCount.current !== 0) setPulse(true)
        prevNearbyCount.current = filtered.length
        setNearbyItems(filtered)
        setNearbyCount(filtered.length)
      }

      setGpsActive(!!last)
      try { setSynced(connectSocket().connected) } catch {}
    } catch (e) {
      logError('ProHome.dashboard', e)
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    loadDashboardRef.current = loadDashboard
    loadDashboard()
    const unsubs = [
      onOfferAccepted(() => loadDashboard()),
      onOfferRejected(() => loadDashboard()),
      onMissionStatusChanged(() => loadDashboard()),
      onNearbyRequest(() => loadDashboard()),
    ]
    return () => { unsubs.forEach(u => u()) }
  }, [loadDashboard])

  useFocusEffect(
    useCallback(() => {
      loadDashboard()
    }, [loadDashboard])
  )

  const goNearby = (view?: 'map') => {
    if (!online) {
      toast.info(
        t('home.offlineAlert', { defaultValue: 'Hors ligne' }),
        t('home.offlineAlertMsg', { defaultValue: 'Passez en ligne pour voir les demandes proches.' })
      )
      return
    }
    setNearbyCount(0)
    setNearbyItems([])
    prevNearbyCount.current = 0
    router.push({ pathname: '/nearby-requests', params: { radius: String(radiusRef.current), ...(view ? { view } : {}) } })
  }

  const user = profile?.user || profile || {}
  const provider = profile?.provider || user?.providerProfile || {}
  const radius = clampRadius(provider.zone?.radiusKm)
  const onlineSince = onlineAt ? formatTimeShort(onlineAt) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayNearby = nearbyItems.filter((it: any) => it.createdAt && new Date(it.createdAt).getTime() >= todayStart.getTime()).length
  const activityColor = todayNearby >= 8 ? colors.danger : todayNearby >= 3 ? colors.warning : colors.success

  const activeStatuses = ['assigned', 'provider_arriving', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']
  const activeMissionItems = offers.filter((it: any) => it.status === 'accepted' && activeStatuses.includes(it.requestStatus))
  const activeMissionItem = activeMissionItems[0]
  const missionElapsed = activeMissionItem ? elapsedHM(activeMissionItem.updatedAt) : null

  const offersTotal = offers.length
  const offersPending = offers.filter((it: any) => it.status === 'submitted').length
  const offersAccepted = offers.filter((it: any) => it.status === 'accepted').length
  const counterPendingCount = offers.filter((it: any) => it.status === 'submitted' && it.clientCounterStatus === 'pending').length
  const activeMissionId = activeMissionItem ? String(activeMissionItem.requestId || '') : ''
  const activeMissionStatus: string = activeMissionItem?.requestStatus || ''
  const activeMissionLabel = activeMissionStatus === 'assigned'
    ? t('proHome.statusToStart')
    : t(`requests.status_${activeMissionStatus}`, { defaultValue: '' })

  const topRequest = [...nearbyItems].sort((a: any, b: any) => (b._score || 0) - (a._score || 0))[0]
  const currentTips = useMemo(() => {
    const staticTips = getAdviceList(profile, offers, nearbyCount, earnings, activeMission, gpsActive, online, t)
    // Merge AI tips first (if available), then static
    return aiTips.length > 0 ? [...aiTips, ...staticTips].slice(0, 8) : staticTips
  }, [profile, offers, nearbyCount, earnings, activeMission, gpsActive, online, aiTips])
  const safeTipIndex = Math.min(tipIndex, Math.max(0, currentTips.length - 1))

  useEffect(() => {
    // Défilement auto uniquement tant que l'utilisateur n'a pas pris la main
    if (!tipsAutoplay || currentTips.length <= 1) return
    const interval = setInterval(() => {
      const next = (safeTipIndex + 1) % currentTips.length
      adviceScrollRef.current?.scrollTo({ x: next * adviceCardWidth, animated: true })
      setTipIndex(next)
    }, 7000)
    return () => clearInterval(interval)
  }, [tipsAutoplay, safeTipIndex, currentTips.length, adviceCardWidth])

  const missionsToday = (earnings.latest || []).filter((e: any) => e.completedAt && new Date(e.completedAt).getTime() >= todayStart.getTime()).length
  const missionGoal = 3
  const missionProgress = Math.min(100, (missionsToday / missionGoal) * 100)
  const showGoals = process.env.EXPO_PUBLIC_SHOW_PROVIDER_GOALS !== 'false'

  const weeklyRevenue = formatMoney(earnings.last7Days || 0)
  const monthlyRevenue = formatMoney(earnings.last30Days || 0)
  const dailyRevenueValue = hideRevenue ? '••••• FCFA' : formatMoney(dailyRevenue)

  const greeting = (hour < 12 ? t('home.greeting_morning', { defaultValue: 'Bonjour' }) : hour < 18 ? t('home.greeting_afternoon', { defaultValue: 'Bon après-midi' }) : t('home.greeting_evening', { defaultValue: 'Bonsoir' })) + (providerName ? `, ${providerName}` : '')

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <AnimatedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }} style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <Logo size={26} />
            <Text style={s.appName}>Xeuy Bi Pro</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => router.push('/assistant')} style={s.iconBtn} accessibilityLabel={t('menu.assistant', { defaultValue: 'Assistant IA' })}>
              <Sparkles size={18} color={colors.primaryText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={t('menu.notifications')}>
              <BellRing size={18} color={colors.text} />
              {unread > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetingTitle} numberOfLines={1}>{greeting}</Text>
          <Text style={s.greetingSub}>{t('proHome.dashboard', { defaultValue: 'Votre tableau de bord' })}</Text>
        </View>

        {/* Status card */}
        <View style={[s.statusCard, online ? s.statusCardOnline : s.statusCardOffline]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, online ? s.statusDotOnline : s.statusDotOffline]} />
            <View style={s.statusText}>
              <Text style={[s.statusTitle, online ? s.statusTitleOnline : s.statusTitleOffline]}>{online ? t('home.online', { defaultValue: 'En ligne' }) : t('home.offline', { defaultValue: 'Hors ligne' })}</Text>
              {online ? (
                <>
                  <Text style={[s.statusSub, s.statusSubOnline]}>
                    {t('proHome.radius', { defaultValue: 'Rayon {{km}} km', km: radius })}{onlineSince ? ` · ${onlineSince}` : ''}
                  </Text>
                  <View style={s.statusMetaRow}>
                    <Text style={s.statusMeta}>{gpsActive ? t('home.gpsOn', { defaultValue: 'GPS' }) : t('home.gpsOff', { defaultValue: 'Pas de GPS' })}</Text>
                    <View style={s.statusDotSmall} />
                    <Text style={s.statusMeta}>{synced ? t('home.synced', { defaultValue: 'Sync' }) : t('home.notSynced', { defaultValue: 'Non sync' })}</Text>
                    <TouchableOpacity style={s.radiusBtn} onPress={() => router.push('/profile-detail?section=visibility')} hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} accessibilityRole="button">
                      <Text style={s.radiusBtnText}>{t('home.manage', { defaultValue: 'Gérer' })}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={[s.statusSub, s.statusSubOffline]}>{t('home.noRequestReceived', { defaultValue: 'Aucune demande reçue.' })}</Text>
              )}
            </View>
          </View>
          <Toggle
            value={online}
            onValueChange={handleToggle}
            disabled={busy}
            tint={colors.success}
          />
        </View>

        {loadError && (
          <TouchableOpacity style={s.errorBanner} onPress={loadDashboard} activeOpacity={0.8} accessibilityRole="button">
            <Text style={s.errorBannerText}>{t('proHome.loadError', { defaultValue: 'Données non à jour (connexion)' })}</Text>
            <Text style={s.errorBannerAction}>{t('common.retry', { defaultValue: 'Réessayer' })}</Text>
          </TouchableOpacity>
        )}

        {/* Ce qui demande une action : avant les chiffres */}
        {(activeMissionId || counterPendingCount > 0) ? (
          <ListGroup title={t('proHome.todo')}>
            {activeMissionId ? (
              <ListRow
                icon={<Briefcase size={17} color={colors.onPrimary} />}
                iconBg={activeMissionStatus === 'awaiting_validation' ? colors.warning : colors.primary}
                title={t('proHome.kpiMission', { defaultValue: 'Mission en cours' })}
                subtitle={activeMissionStatus === 'awaiting_validation'
                  ? t('proHome.awaitingValidationHint')
                  : [activeMissionLabel, missionElapsed ? t('proHome.kpiMissionSince', { defaultValue: 'depuis {{d}}', d: missionElapsed }) : ''].filter(Boolean).join(' · ')}
                onPress={() => router.push(`/active-mission/${activeMissionId}` as any)}
              />
            ) : null}
            {counterPendingCount > 0 ? (
              <ListRow
                icon={<MessageCircle size={17} color={colors.onPrimary} />}
                iconBg={colors.info}
                title={t('proHome.counterRow', { count: counterPendingCount })}
                subtitle={t('proHome.counterRowSub')}
                onPress={() => router.push({ pathname: '/my-offers', params: { filter: 'counter' } })}
              />
            ) : null}
          </ListGroup>
        ) : null}

        {/* Carte de la zone : rayon réel + demandes, puis les indicateurs */}
        <NearbyMapCard
          coords={myCoords}
          radiusKm={radius}
          items={nearbyItems}
          todayCount={todayNearby}
          online={online}
          busy={busy}
          onPress={() => goNearby('map')}
          onGoOnline={handleToggle}
        />
        <View style={s.kpiGrid}>
          <OffersKpiCard
            total={offersTotal}
            pending={offersPending}
            accepted={offersAccepted}
            counterPending={counterPendingCount}
            onPress={() => router.push(counterPendingCount > 0 ? { pathname: '/my-offers', params: { filter: 'counter' } } : '/my-offers')}
          />
          <MissionKpiCard
            active={!!activeMissionId}
            status={activeMissionStatus}
            statusLabel={activeMissionLabel}
            elapsed={activeMissionId ? missionElapsed : null}
            onPress={() => activeMissionId ? router.push(`/active-mission/${activeMissionId}` as any) : router.push({ pathname: '/my-offers', params: { filter: 'active' } })}
          />
        </View>
        <View style={s.kpiGrid}>
          <RevenueKpiCard
            todayLabel={dailyRevenueValue}
            weekLabel={hideRevenue ? '•••' : weeklyRevenue}
            monthLabel={hideRevenue ? '•••' : monthlyRevenue}
            chart={Array.isArray(earnings.chart) ? earnings.chart : []}
            hidden={hideRevenue}
            onToggleHidden={() => setHideRevenue(v => !v)}
            locale={i18n.language || 'fr'}
          />
        </View>

        {/* Actions - Nouvelles demandes en scroll horizontal pleine largeur */}
        <Text style={s.sectionTitle}>{t('proHome.actions', { defaultValue: 'Actions' })}</Text>
        {online && nearbyItems.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={requestCardWidth + spacing.md}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
          >
            {[...nearbyItems].sort((a: any, b: any) => (b._score || 0) - (a._score || 0)).map((req, i) => (
              <TouchableOpacity
                key={req._id || i}
                style={[s.requestCard, { width: requestCardWidth }, !online && s.actionDisabled, i === 0 && { transform: [{ scale: pulseAnim }] }]}
                onPress={() => {
                  if (!online) return
                  router.push({ pathname: '/nearby-requests', params: { radius: String(radiusRef.current) } })
                }}
                activeOpacity={0.85}
              >
                <View style={s.requestCardTop}>
                  <View style={[s.requestCardTag, { backgroundColor: getCategoryMeta(req.category).color }]}>
                    <Text style={s.requestCardTagText}>{t('proHome.tagNew', { defaultValue: 'Nouvelle' })}</Text>
                  </View>
                  {req._distance !== undefined ? <Text style={s.requestCardDistance}>{(req._distance / 1000).toFixed(1)} km</Text> : null}
                </View>
                <Text style={s.requestCardCategory}>{getCategoryMeta(req.category).label}</Text>
                <Text style={s.requestCardPrice}>{Number(req.budget || 0).toLocaleString('fr-FR')} FCFA</Text>
                <Text style={s.requestCardRemaining}>{t('proHome.remaining', { defaultValue: 'Restant : {{time}}', time: remainingHM(req.createdAt) })}</Text>
                <View style={s.requestCardCta}>
                  <Text style={s.requestCardCtaText}>{t('proHome.see', { defaultValue: 'Voir' })}</Text>
                  <ChevronRight size={14} color={colors.text} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={s.actionHero}>
            <Text style={s.actionHeroTitle}>{t('proHome.nearbyTitle', { defaultValue: 'Demandes proches' })}</Text>
            <Text style={s.actionHeroSub}>
              {online
                ? t('proHome.nearbyOnlineSub', { defaultValue: 'Vous êtes en ligne. Les nouvelles demandes apparaîtront automatiquement ici.' })
                : t('home.activateToReceive', { defaultValue: 'Activez-vous pour recevoir des demandes' })}
            </Text>
            {!online && (
              <TouchableOpacity
                style={s.goOnlineBtn}
                onPress={handleToggle}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <View style={s.goOnlineDot} />
                <Text style={s.goOnlineText}>{t('proHome.goOnline', { defaultValue: 'Passer en ligne' })}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={s.actionRow} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
          <View style={s.actionRowTag}><Text style={s.actionRowTagText}>{t('home.tracking', { defaultValue: 'Suivi' })}</Text></View>
          <Text style={s.actionRowTitle}>{t('home.myOffersSent', { defaultValue: 'Mes offres envoyées' })}</Text>
          <Text style={s.actionRowSub} numberOfLines={1} ellipsizeMode="tail">
            {offersTotal > 0 ? t('proHome.offersSummary', { defaultValue: '{{total}} envoyée(s) · {{pending}} en attente · {{accepted}} acceptée(s)', total: offersTotal, pending: offersPending, accepted: offersAccepted }) : t('proHome.noOffers', { defaultValue: 'Aucune offre envoyée' })}
          </Text>
          <ChevronRight size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={s.adviceCard}>
          <View style={s.adviceHeader}>
            <View style={[s.adviceTag, { backgroundColor: colors.infoLight }]}>
              <Text style={[s.adviceTagText, { color: colors.info }]}>{t('proHome.tip', { defaultValue: 'Conseil' })}</Text>
            </View>
            <Text style={s.advicePaging}>{safeTipIndex + 1} / {currentTips.length}</Text>
          </View>
          <ScrollView
            ref={adviceScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => setTipsAutoplay(false)}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / adviceCardWidth)
              setTipIndex(idx)
            }}
            contentContainerStyle={{ width: adviceCardWidth * currentTips.length }}
          >
            {currentTips.map((tip, i) => (
              <View key={i} style={[s.advicePage, { width: adviceCardWidth }]}>
                <Text style={s.adviceTitle}>{tip.title}</Text>
                <Text style={s.adviceSub}>{tip.sub}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={s.adviceDots}>
            {currentTips.map((_, i) => (
              <View key={i} style={[s.adviceDot, i === safeTipIndex && s.adviceDotActive]} />
            ))}
          </View>
        </View>

        {showGoals && (
          <View style={s.goalCard}>
            <View style={s.goalHeader}>
              <Text style={s.goalTitle}>{t('proHome.goal', { defaultValue: 'Objectif du jour' })}</Text>
              <Text style={s.goalProgress}>{t('proHome.goalProgress', { defaultValue: '{{done}} / {{goal}} missions', done: missionsToday, goal: missionGoal })}</Text>
            </View>
            <View style={s.goalTrack}>
              <View style={[s.goalFill, { width: `${missionProgress}%` }]} />
            </View>
          </View>
        )}
      </AnimatedScrollView>

      <TabBar active="home" mode="provider" />
    </SafeAreaView>
  )
}



export default withScreenBoundary(Home, 'Home')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    appName: { fontSize: 17, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    greeting: { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
    greetingTitle: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
    greetingSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
    iconBtnText: { color: colors.text },
    notifDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dangerStrong, borderWidth: 1.5, borderColor: colors.surface },
    avatarText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.primaryText },
    statusCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statusCardOnline: { backgroundColor: colors.brandSoft },
    statusCardOffline: { backgroundColor: colors.surface },
    statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    statusText: { flex: 1 },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusDotOnline: { backgroundColor: '#22C55E' },
    statusDotOffline: { backgroundColor: colors.textMuted },
    statusTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.slate100 },
    statusTitleOnline: { color: colors.brandInk },
    statusTitleOffline: { color: colors.textSecondary },
    statusSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statusSubOnline: { color: colors.brandInk },
    statusSubOffline: { color: colors.textSecondary },
    statusMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
    statusMeta: { fontSize: 12, color: colors.brandInk },
    statusMetaOffline: { color: colors.textSecondary },
    statusDotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(6,95,58,0.4)' },
    radiusBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(6,95,58,0.12)' },
    radiusBtnText: { fontSize: 12, color: colors.brandInk, fontWeight: '600' },
    activityCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    activityDot: { width: 8, height: 8, borderRadius: 4 },
    activityText: { flex: 1, fontSize: 13, color: colors.textSecondary },
    kpiGrid: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.xl, marginTop: spacing.md },
    sectionTitle: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.textSecondary, paddingHorizontal: spacing.lg + 4, marginTop: spacing.xxl, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.4 },
    actionHero: { marginHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.navy, padding: spacing.lg, position: 'relative', overflow: 'hidden', ...shadows.lg },
    actionDisabled: { opacity: 0.55 },
    errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.warnSoft, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: '#FDE68A' },
    errorBannerText: { flex: 1, fontSize: 13, color: colors.warnInk, fontWeight: typography.weight.semibold as any },
    errorBannerAction: { fontSize: 13, color: colors.warnInk, fontWeight: typography.weight.extrabold as any, textDecorationLine: 'underline' },
    actionHeroTitle: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.onPrimary, marginBottom: 2 },
    actionHeroSub: { fontSize: 14, color: colors.textMuted },
    goOnlineBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, marginTop: spacing.md, backgroundColor: '#22C55E', borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 },
    goOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surface },
    goOnlineText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.onPrimary },
    requestCard: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.lg, ...shadows.lg, gap: spacing.sm },
    requestCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    requestCardTag: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    requestCardTagText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.onPrimary },
    requestCardDistance: { fontSize: 13, fontWeight: '700', color: colors.onPrimary },
    requestCardCategory: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.onPrimary, marginBottom: 2 },
    requestCardPrice: { fontSize: 15, fontWeight: '700', color: colors.successLight },
    requestCardRemaining: { fontSize: 12, color: colors.textMuted },
    requestCardCta: { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    requestCardCtaText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    actionRow: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, position: 'relative', ...shadows.sm },
    adviceCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface, paddingTop: spacing.md, ...shadows.sm, overflow: 'hidden' },
    adviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    adviceTag: { alignSelf: 'flex-start', backgroundColor: colors.infoLight, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
    adviceTagText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.info },
    advicePaging: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.textMuted },
    advicePage: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    adviceTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 2 },
    adviceSub: { fontSize: 13, color: colors.textSecondary },
    adviceDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.md },
    adviceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    adviceDotActive: { backgroundColor: colors.info },
    actionRowTag: { alignSelf: 'flex-start', backgroundColor: colors.slate100, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.sm },
    actionRowTagText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary },
    actionRowTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 2 },
    actionRowSub: { fontSize: 13, color: colors.textSecondary },
    actionRowArrow: { position: 'absolute', right: spacing.lg, top: '50%', marginTop: -10, color: colors.textMuted },
    goalCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    goalTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text },
    goalProgress: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.primaryText },
    goalTrack: { height: 8, backgroundColor: colors.bg, borderRadius: radius.pill, overflow: 'hidden' },
    goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  })
  return { colors, s }
})
