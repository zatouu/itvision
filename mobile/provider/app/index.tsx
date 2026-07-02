import { Text, View, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert } from 'react-native'
import { useEffect, useState, useRef } from 'react'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadInitial, toggleOnline, subscribe } from '../src/online'
import TabBar from '../src/components/TabBar'
import { subscribeProfile } from '../src/user-profile'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import { emitGps, onNearbyRequest } from '../src/socket'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'
import { apiGet } from '../src/api'
import { getAuthUser } from '../src/auth'

const RADIUS_KM = 10

function greetingByHour(t: any): string {
  const h = new Date().getHours()
  if (h < 5) return t('home.greeting_night')
  if (h < 12) return t('home.greeting_morning')
  if (h < 18) return t('home.greeting_afternoon')
  return t('home.greeting_evening')
}

function Home() {
  const { t } = useTranslation()
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [providerName, setProviderName] = useState('')
  const [initials, setInitials] = useState('')
  const [nearbyCount, setNearbyCount] = useState(0)
  const [pendingOffers, setPendingOffers] = useState(0)
  const [activeMission, setActiveMission] = useState(0)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const gpsInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const u = getAuthUser()
    const name = u?.name?.split(' ')[0] || ''
    setInitials((u?.name || '??').slice(0, 2).toUpperCase())
    const unsub = subscribeProfile(p => {
      const n = p?.name?.split(' ')[0] || ''
      setProviderName(n)
      if (n) setInitials((p?.name || '').slice(0, 2).toUpperCase())
    })
    if (name) setProviderName(name)
    return unsub
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

  // Emit GPS every 60s while online for geofencing
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

  // Listen for geofenced nearby request push
  useEffect(() => {
    const unsub = onNearbyRequest(() => setNearbyCount(c => c + 1))
    return unsub
  }, [])

  // Charger les KPI
  useEffect(() => {
    let mounted = true
    const loadKpi = async () => {
      try {
        const pos = await Location.getLastKnownPositionAsync()
        const c = pos?.coords
        const nearbyPromise = c
          ? apiGet(`/api/services/matching?lat=${c.latitude}&lng=${c.longitude}&radiusKm=${RADIUS_KM}`).then(r => r.items?.length || 0)
          : Promise.resolve(0)
        const [offersRes, requestsRes] = await Promise.all([
          apiGet('/api/services/offers?mine=1').catch(() => ({ items: [] })),
          apiGet('/api/services/requests?mine=1').catch(() => ({ items: [] })),
        ])
        const offers = offersRes.items || []
        const requests = requestsRes.items || []
        if (!mounted) return
        setNearbyCount(await nearbyPromise)
        setPendingOffers(offers.filter((o: any) => o.status === 'submitted').length)
        setActiveMission(requests.filter((r: any) => ['assigned', 'provider_arriving', 'in_progress'].includes(r.status)).length)
        setDailyRevenue(requests.filter((r: any) => r.status === 'completed' && r.payment?.status === 'released').reduce((sum: number, r: any) => sum + (Number(r.acceptedOffer?.price) || 0), 0))
      } catch { /* silencieux */ }
    }
    loadKpi()
    return () => { mounted = false }
  }, [online])

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    try { await toggleOnline() } finally { setBusy(false) }
  }

  const goNearby = () => {
    if (!online) {
      Alert.alert(t('home.offlineAlert'), t('home.offlineAlertMsg'))
      return
    }
    router.push('/nearby-requests')
  }

  const isPhoneName = (name: string) => /^[\d\s+\-]+$/.test(name)
  const greeting = greetingByHour(t) + (providerName && !isPhoneName(providerName) ? `, ${providerName}` : '')

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>{greeting}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={() => router.push('/notifications')} style={s.iconBtn} accessibilityLabel="Notifications">
              <Text style={s.iconBtnText}>N</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')} style={s.avatarChip} accessibilityLabel="Profil">
              <Text style={s.avatarText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Statut en ligne */}
        <View style={[s.statusCard, online && s.statusCardOnline]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, online ? s.statusDotOnline : s.statusDotOffline]} />
            <View>
              <Text style={[s.statusTitle, online && s.statusTitleOnline]}>
                {online ? t('home.online') : t('home.offline')}
              </Text>
              <Text style={[s.statusSub, online && s.statusSubOnline]}>
                {online ? t('home.visibleRadius', { radius: RADIUS_KM }) : t('home.activateToReceive')}
              </Text>
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
          <TouchableOpacity style={s.kpiCard} onPress={goNearby} activeOpacity={0.85}>
            <View style={[s.kpiIcon, { backgroundColor: '#EFF6FF' }]}><Text style={[s.kpiIconText, { color: '#3B82F6' }]}>P</Text></View>
            <Text style={s.kpiValue}>{nearbyCount}</Text>
            <Text style={s.kpiLabel}>{t('home.nearbyRequests')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.kpiCard} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
            <View style={[s.kpiIcon, { backgroundColor: '#FFFBEB' }]}><Text style={[s.kpiIconText, { color: '#D97706' }]}>O</Text></View>
            <Text style={s.kpiValue}>{pendingOffers}</Text>
            <Text style={s.kpiLabel}>{t('home.pendingOffers')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.kpiCard} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
            <View style={[s.kpiIcon, { backgroundColor: '#ECFDF5' }]}><Text style={[s.kpiIconText, { color: '#16A34A' }]}>M</Text></View>
            <Text style={s.kpiValue}>{activeMission}</Text>
            <Text style={s.kpiLabel}>{t('home.activeMission')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.kpiCard} onPress={() => router.push('/wallet')} activeOpacity={0.85}>
            <View style={[s.kpiIcon, { backgroundColor: '#F5F3FF' }]}><Text style={[s.kpiIconText, { color: '#8B5CF6' }]}>R</Text></View>
            <Text style={s.kpiValue}>{dailyRevenue.toLocaleString('fr-FR')}</Text>
            <Text style={s.kpiLabel}>{t('home.dailyRevenue')}</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <Text style={s.sectionTitle}>{t('home.actions')}</Text>
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionCard, s.actionHero, !online && s.actionDisabled]} onPress={goNearby} activeOpacity={0.85}>
            <View style={s.actionHeader}>
              <View style={[s.actionTag, s.actionTagPrimary]}><Text style={s.actionTagText}>{t('home.newBadge')}</Text></View>
              <Text style={s.actionArrow}>›</Text>
            </View>
            <Text style={s.actionTitle}>{t('home.nearbyRequests')}</Text>
            <Text style={s.actionSub}>{t('home.browseAndOffer')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionCard} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
            <View style={s.actionHeader}>
              <View style={[s.actionTag, s.actionTagDark]}><Text style={s.actionTagTextDark}>{t('home.trackingBadge')}</Text></View>
              <Text style={s.actionArrowDark}>›</Text>
            </View>
            <Text style={[s.actionTitle, s.actionTitleDark]}>{t('home.myOffersSent')}</Text>
            <Text style={[s.actionSub, s.actionSubDark]}>{t('home.acceptedPendingRejected')}</Text>
          </TouchableOpacity>
          <View style={s.tipCard}>
            <View style={[s.tipIcon, { backgroundColor: '#ECFDF5' }]}><Text style={[s.tipIconText, { color: '#16A34A' }]}>!</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.tipTitle}>{t('home.tip')}</Text>
              <Text style={s.tipText}>{t('home.tipText')}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  iconBtnText: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  avatarChip: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  statusCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, backgroundColor: '#0F172A', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusCardOnline: { backgroundColor: '#0F7B4F' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotOnline: { backgroundColor: '#86EFAC' },
  statusDotOffline: { backgroundColor: '#94A3B8' },
  statusTitle: { fontSize: 18, fontWeight: '800', color: '#F8FAFC' },
  statusTitleOnline: { color: '#fff' },
  statusSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  statusSubOnline: { color: '#D1FAE5' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  kpiCard: { width: '47.5%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiIconText: { fontSize: 16, fontWeight: '800' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748B', paddingHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  actions: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { borderRadius: 16, padding: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  actionHero: { backgroundColor: '#0A1628', borderColor: '#0A1628' },
  actionDisabled: { opacity: 0.5 },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  actionTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  actionTagPrimary: { backgroundColor: '#2563EB' },
  actionTagDark: { backgroundColor: '#F1F5F9' },
  actionTagText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  actionTagTextDark: { fontSize: 10, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  actionTitle: { fontSize: 17, fontWeight: '800', color: '#F8FAFC' },
  actionTitleDark: { color: '#0F172A' },
  actionSub: { fontSize: 13, color: '#94A3B8', marginTop: 3 },
  actionSubDark: { color: '#64748B' },
  actionArrow: { fontSize: 22, color: '#F8FAFC', fontWeight: '300' },
  actionArrowDark: { fontSize: 22, color: '#0F172A', fontWeight: '300' },
  tipCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  tipIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tipIconText: { fontSize: 16, fontWeight: '800' },
  tipTitle: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipText: { fontSize: 13, color: '#475569', lineHeight: 19 },
})

export default withScreenBoundary(Home, 'Home')
