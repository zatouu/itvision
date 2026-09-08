import { useState, useEffect } from 'react'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Image, TextInput } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiGetRetry, apiUpload, apiPatch, logoutApi } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import SideMenu from '../src/components/SideMenu'
import { clearAuth, getAuthUser, subscribeAuth, updateAuthUser } from '../src/auth'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { pickOption } from '../src/option-sheet'
import { clearAllUserData } from '../src/clear-user-data'
import LanguagePicker from '../src/components/LanguagePicker'
import { captureMedia, pickMedia, resolveMediaUrl } from '../src/media'
import { ChevronRight, Camera, Menu, Pencil, Phone } from 'lucide-react-native'
import { isPhoneLike, formatPhone, getInitials } from '../src/user-display'

function Profile() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { t } = useTranslation()
  const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0 })
  const [referral, setReferral] = useState<{ code: string; balance: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(getAuthUser())
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user?.name && !isPhoneLike(user.name) ? user.name : '')

  const displayedName = user?.name && !isPhoneLike(user.name) ? user.name : t('profile.defaultName')
  const displayPhone = formatPhone(user?.phone)

  useEffect(() => {
    const unsub = subscribeAuth(() => {
      setUser(getAuthUser())
      setNameValue(getAuthUser()?.name && !isPhoneLike(getAuthUser()!.name) ? getAuthUser()!.name : '')
    })
    return unsub
  }, [])

  const saveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) return
    setEditingName(false)
    try {
      await apiPatch('/api/users/me', { name: trimmed })
      await updateAuthUser({ name: trimmed })
      setUser(getAuthUser())
      setNameValue(trimmed)
      toast.success(t('common.save'), '')
    } catch (e: any) {
      toast.error('Erreur', humanErrorMessage(e))
    }
  }

  useEffect(() => {
    apiGet('/api/users/me')
      .then(r => {
        if (r.user) updateAuthUser(r.user)
        setUser(getAuthUser())
        const n = getAuthUser()?.name
        setNameValue(n && !isPhoneLike(n) ? n : '')
      })
      .catch(() => {})
  }, [])

  const promptAvatarSource = async (): Promise<'camera' | 'gallery' | 'avatar' | null> => {
    const key = await pickOption(t('profile.avatarTitle'), [
      { key: 'camera', label: t('profile.avatarCamera') },
      { key: 'gallery', label: t('profile.avatarGallery') },
      { key: 'avatar', label: t('profile.avatarGenerated') },
    ])
    return key === 'camera' || key === 'gallery' || key === 'avatar' ? key : null
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
      toast.error('Erreur', humanErrorMessage(e))
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

  const menuItem = (label: string, onPress: () => void, destructive = false) => (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.75}>
      <Text style={[s.menuText, destructive && { color: colors.danger }]}>{label}</Text>
      <ChevronRight size={18} color={destructive ? colors.danger : colors.textMuted} />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.iconBtn} accessibilityLabel="Menu">
          <Menu size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profile.title')}</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={s.identityCard}>
          <TouchableOpacity activeOpacity={0.85} onPress={changeAvatar} style={s.avatarWrap}>
            {user?.avatarUrl ? (
              <Image source={{ uri: resolveMediaUrl(user.avatarUrl) }} style={s.avatarImage} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{getInitials(user?.name || t('profile.defaultName'))}</Text>
              </View>
            )}
            <View style={s.cameraBadge}>
              <Camera size={14} color={colors.surface} />
            </View>
          </TouchableOpacity>

          <View style={s.nameBlock}>
            {editingName ? (
              <View style={s.nameEditRow}>
                <TextInput
                  style={s.nameInput}
                  value={nameValue}
                  onChangeText={setNameValue}
                  autoFocus
                  placeholder={t('profile.namePlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  maxLength={100}
                  onSubmitEditing={saveName}
                />
                <TouchableOpacity style={s.nameSaveBtn} onPress={saveName}>
                  <Text style={s.nameSaveText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.nameRow}>
                <Text style={s.name} numberOfLines={1}>{displayedName}</Text>
                <TouchableOpacity style={s.editIcon} onPress={() => setEditingName(true)} activeOpacity={0.7}>
                  <Pencil size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={s.phoneRow}>
              <Phone size={13} color={colors.textMuted} />
              <Text style={s.phone}>{displayPhone || user?.phone || ''}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
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

        {/* Referral */}
        {user?.referralCode && (
          <View style={s.referralCard}>
            <View style={s.referralHead}>
              <Text style={s.referralTitle}>{t('profile.referralTitle')}</Text>
              <Text style={s.referralSubtitle}>{t('profile.referralSubtitle')}</Text>
            </View>
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

        {/* Menu */}
        <View style={s.menuGroup}>
          {menuItem(t('profile.wallet'), () => router.push('/wallet'))}
          {menuItem(t('home.myRequests'), () => router.push('/my-requests'))}
        </View>

        {/* Language */}
        <View style={s.langCard}>
          <Text style={s.langTitle}>{t('profile.language')}</Text>
          <LanguagePicker />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={s.logoutBtn}
          onPress={async () => {
            await logoutApi()
            await clearAuth()
            await clearAllUserData()
            toast.info(t('auth.logout'), t('auth.logoutMsg', { defaultValue: 'Vous êtes déconnecté.' }))
            router.replace('/login')
          }}
          activeOpacity={0.75}
        >
          <Text style={s.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: '#111827', textAlign: 'center' },
  body: { padding: 20, paddingBottom: 40, gap: 18 },

  identityCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#0D1520', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.border },
  avatarText: { color: colors.surface, fontSize: 32, fontWeight: typography.weight.extrabold as any },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
  nameBlock: { alignItems: 'center', gap: 6, width: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.3 },
  editIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phone: { fontSize: 14, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', paddingHorizontal: 4 },
  nameInput: { flex: 1, fontSize: 18, fontWeight: typography.weight.bold as any, color: colors.text, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.slate50, textAlign: 'center' },
  nameSaveBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  nameSaveText: { color: colors.surface, fontWeight: typography.weight.bold as any, fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statNum: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: typography.weight.semibold as any, marginTop: 4 },

  menuGroup: { backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { flex: 1, fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text },

  langCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border },
  langTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text, marginBottom: 12 },

  referralCard: { backgroundColor: '#ECFDF5', borderRadius: 20, padding: 18, borderWidth: 1.5, borderColor: '#A7F3D0', gap: 14 },
  referralHead: { gap: 4 },
  referralTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: '#065F46' },
  referralSubtitle: { fontSize: 12, color: '#047857', lineHeight: 18, fontWeight: typography.weight.medium as any },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#D1FAE5' },
  referralCode: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: 3, flex: 1 },
  referralShareBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  referralShareText: { color: colors.surface, fontWeight: typography.weight.bold as any, fontSize: 13 },
  referralRow: { flexDirection: 'row', gap: 12 },
  referralStat: { flex: 1, alignItems: 'center' },
  referralStatNum: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: '#065F46' },
  referralStatLabel: { fontSize: 11, color: '#10B981', marginTop: 2, fontWeight: typography.weight.semibold as any },

  logoutBtn: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginTop: 8 },
  logoutText: { color: '#B91C1C', fontWeight: typography.weight.bold as any, fontSize: 15 },
})

export default withScreenBoundary(Profile, 'Profile')
