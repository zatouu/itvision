import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiGetRetry } from '../src/api'
import TabBar from '../src/components/TabBar'
import { subscribeProfile } from '../src/user-profile'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { clearAuth, getAuthUser, subscribeAuth } from '../src/auth'
import { resetSocket } from '../src/socket'
import { resetNotificationBinding } from '../src/notifications'
import LanguagePicker from '../src/components/LanguagePicker'

const KYC_META: Record<string, { key: string; color: string; bg: string }> = {
  approved: { key: 'profile.kycVerified', color: '#065F46', bg: '#ECFDF5' },
  pending: { key: 'profile.kycPending', color: '#92400E', bg: '#FFFBEB' },
  rejected: { key: 'profile.kycRejected', color: '#991B1B', bg: '#FEF2F2' },
  none: { key: 'profile.kycNone', color: '#64748B', bg: '#F1F5F9' },
}

const MENU: { icon: string; labelKey: string; path: string }[] = [
  { icon: 'W', labelKey: 'profile.wallet', path: '/wallet' },
  { icon: 'O', labelKey: 'offers.title', path: '/my-offers' },
  { icon: 'K', labelKey: 'profile.kyc', path: '/kyc' },
]

function Profile() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, accepted: 0, revenue: 0 })
  const [referral, setReferral] = useState<{ code: string; balance: number; count: number } | null>(null)
  const [profileName, setProfileName] = useState('')
  const [user, setUser] = useState(getAuthUser())
  const [kycStatus, setKycStatus] = useState<string>('none')
  const [isBusy, setIsBusy] = useState(false)

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
        const busy = items.some((i: any) => i.status === 'in_progress')
        setStats({ total: items.length, accepted, revenue })
        setIsBusy(busy)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiGetRetry('/api/auth/referral')
      .then(r => {
        setReferral({ code: r.referralCode, balance: r.referralBalance, count: r.referralCount })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    apiGet('/api/kyc/status')
      .then(r => {
        const status = r?.status || r?.kycStatus || 'none'
        if (typeof status === 'string') setKycStatus(status)
      })
      .catch(() => {})
  }, [])

  const kycMeta = KYC_META[kycStatus] || KYC_META.none

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.avatarBox}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{profileName ? profileName.slice(0, 2).toUpperCase() : 'PR'}</Text>
          </View>
          <Text style={s.name}>{profileName || 'Prestataire'}</Text>
          <View style={s.badgeRow}>
            <View style={[s.statusBadge, { backgroundColor: isBusy ? '#FEF2F2' : '#ECFDF5' }]}>
              <View style={[s.statusDot, { backgroundColor: isBusy ? '#DC2626' : '#16A34A' }]} />
              <Text style={[s.statusText, { color: isBusy ? '#991B1B' : '#065F46' }]}>
                {isBusy ? t('profile.statusBusy') : t('profile.statusAvailable')}
              </Text>
            </View>
            <View style={[s.kycBadge, { backgroundColor: kycMeta.bg }]}>
              <Text style={[s.kycText, { color: kycMeta.color }]}>{t(kycMeta.key)}</Text>
            </View>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLabel}>{t('offers.title')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.accepted}</Text>
            <Text style={s.statLabel}>Acceptées</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.revenue.toLocaleString('fr-FR')}</Text>
            <Text style={s.statLabel}>FCFA</Text>
          </View>
        </View>

        {/* Referral card */}
        {user?.referralCode && (
          <View style={s.referralCard}>
            <Text style={s.referralTitle}>{t('profile.referralTitle')}</Text>
            <Text style={s.referralSubtitle}>{t('profile.referralSubtitle')}</Text>
            <View style={s.referralCodeBox}>
              <Text style={s.referralCode}>{user.referralCode}</Text>
              <TouchableOpacity
                style={s.referralShareBtn}
                onPress={() => Share.share({ message: `Rejoins-moi sur Xeuy Bi Pro ! Utilise mon code ${user.referralCode} et gagne 1 000 FCFA. Télécharge l'app ici : https://xeuy.sn/pro` })}
              >
                <Text style={s.referralShareText}>{t('profile.referralShare')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.referralRow}>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{user.referralBalance || 0} FCFA</Text>
                <Text style={s.referralStatLabel}>{t('profile.referralEarned')}</Text>
              </View>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{referral?.count || 0}</Text>
                <Text style={s.referralStatLabel}>{t('profile.referralCount')}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={s.menuBox}>
          {MENU.map(m => (
            <TouchableOpacity key={m.path} style={s.menuItem} onPress={() => router.push(m.path)}>
              <View style={s.menuIcon}><Text style={s.menuIconText}>{m.icon}</Text></View>
              <Text style={s.menuText}>{t(m.labelKey)}</Text>
              <Text style={s.menuArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.languageBox}>
          <Text style={s.languageLabel}>{t('profile.language')}</Text>
          <LanguagePicker />
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={async () => { await clearAuth(); resetSocket(); resetNotificationBinding(); router.replace('/login') }}>
          <Text style={s.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <TabBar active="profile" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: '#111827', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
  body: { padding: 20, gap: 18 },
  avatarBox: { alignItems: 'center', gap: 10, marginVertical: 12 },
  avatar: { width: 88, height: 88, borderRadius: 32, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '800' },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  kycText: { fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', gap: 4 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  menuBox: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuIconText: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  menuText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#111827' },
  menuArrow: { fontSize: 18, color: '#94A3B8', fontWeight: '700' },
  languageBox: { backgroundColor: '#fff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  languageLabel: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  referralCard: { backgroundColor: '#FFFBEB', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#FDE68A', gap: 12 },
  referralTitle: { fontSize: 17, fontWeight: '800', color: '#92400E' },
  referralSubtitle: { fontSize: 13, color: '#B45309', lineHeight: 19 },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#FDE68A' },
  referralCode: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: 3, flex: 1 },
  referralShareBtn: { backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  referralShareText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  referralRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  referralStat: { flex: 1, alignItems: 'center' },
  referralStatNum: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  referralStatLabel: { fontSize: 11, color: '#D97706', fontWeight: '600', marginTop: 2 },
  logoutBtn: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginTop: 8 },
  logoutText: { color: '#B91C1C', fontWeight: '800', fontSize: 15 },
})

export default withScreenBoundary(Profile, 'Profile')
