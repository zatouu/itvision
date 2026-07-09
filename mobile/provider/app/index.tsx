import { Text, View, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert } from 'react-native'
import { useEffect, useState, useRef, useCallback } from 'react'
import * as Location from 'expo-location'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadInitial, toggleOnline, subscribe } from '../src/online'
import TabBar from '../src/components/TabBar'
import { subscribeProfile } from '../src/user-profile'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import {
  emitGps,
  onNearbyRequest,
  onOfferAccepted,
  onOfferRejected,
  onMissionStatusChanged,
} from '../src/socket'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import KpiCard from '../src/components/KpiCard'
import { colors, spacing, radius, shadows, typography } from '../src/design'
import { Bell, MapPin, FileText, Briefcase, Banknote, ChevronRight, Eye, EyeOff } from 'lucide-react-native'
import { apiGet } from '../src/api'

function Home() {
  const { t } = useTranslation()
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hour] = useState(new Date().getHours())
  const [providerName, setProviderName] = useState('')
  const [nearbyCount, setNearbyCount] = useState(0)
  const [pendingOffers, setPendingOffers] = useState(0)
  const [activeMission, setActiveMission] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [hideRevenue, setHideRevenue] = useState(false)
  const [initials, setInitials] = useState('')
  const gpsInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return subscribeProfile(p => {
      const name = p?.name || ''
      setProviderName(name.split(' ')[0] || '')
      setInitials(name.slice(0, 2).toUpperCase() || 'P')
    })
  }, [])

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
    if (!online) {
      if (gpsInterval.current) { clearInterval(gpsInterval.current); gpsInterval.current = null }
      return
    }
    const sendGps = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') return
        const pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ])
        emitGps(pos.coords.latitude, pos.coords.longitude)
      } catch { /* silent */ }
    }
    sendGps()
    gpsInterval.current = setInterval(sendGps, 60_000)
    return () => { if (gpsInterval.current) clearInterval(gpsInterval.current) }
  }, [online])

  useEffect(() => {
    const unsub = onNearbyRequest(() => setNearbyCount(c => c + 1))
    return unsub
  }, [])

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    try { await toggleOnline() } finally { setBusy(false) }
  }

  const loadDashboard = useCallback(async () => {
    try {
      const d: any = await apiGet('/api/services/provider-dashboard')
      if (d.success) {
        setPendingOffers(d.pendingOffers ?? 0)
        setActiveMission(d.activeMissions ?? 0)
        setDailyRevenue(d.dailyRevenue ?? 0)
      }
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
      Alert.alert(t('home.offlineAlert'), t('home.offlineAlertMsg'))
      return
    }
    setNearbyCount(0)
    router.push('/nearby-requests')
  }

  const greeting = (hour < 12 ? t('home.greeting_morning') : hour < 18 ? t('home.greeting_afternoon') : t('home.greeting_evening')) + (providerName ? `, ${providerName}` : '')
  const formatMoney = (n: number) => n.toLocaleString('fr-FR').replace(/\s/g, ' ') + ' FCFA'

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={s.iconBtn} accessibilityLabel="Notifications">
            <Bell size={18} color={colors.text} />
            <View style={s.notifDot} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarBtn}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        <OfflineQueueBadge />

        {/* Status card */}
        <View style={[s.statusCard, online && s.statusCardOnline]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, online ? s.statusDotOnline : s.statusDotOffline]} />
            <View>
              <Text style={[s.statusTitle, online && s.statusTitleOnline]}>{online ? t('home.online') : t('home.offline')}</Text>
              <Text style={[s.statusSub, online && s.statusSubOnline]}>{online ? t('home.visibleRadius', { radius: 10 }) : t('home.activateToReceive')}</Text>
            </View>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggle}
            disabled={busy}
            trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
            thumbColor='#fff'
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        {/* KPI grid */}
        <View style={s.kpiGrid}>
          <KpiCard
            value={nearbyCount}
            label="Demandes proches"
            icon={<MapPin size={22} color={colors.info} />}
            iconBg="#EFF6FF"
            iconColor={colors.info}
            onPress={goNearby}
          />
          <KpiCard
            value={pendingOffers}
            label="Offres en attente"
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
            icon={<Briefcase size={22} color={colors.success} />}
            iconBg="#F0FDF4"
            iconColor={colors.success}
          />
          <KpiCard
            value={hideRevenue ? '••••• FCFA' : formatMoney(dailyRevenue)}
            label="Revenus du jour"
            icon={<Banknote size={22} color={colors.navy} />}
            iconBg="#F1F5F9"
            iconColor={colors.navy}
            right={
              <TouchableOpacity onPress={() => setHideRevenue(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {hideRevenue ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
              </TouchableOpacity>
            }
          />
        </View>

        {/* Actions */}
        <Text style={s.sectionTitle}>Actions</Text>
        <TouchableOpacity style={[s.actionHero, !online && s.actionDisabled]} onPress={goNearby} activeOpacity={0.85}>
          <View style={s.actionHeroTag}><Text style={s.actionHeroTagText}>Nouveautés</Text></View>
          <Text style={s.actionHeroTitle}>Demandes proches</Text>
          <Text style={s.actionHeroSub}>{online ? (nearbyCount > 0 ? `${nearbyCount} demande(s) autour de vous` : 'Aucune demande proche pour le moment') : t('home.activateToReceive')}</Text>
          <View style={s.actionHeroArrow}><ChevronRight size={20} color="#fff" /></View>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionRow} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
          <View style={s.actionRowTag}><Text style={s.actionRowTagText}>Suivi</Text></View>
          <Text style={s.actionRowTitle}>Mes offres envoyées</Text>
          <Text style={s.actionRowSub}>{pendingOffers > 0 ? `${pendingOffers} offre(s) en attente de réponse` : 'Aucune offre en attente'}</Text>
          <ChevronRight size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={s.actionRow} activeOpacity={0.85}>
          <View style={[s.actionRowTag, { backgroundColor: '#EFF6FF' }]}><Text style={[s.actionRowTagText, { color: colors.info }]}>Conseil</Text></View>
          <Text style={s.actionRowTitle}>Répondez en moins de 3 min</Text>
          <Text style={s.actionRowSub}>pour augmenter vos chances</Text>
          <ChevronRight size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  greeting: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  iconBtnText: { color: colors.text },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  avatarBtn: { width: 44, height: 44, borderRadius: radius.xl, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary },
  avatarText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  statusCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.navy, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...shadows.md },
  statusCardOnline: { backgroundColor: colors.primary },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotOnline: { backgroundColor: '#86EFAC' },
  statusDotOffline: { backgroundColor: '#94A3B8' },
  statusTitle: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: '#F1F5F9' },
  statusTitleOnline: { color: '#fff' },
  statusSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  statusSubOnline: { color: '#DCFCE7' },
  kpiGrid: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.xxl, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 1 },
  actionHero: { marginHorizontal: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.navy, padding: spacing.lg, position: 'relative', overflow: 'hidden', ...shadows.lg },
  actionDisabled: { opacity: 0.55 },
  actionHeroTag: { alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.md },
  actionHeroTagText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  actionHeroTitle: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: '#fff', marginBottom: 2 },
  actionHeroSub: { fontSize: 14, color: '#94A3B8' },
  actionHeroArrow: { position: 'absolute', right: spacing.lg, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  actionHeroArrowText: { color: '#fff' },
  actionRow: { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.xl, backgroundColor: colors.surface, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, position: 'relative', ...shadows.sm },
  actionRowTag: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4, marginBottom: spacing.sm },
  actionRowTagText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary },
  actionRowTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 2 },
  actionRowSub: { fontSize: 13, color: colors.textSecondary },
  actionRowArrow: { position: 'absolute', right: spacing.lg, top: '50%', marginTop: -10, color: colors.textMuted },
})

export default withScreenBoundary(Home, 'Home')
