import { Text, View, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert, Animated, Image, Dimensions } from 'react-native'
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
import SideMenu from '../src/components/SideMenu'
import {
  onNearbyRequest,
  onOfferAccepted,
  onOfferRejected,
  onMissionStatusChanged,
  connectSocket,
} from '../src/socket'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import KpiCard from '../src/components/KpiCard'
import Logo from '../src/components/Logo'
import { colors, spacing, radius, shadows, typography, getCategoryMeta } from '../src/design'
import { BellRing, Menu, MapPin, FileText, Briefcase, Banknote, ChevronRight, Eye, EyeOff, Sparkles } from 'lucide-react-native'
import { apiGet, apiPost } from '../src/api'

const REQUEST_TTL_HOURS = 2
const DEFAULT_RADIUS_KM = 10
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

function formatMoney(n: number) {
  return n.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' FCFA'
}

function formatTimeShort(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function elapsedHM(iso?: string) {
  if (!iso) return '—'
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

function getAdviceList(profile: any, offers: any[], nearbyCount: number, earnings: any, activeMission: number, gpsActive: boolean, online: boolean): AdviceItem[] {
  const user = profile?.user || profile || {}
  const provider = profile?.provider || user?.providerProfile || {}
  const kyc = user.kycVerified || provider.kycVerified || false
  const hasAvatar = !!user.avatarUrl
  const score = provider.scoreXeuy || user.scoreXeuy || 0
  const pending = offers.filter((o: any) => o.status === 'submitted').length
  const totalOffers = offers.length

  const tips: AdviceItem[] = []

  if (!online) {
    tips.push({ title: 'Activez-vous pour recevoir des demandes', sub: 'Passez en ligne dès que vous êtes disponible.' })
  } else {
    if (!gpsActive) tips.push({ title: 'Activez votre GPS', sub: 'Les clients voient les prestataires proches en priorité.' })
    if (nearbyCount > 0 && pending === 0) tips.push({ title: 'Répondez en moins de 3 minutes', sub: 'La rapidité augmente vos chances d’acceptation.' })
    if (activeMission > 0) tips.push({ title: 'Mission en cours', sub: 'Soyez ponctuel et professionnel pour gagner 5 étoiles.' })
    if (nearbyCount === 0 && totalOffers === 0) tips.push({ title: 'Profitez-en pour compléter votre profil', sub: 'Un profil complet attire plus de demandes.' })
    if ((earnings.last7Days || 0) === 0) tips.push({ title: 'Augmentez votre rayon de visibilité', sub: 'Plus de visibilité = plus d’opportunités.' })
  }
  if (!hasAvatar) tips.push({ title: 'Ajoutez une photo de profil', sub: 'Les clients font confiance aux profils visibles.' })
  if (!kyc) tips.push({ title: 'Complétez votre vérification', sub: 'Gagnez le badge vérifié et rassurez les clients.' })
  if (score < 50) tips.push({ title: 'Améliorez votre Score Xeuy', sub: 'Ajoutez des réalisations, diplômes et catégories.' })

  // Bonnes pratiques génériques
  tips.push({ title: 'Demandez un avis après chaque mission', sub: 'Les avis positifs boostent votre ranking.' })
  tips.push({ title: 'Gardez une réactivité rapide', sub: 'Répondez aux messages clients dans les plus brefs délais.' })
  tips.push({ title: 'Mettez à jour vos disponibilités', sub: 'Un planning à jour évite les missions manquées.' })
  tips.push({ title: 'Soyez clair sur vos tarifs', sub: 'Des prix transparents rassurent les clients.' })

  return tips.slice(0, 8)
}

function Home() {
  const { t } = useTranslation()
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hour] = useState(new Date().getHours())
  const [providerName, setProviderName] = useState(() => {
    const authUser = getAuthUser()
    const n = authUser?.name?.trim() || ''
    return n && !/^\d{7,}$/.test(n) ? n.split(' ')[0] : ''
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [nearbyCount, setNearbyCount] = useState(0)
  const [nearbyItems, setNearbyItems] = useState<any[]>([])
  const [pendingOffers, setPendingOffers] = useState(0)
  const [activeMission, setActiveMission] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [hideRevenue, setHideRevenue] = useState(false)
  const [initials, setInitials] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(() => getAuthUser()?.avatarUrl || '')
  const [profile, setProfile] = useState<any>(null)
  const [earnings, setEarnings] = useState<any>({})
  const [offers, setOffers] = useState<any[]>([])
  const [onlineAt, setOnlineAt] = useState<Date | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [synced, setSynced] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)
  const [aiTips, setAiTips] = useState<AdviceItem[]>([])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const prevNearbyCount = useRef(0)
  const adviceScrollRef = useRef<ScrollView>(null)

  const screenWidth = Dimensions.get('window').width
  const adviceCardWidth = screenWidth - spacing.lg * 2
  const requestCardWidth = screenWidth - spacing.lg * 2

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
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
      setInitials(clean.slice(0, 2).toUpperCase() || 'P')
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
      const matchProm = (lat !== undefined && lng !== undefined)
        ? apiGet(`/api/services/matching?lng=${lng}&lat=${lat}&radiusKm=${DEFAULT_RADIUS_KM}&excludeMine=true`)
        : Promise.resolve({ items: [] })

      const [dash, earn, prof, off, match] = await Promise.allSettled([
        apiGet('/api/services/provider-dashboard'),
        apiGet('/api/provider/earnings'),
        apiGet('/api/provider/profile'),
        apiGet('/api/services/offers?mine=1'),
        matchProm,
      ])

      if (dash.status === 'fulfilled' && dash.value?.success) {
        setPendingOffers(dash.value.pendingOffers ?? 0)
        setActiveMission(dash.value.activeMissions ?? 0)
        setDailyRevenue(dash.value.dailyRevenue ?? 0)
      }
      if (earn.status === 'fulfilled') setEarnings(earn.value || {})
      if (prof.status === 'fulfilled') {
        setProfile(prof.value)
        setAvatarUrl(prof.value?.user?.avatarUrl || getAuthUser()?.avatarUrl || '')
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
      console.warn('[Home] dashboard load failed', e)
    }
  }, [])

  useEffect(() => {
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

  const goNearby = () => {
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
    router.push('/nearby-requests')
  }

  const user = profile?.user || profile || {}
  const provider = profile?.provider || user?.providerProfile || {}
  const radius = provider.zone?.radiusKm || DEFAULT_RADIUS_KM
  const onlineSince = onlineAt ? formatTimeShort(onlineAt) : null

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayNearby = nearbyItems.filter((it: any) => it.createdAt && new Date(it.createdAt).getTime() >= todayStart.getTime()).length
  const activityLabel = todayNearby >= 8 ? '🔥 Forte activité' : todayNearby >= 3 ? 'Moyenne' : '🟢 Faible activité'
  const activityColor = todayNearby >= 8 ? colors.danger : todayNearby >= 3 ? colors.warning : colors.success

  const activeStatuses = ['assigned', 'provider_arriving', 'on_the_way', 'arrived', 'in_progress', 'paused', 'awaiting_validation', 'dispute']
  const activeMissionItems = offers.filter((it: any) => it.status === 'accepted' && activeStatuses.includes(it.requestStatus))
  const activeMissionItem = activeMissionItems[0]
  const missionElapsed = activeMissionItem ? elapsedHM(activeMissionItem.updatedAt) : null

  const offersTotal = offers.length
  const offersPending = offers.filter((it: any) => it.status === 'submitted').length
  const offersAccepted = offers.filter((it: any) => it.status === 'accepted').length
  const offersRejected = offers.filter((it: any) => it.status === 'rejected').length
  const offersExpired = offers.filter((it: any) => it.status === 'expired').length

  const topRequest = [...nearbyItems].sort((a: any, b: any) => (b._score || 0) - (a._score || 0))[0]
  const currentTips = useMemo(() => {
    const staticTips = getAdviceList(profile, offers, nearbyCount, earnings, activeMission, gpsActive, online)
    // Merge AI tips first (if available), then static
    return aiTips.length > 0 ? [...aiTips, ...staticTips].slice(0, 8) : staticTips
  }, [profile, offers, nearbyCount, earnings, activeMission, gpsActive, online, aiTips])
  const safeTipIndex = Math.min(tipIndex, Math.max(0, currentTips.length - 1))

  useEffect(() => {
    if (currentTips.length <= 1) return
    const interval = setInterval(() => {
      const next = (safeTipIndex + 1) % currentTips.length
      adviceScrollRef.current?.scrollTo({ x: next * adviceCardWidth, animated: true })
      setTipIndex(next)
    }, 5000)
    return () => clearInterval(interval)
  }, [safeTipIndex, currentTips.length, adviceCardWidth])

  const missionsToday = (earnings.latest || []).filter((e: any) => e.completedAt && new Date(e.completedAt).getTime() >= todayStart.getTime()).length
  const missionGoal = 3
  const missionProgress = Math.min(100, (missionsToday / missionGoal) * 100)
  const showGoals = process.env.EXPO_PUBLIC_SHOW_PROVIDER_GOALS !== 'false'

  const weeklyRevenue = formatMoney(earnings.last7Days || 0)
  const monthlyRevenue = formatMoney(earnings.last30Days || 0)
  const dailyRevenueValue = hideRevenue ? '••••• FCFA' : formatMoney(dailyRevenue)

  const greeting = (hour < 12 ? t('home.greeting_morning', { defaultValue: 'Bonjour' }) : hour < 18 ? t('home.greeting_afternoon', { defaultValue: 'Bon après-midi' }) : t('home.greeting_evening', { defaultValue: 'Bonsoir' })) + (providerName ? `, ${providerName}` : '')

  return (
    <SafeAreaView style={s.safe}>
      <AnimatedScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }} style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Menu size={24} color={colors.text} />
            </TouchableOpacity>
            <Logo size={28} />
            <Text style={s.appName}>Xeuy Bi Pro</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={s.iconBtn} accessibilityLabel="Notifications">
              <BellRing size={18} color={colors.text} />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarBtn} accessibilityLabel="Profil">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={s.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetingTitle} numberOfLines={1}>{greeting}</Text>
          <Text style={s.greetingSub}>Votre tableau de bord</Text>
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
                    Rayon {radius} km{onlineSince ? ` · ${onlineSince}` : ''}
                  </Text>
                  <View style={s.statusMetaRow}>
                    <Text style={s.statusMeta}>{gpsActive ? 'GPS' : 'No GPS'}</Text>
                    <View style={s.statusDotSmall} />
                    <Text style={s.statusMeta}>{synced ? 'Sync' : 'No sync'}</Text>
                    <TouchableOpacity style={s.radiusBtn} onPress={() => router.push('/profile-detail?section=visibility')} hitSlop={{ top: 14, bottom: 14, left: 12, right: 12 }} accessibilityRole="button">
                      <Text style={s.radiusBtnText}>Gérer</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={[s.statusSub, s.statusSubOffline]}>Aucune demande reçue.</Text>
              )}
            </View>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggle}
            disabled={busy}
            trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
            thumbColor={colors.surface}
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        {/* KPI grid - 2x2 */}
        <View style={s.kpiGrid}>
          <KpiCard
            value={nearbyCount}
            label="Demandes proches"
            subLabel={`${todayNearby} aujourd'hui · ${activityLabel}`}
            icon={<MapPin size={22} color={colors.info} />}
            iconBg={colors.infoLight}
            iconColor={colors.info}
            onPress={goNearby}
          />
          <KpiCard
            value={offersTotal}
            label="Offres envoyées"
            subLabel={`${offersPending} en attente`}
            icon={<FileText size={22} color={colors.warning} />}
            iconBg="#FFF7ED"
            iconColor={colors.warning}
            onPress={() => router.push('/my-offers')}
          />
        </View>
        <View style={s.kpiGrid}>
          <KpiCard
            value={activeMission}
            label="Mission en cours"
            subLabel={activeMission > 0 && missionElapsed ? `depuis ${missionElapsed}` : 'Aucune mission active'}
            icon={<Briefcase size={22} color={colors.success} />}
            iconBg="#F0FDF4"
            iconColor={colors.success}
            onPress={() => router.push({ pathname: '/my-offers', params: { filter: 'active' } })}
          />
          <KpiCard
            value={dailyRevenueValue}
            label="Revenus du jour"
            subLabel={`Sem. ${weeklyRevenue} · Mois ${monthlyRevenue}`}
            icon={<Banknote size={22} color={colors.navy} />}
            iconBg={colors.slate100}
            iconColor={colors.navy}
            right={
              <TouchableOpacity onPress={() => setHideRevenue(v => !v)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={hideRevenue ? t('home.showRevenue', { defaultValue: 'Afficher les revenus' }) : t('home.hideRevenue', { defaultValue: 'Masquer les revenus' })}>
                {hideRevenue ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            }
          />
        </View>

        {/* Actions - Nouvelles demandes en scroll horizontal pleine largeur */}
        <Text style={s.sectionTitle}>Actions</Text>
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
                  router.push('/nearby-requests')
                }}
                activeOpacity={0.85}
              >
                <View style={s.requestCardTop}>
                  <View style={[s.requestCardTag, { backgroundColor: getCategoryMeta(req.category).color }]}>
                    <Text style={s.requestCardTagText}>Nouvelle</Text>
                  </View>
                  {req._distance !== undefined ? <Text style={s.requestCardDistance}>{(req._distance / 1000).toFixed(1)} km</Text> : null}
                </View>
                <Text style={s.requestCardCategory}>{getCategoryMeta(req.category).label}</Text>
                <Text style={s.requestCardPrice}>{Number(req.budget || 0).toLocaleString('fr-FR')} FCFA</Text>
                <Text style={s.requestCardRemaining}>Restant : {remainingHM(req.createdAt)}</Text>
                <View style={s.requestCardCta}>
                  <Text style={s.requestCardCtaText}>Voir</Text>
                  <ChevronRight size={14} color={colors.navy} />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={[s.actionHero, !online && s.actionDisabled]}>
            <View style={s.actionHeroTag}><Text style={s.actionHeroTagText}>Nouveautés</Text></View>
            <Text style={s.actionHeroTitle}>Demandes proches</Text>
            <Text style={s.actionHeroSub}>{online ? 'Vous êtes en ligne. Les nouvelles demandes apparaîtront automatiquement ici.' : t('home.activateToReceive', { defaultValue: 'Activez-vous pour recevoir des demandes' })}</Text>
          </View>
        )}

        <TouchableOpacity style={s.actionRow} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
          <View style={s.actionRowTag}><Text style={s.actionRowTagText}>Suivi</Text></View>
          <Text style={s.actionRowTitle}>Mes offres envoyées</Text>
          <Text style={s.actionRowSub} numberOfLines={1} ellipsizeMode="tail">
            {offersTotal > 0 ? `${offersTotal} envoyée(s) · ${offersPending} en attente · ${offersAccepted} acceptée(s) · ${offersRejected} refusée(s) · ${offersExpired} expirée(s)` : 'Aucune offre envoyée'}
          </Text>
          <ChevronRight size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={s.adviceCard}>
          <View style={s.adviceHeader}>
            <View style={[s.adviceTag, { backgroundColor: colors.infoLight }]}>
              <Text style={[s.adviceTagText, { color: colors.info }]}>Conseil</Text>
            </View>
            <Text style={s.advicePaging}>{safeTipIndex + 1} / {currentTips.length}</Text>
          </View>
          <ScrollView
            ref={adviceScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
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
              <Text style={s.goalTitle}>Objectif du jour</Text>
              <Text style={s.goalProgress}>{missionsToday} / {missionGoal} missions</Text>
            </View>
            <View style={s.goalTrack}>
              <View style={[s.goalFill, { width: `${missionProgress}%` }]} />
            </View>
          </View>
        )}
      </AnimatedScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appName: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  greeting: { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
  greetingTitle: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
  greetingSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  iconBtnText: { color: colors.text },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  avatarBtn: { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, overflow: 'hidden' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  statusCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.md },
  statusCardOnline: { backgroundColor: colors.primary },
  statusCardOffline: { backgroundColor: '#E5E7EB' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  statusText: { flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotOnline: { backgroundColor: '#86EFAC' },
  statusDotOffline: { backgroundColor: colors.textMuted },
  statusTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.slate100 },
  statusTitleOnline: { color: colors.surface },
  statusTitleOffline: { color: '#374151' },
  statusSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  statusSubOnline: { color: colors.successLight },
  statusSubOffline: { color: '#6B7280' },
  statusMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  statusMeta: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  statusMetaOffline: { color: '#6B7280' },
  statusDotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },
  radiusBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.2)' },
  radiusBtnText: { fontSize: 11, color: colors.surface, fontWeight: '600' },
  activityCard: { marginHorizontal: spacing.lg, marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  activityLabel: { fontWeight: '700' },
  kpiGrid: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.xl, marginTop: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  actionHero: { marginHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.navy, padding: spacing.lg, position: 'relative', overflow: 'hidden', ...shadows.lg },
  actionDisabled: { opacity: 0.55 },
  actionHeroTag: { alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.md },
  actionHeroTagText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  actionHeroTitle: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.surface, marginBottom: 2 },
  actionHeroSub: { fontSize: 14, color: colors.textMuted },
  requestCard: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.lg, ...shadows.lg, gap: spacing.sm },
  requestCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  requestCardTag: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  requestCardTagText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  requestCardDistance: { fontSize: 13, fontWeight: '700', color: colors.surface },
  requestCardCategory: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.surface, marginBottom: 2 },
  requestCardPrice: { fontSize: 15, fontWeight: '700', color: colors.successLight },
  requestCardRemaining: { fontSize: 12, color: colors.textMuted },
  requestCardCta: { marginTop: spacing.xs, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  requestCardCtaText: { color: colors.navy, fontWeight: '700', fontSize: 13 },
  actionRow: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, position: 'relative', ...shadows.sm },
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
  goalProgress: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.primary },
  goalTrack: { height: 8, backgroundColor: colors.bg, borderRadius: radius.pill, overflow: 'hidden' },
  goalFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
})

export default withScreenBoundary(Home, 'Home')
