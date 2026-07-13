import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Image, Alert, Platform, ActionSheetIOS } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiGetRetry, apiUpload, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import TabBar from '../src/components/TabBar'
import { clearAuth, getAuthUser, subscribeAuth, updateAuthUser } from '../src/auth'
import { resetSocket } from '../src/socket'
import { resetNotificationBinding } from '../src/notifications'
import LanguagePicker from '../src/components/LanguagePicker'
import { captureMedia, pickMedia, resolveMediaUrl } from '../src/media'
import { ArrowLeft, ChevronRight, Camera } from 'lucide-react-native'

function Profile() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0 })
  const [referral, setReferral] = useState<{ code: string; balance: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getAuthUser())

  useEffect(() => {
    const unsub = subscribeAuth(() => setUser(getAuthUser()))
    return unsub
  }, [])

  useEffect(() => {
    apiGet('/api/users/me')
      .then(r => {
        if (r.user) updateAuthUser(r.user)
        setUser(getAuthUser())
      })
      .catch(() => {})
  }, [])

  const promptAvatarSource = (): Promise<'camera' | 'gallery' | 'avatar' | null> => {
    return new Promise((resolve) => {
      const options = [t('profile.avatarCamera'), t('profile.avatarGallery'), t('profile.avatarGenerated'), t('common.cancel')]
      const actions: Array<'camera' | 'gallery' | 'avatar' | null> = ['camera', 'gallery', 'avatar', null]
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 3, title: t('profile.avatarTitle') },
          (idx) => resolve(actions[idx] ?? null)
        )
      } else {
        Alert.alert(t('profile.avatarTitle'), '', [
          { text: options[0], onPress: () => resolve('camera') },
          { text: options[1], onPress: () => resolve('gallery') },
          { text: options[2], onPress: () => resolve('avatar') },
          { text: options[3], style: 'cancel', onPress: () => resolve(null) },
        ], { cancelable: true })
      }
    })
  }

  const changeAvatar = async () => {
    try {
      const source = await promptAvatarSource()
      if (!source) return

      if (source === 'avatar') {
        await apiPatch('/api/users/me', { avatarUrl: '' })
        await updateAuthUser({ avatarUrl: '' })
        setUser(getAuthUser())
        return
      }

      const assets = source === 'camera'
        ? await captureMedia({ selfie: true })
        : await pickMedia({ maxFiles: 1 })
      if (!assets.length) return

      const file = assets[0]
      const contentType = file.type === 'video' ? 'video/mp4' : 'image/jpeg'
      const uploaded = await apiUpload(file.uri, file.name, contentType, 'avatars')
      const avatarUrl = uploaded.staticUrl || uploaded.url
      await apiPatch('/api/users/me', { avatarUrl })
      await updateAuthUser({ avatarUrl })
      setUser(getAuthUser())
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de mettre à jour la photo')
    }
  }

  useEffect(() => {
    apiGet('/api/services/requests?mine=1')
      .then(r => {
        const items = r.items || []
        const completed = items.filter((i: any) => i.status === 'completed').length
        const cancelled = items.filter((i: any) => i.status === 'cancelled').length
        setStats({ total: items.length, completed, cancelled })
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
          <ArrowLeft size={18} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profile.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={s.avatarBox}>
          <TouchableOpacity activeOpacity={0.9} onPress={changeAvatar} style={s.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: resolveMediaUrl(user.avatarUrl) }} style={s.avatarImage} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{user?.name ? user.name.slice(0, 2).toUpperCase() : t('profile.defaultName').slice(0, 2).toUpperCase()}</Text>
              </View>
            )}
            <View style={s.cameraBadge}>
              <Camera size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={s.name}>{user?.name || t('profile.defaultName')}</Text>
          <Text style={s.phone}>{user?.phone || ''}</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.total}</Text>
            <Text style={s.statLabel}>{t('profile.statRequests')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.completed}</Text>
            <Text style={s.statLabel}>{t('profile.statCompleted')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.cancelled}</Text>
            <Text style={s.statLabel}>{t('profile.statCancelled')}</Text>
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
                onPress={() => Share.share({ message: t('profile.referralShareMessage', { code: user.referralCode }) })}
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

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/wallet')}>
          <Text style={s.menuText}>{t('profile.wallet')}</Text>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        <TouchableOpacity style={s.menuItem} onPress={() => router.push('/my-requests')}>
          <Text style={s.menuText}>{t('home.myRequests')}</Text>
          <ChevronRight size={18} color="#94A3B8" />
        </TouchableOpacity>

        <View style={{ marginVertical: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 }}>{t('profile.language')}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { color: '#111827' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { padding: 20, gap: 20 },
  avatarBox: { alignItems: 'center', gap: 8, marginVertical: 16 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E2E8F0' },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 14, color: '#64748B' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  menuArrow: { color: '#94A3B8' },
  referralCard: { backgroundColor: '#ECFDF5', borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: '#A7F3D0', gap: 10 },
  referralTitle: { fontSize: 16, fontWeight: '800', color: '#065F46' },
  referralSubtitle: { fontSize: 12, color: '#047857', lineHeight: 18 },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  referralCode: { fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: 3, flex: 1 },
  referralShareBtn: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  referralShareText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  referralRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  referralStat: { flex: 1, alignItems: 'center' },
  referralStatNum: { fontSize: 15, fontWeight: '800', color: '#065F46' },
  referralStatLabel: { fontSize: 11, color: '#10B981', marginTop: 2 },
  logoutBtn: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginTop: 8 },
  logoutText: { color: '#B91C1C', fontWeight: '700', fontSize: 15 },
})

export default withScreenBoundary(Profile, 'Profile')
