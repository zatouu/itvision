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

export default function Home() {
  const [online, setOnline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hour] = useState(new Date().getHours())
  const [providerName, setProviderName] = useState('')
  const [nearbyCount, setNearbyCount] = useState(0)
  const gpsInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return subscribeProfile(p => setProviderName(p?.name?.split(' ')[0] || ''))
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
      } catch { /* silent: don't block if GPS fails */ }
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

  const handleToggle = async () => {
    if (busy) return
    setBusy(true)
    try { await toggleOnline() } finally { setBusy(false) }
  }

  const goNearby = () => {
    if (!online) {
      Alert.alert('Vous êtes hors ligne', 'Passez en ligne pour recevoir les demandes proches.')
      return
    }
    setNearbyCount(0)
    router.push('/nearby-requests')
  }

  const greeting = (hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir') + (providerName ? `, ${providerName}` : '')

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.appName}>Ligey Prestataire</Text>
            <Text style={s.sub}>{greeting}, prêt à travailler ?</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={s.bellBtn} accessibilityLabel="Notifications">
            <Text style={s.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        <OfflineQueueBadge />

        {/* Statut Online / Offline */}
        <View style={[s.statusCard, online && s.statusCardOnline]}>
          <View style={s.statusLeft}>
            <View style={[s.dot, online ? s.dotOnline : s.dotOffline]} />
            <View>
              <Text style={[s.statusTitle, online && s.statusTitleOnline]}>
                {online ? 'En ligne' : 'Hors ligne'}
              </Text>
              <Text style={[s.statusSub, online && s.statusSubOnline]}>
                {online ? 'Visible par les clients proches' : 'Activez pour recevoir des demandes'}
              </Text>
            </View>
          </View>
          <Switch
            value={online}
            onValueChange={handleToggle}
            disabled={busy}
            trackColor={{ false: '#334155', true: '#16A34A' }}
            thumbColor='#fff'
          />
        </View>

        {/* Actions rapides */}
        <Text style={s.sectionTitle}>Actions</Text>
        <View style={s.actions}>
          <TouchableOpacity style={[s.actionCard, s.actionPrimary, !online && s.actionDisabled]} onPress={goNearby} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={s.actionTag}><Text style={s.actionTagText}>Nouveautés</Text></View>
              {nearbyCount > 0 && (
                <View style={s.nearbyBadge}><Text style={s.nearbyBadgeText}>{nearbyCount}</Text></View>
              )}
            </View>
            <Text style={s.actionTitle}>Demandes proches</Text>
            <Text style={s.actionSub}>Parcourir et soumettre des offres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionCard, s.actionSecondary]} onPress={() => router.push('/my-offers')} activeOpacity={0.85}>
            <View style={[s.actionTag, s.actionTagDark]}><Text style={[s.actionTagText, s.actionTagTextDark]}>Suivi</Text></View>
            <Text style={s.actionTitleDark}>Mes offres envoyées</Text>
            <Text style={s.actionSubDark}>Acceptées, en attente, refusées</Text>
          </TouchableOpacity>
        </View>

        {/* Conseil */}
        <View style={s.tipCard}>
          <View style={s.tipDot} />
          <View style={{ flex: 1 }}>
            <Text style={s.tipTitle}>Conseil</Text>
            <Text style={s.tipText}>Proposez un prix compétitif dès les premières minutes pour maximiser vos chances d'être sélectionné.</Text>
          </View>
        </View>

      </ScrollView>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  appName: { fontSize: 20, fontWeight: '700', color: '#0F172A', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: '#64748B', marginTop: 3 },
  iconBtn: { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  iconBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  bellBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  bellIcon: { fontSize: 16 },
  statusCard: { marginHorizontal: 20, marginBottom: 28, borderRadius: 14, backgroundColor: '#1E293B', padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusCardOnline: { backgroundColor: '#14532D' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOnline: { backgroundColor: '#4ADE80' },
  dotOffline: { backgroundColor: '#475569' },
  statusTitle: { fontSize: 15, fontWeight: '700', color: '#CBD5E1' },
  statusTitleOnline: { color: '#DCFCE7' },
  statusSub: { fontSize: 12, color: '#475569', marginTop: 2 },
  statusSubOnline: { color: '#86EFAC' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#64748B', paddingHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  actions: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionCard: { borderRadius: 12, padding: 18, gap: 4 },
  actionPrimary: { backgroundColor: '#0F172A' },
  actionDisabled: { opacity: 0.5 },
  actionSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  actionTag: { alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 },
  actionTagDark: { backgroundColor: '#F1F5F9' },
  actionTagText: { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  actionTagTextDark: { color: '#475569' },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  actionTitleDark: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  actionSub: { fontSize: 12, color: '#64748B' },
  actionSubDark: { fontSize: 12, color: '#64748B' },
  tipCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24 },
  tipDot: { width: 4, height: '100%' as any, backgroundColor: '#2563EB', borderRadius: 2, marginTop: 2 },
  tipTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipText: { fontSize: 13, color: '#475569', lineHeight: 19 },
  nearbyBadge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  nearbyBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
})
