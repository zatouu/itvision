import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiGetRetry } from '../src/api'
import TabBar from '../src/components/TabBar'
import { subscribeProfile } from '../src/user-profile'
import { clearAuth, getAuthUser, subscribeAuth } from '../src/auth'
import { resetSocket } from '../src/socket'
import LanguagePicker from '../src/components/LanguagePicker'

export default function Profile() {
  const [stats, setStats] = useState({ total: 0, accepted: 0, revenue: 0 })
  const [referral, setReferral] = useState<{ code: string; balance: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileName, setProfileName] = useState('')
  const [user, setUser] = useState(getAuthUser())

  useEffect(() => {
    return subscribeProfile(p => setProfileName(p?.name || ''))
  }, [])

  useEffect(() => {
    const unsub = subscribeAuth(() => setUser(getAuthUser()))
    return unsub
  }, [])

  useEffect(() => {
    apiGet('/api/services/offers?mine=1')
      .then(r => {
        const items = r.items || []
        const accepted = items.filter((i: any) => i.status === 'accepted' || i.status === 'in_progress' || i.status === 'completed').length
        const revenue = items
          .filter((i: any) => i.status === 'completed' || i.status === 'accepted')
          .reduce((sum: number, i: any) => sum + (i.price || 0), 0)
        setStats({ total: items.length, accepted, revenue })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiGetRetry('/api/auth/referral')
      .then(r => {
        setReferral({ code: r.referralCode, balance: r.referralBalance, count: r.referralCount })
      })
      .catch(() => {})
  }, [])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon profil</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.avatarBox}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profileName ? profileName.slice(0, 2).toUpperCase() : 'PR'}</Text>
          </View>
          <Text style={s.name}>{profileName || 'Prestataire'}</Text>
          <Text style={s.meta}>Disponible · Zone Dakar</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLabel}>Offres</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.accepted}</Text>
            <Text style={s.statLabel}>Acceptées</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.revenue.toLocaleString('fr-FR')}</Text>
            <Text style={s.statLabel}>Revenus (FCFA)</Text>
          </View>
        </View>

        {/* Referral card */}
        {user?.referralCode && (
          <View style={s.referralCard}>
            <Text style={s.referralTitle}>Parrainage</Text>
            <Text style={s.referralSubtitle}>Invite d'autres prestataires et gagne 1 000 FCFA quand ils complètent leur première mission</Text>
            <View style={s.referralCodeBox}>
              <Text style={s.referralCode}>{user.referralCode}</Text>
              <TouchableOpacity
                style={s.referralShareBtn}
                onPress={() => Share.share({ message: `Rejoins-moi sur Ligey Pro ! Utilise mon code ${user.referralCode} et gagne 1 000 FCFA. Télécharge l'app ici : https://ligey.sn/pro` })}
              >
                <Text style={s.referralShareText}>Partager</Text>
              </TouchableOpacity>
            </View>
            <View style={s.referralRow}>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{user.referralBalance || 0} FCFA</Text>
                <Text style={s.referralStatLabel}>Gagnés</Text>
              </View>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{referral?.count || 0}</Text>
                <Text style={s.referralStatLabel}>Parrainages</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/wallet')}>
          <Text style={s.menuText}>Mon portefeuille (points)</Text>
          <Text style={s.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/my-offers')}>
          <Text style={s.menuText}>Mes offres</Text>
          <Text style={s.menuArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/kyc')}>
          <Text style={s.menuText}>Vérification KYC</Text>
          <Text style={s.menuArrow}>→</Text>
        </TouchableOpacity>

        <View style={{ marginVertical: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 }}>Langue / Language</Text>
          <LanguagePicker />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={async () => { await clearAuth(); resetSocket(); router.replace('/login') }}>
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </ScrollView>

      <TabBar active="profile" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { fontSize: 18, color: '#111827' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { padding: 20, gap: 20 },
  avatarBox: { alignItems: 'center', gap: 8, marginVertical: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 14, color: '#64748B' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statNum: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  menuArrow: { fontSize: 16, color: '#94A3B8' },
  referralCard: { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: '#FDE68A', gap: 10 },
  referralTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  referralSubtitle: { fontSize: 12, color: '#B45309', lineHeight: 18 },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#FDE68A' },
  referralCode: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: 3, flex: 1 },
  referralShareBtn: { backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  referralShareText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  referralRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  referralStat: { flex: 1, alignItems: 'center' },
  referralStatNum: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  referralStatLabel: { fontSize: 11, color: '#D97706', marginTop: 2 },
  logoutBtn: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginTop: 8 },
  logoutText: { color: '#B91C1C', fontWeight: '700', fontSize: 15 },
})
