import { useState } from 'react'
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert, Platform, ActionSheetIOS,
} from 'react-native'
import { colors, spacing, radius, typography, shadows } from '../../design'
import { apiUpload, apiPatch } from '../../api'
import { captureMedia, pickMedia, resolveMediaUrl } from '../../media'
import { updateAuthUser, getAuthUser } from '../../auth'
import { Camera, Star, MapPin, ShieldCheck } from 'lucide-react-native'

type ProfileData = {
  user: any
  provider: any
  kyc: any
  reviews: { average: number; count: number }
}

export function ProfileHeader({
  data,
  onChange,
}: {
  data: ProfileData
  onChange: (user: any, provider: any) => void
}) {
  const user = data.user || {}
  const provider = data.provider || {}
  const [uploading, setUploading] = useState(false)

  const initials = (user.name || 'PR').slice(0, 2).toUpperCase()
  const verified = user.kycVerified || provider.kycVerified || data.kyc?.status === 'approved'

  const promptSource = async (): Promise<'camera' | 'gallery' | null> => {
    return new Promise((resolve) => {
      const options = ['Appareil photo', 'Galerie', 'Annuler']
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 2, title: 'Photo' },
          (idx) => resolve(idx === 0 ? 'camera' : idx === 1 ? 'gallery' : null)
        )
      } else {
        Alert.alert('Photo', '', [
          { text: options[0], onPress: () => resolve('camera') },
          { text: options[1], onPress: () => resolve('gallery') },
          { text: options[2], style: 'cancel', onPress: () => resolve(null) },
        ])
      }
    })
  }

  const uploadImage = async (field: 'avatarUrl' | 'coverUrl') => {
    try {
      const source = await promptSource()
      if (!source) return
      setUploading(true)
      const assets = source === 'camera' ? await captureMedia() : await pickMedia({ maxFiles: 1 })
      if (!assets.length) return setUploading(false)
      const file = assets[0]
      const uploaded = await apiUpload(file.uri, file.name, 'image/jpeg', 'avatars')
      const url = uploaded.staticUrl || uploaded.url
      if (field === 'avatarUrl') {
        await apiPatch('/api/users/me', { avatarUrl: url })
        await updateAuthUser({ avatarUrl: url })
        onChange({ ...user, avatarUrl: url }, provider)
      } else {
        const r = await apiPatch('/api/provider/profile', { provider: { coverUrl: url } })
        onChange(r.user, r.provider)
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Impossible de mettre à jour la photo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <View style={s.header}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => uploadImage('coverUrl')} style={s.coverWrap}>
        {provider.coverUrl ? (
          <Image source={{ uri: resolveMediaUrl(provider.coverUrl) }} style={s.cover} />
        ) : (
          <View style={[s.cover, s.coverEmpty]} />
        )}
        <View style={s.coverEdit}>
          <Camera size={16} color="#fff" />
        </View>
      </TouchableOpacity>

      <View style={s.avatarBox}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => uploadImage('avatarUrl')} style={s.avatarWrap}>
          {user.avatarUrl ? (
            <Image source={{ uri: resolveMediaUrl(user.avatarUrl) }} style={s.avatar} />
          ) : (
            <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          )}
          <View style={s.avatarEdit}><Camera size={14} color="#fff" /></View>
        </TouchableOpacity>
        <View style={s.nameRow}>
          <Text style={s.name}>{user.name || 'Prestataire'}</Text>
          {verified && <ShieldCheck size={18} color={colors.success} />}
        </View>
        <Text style={s.meta}>{user.phone || user.email || ''}</Text>
        {verified ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>Prestataire vérifié</Text>
          </View>
        ) : null}

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{data.reviews?.average || 0}</Text>
            <View style={s.statRow}>
              <Star size={12} color={colors.warning} />
              <Text style={s.statLabel}>{data.reviews?.count || 0} avis</Text>
            </View>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{user.providerStats?.completedMissions || 0}</Text>
            <Text style={s.statLabel}>missions</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{user.providerStats?.reliabilityScore ?? 100}</Text>
            <Text style={s.statLabel}>fiabilité</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{user.referralBalance?.toLocaleString('fr-FR') || 0}</Text>
            <Text style={s.statLabel}>FCFA</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: { marginBottom: spacing.md },
  coverWrap: { height: 140, backgroundColor: colors.primary, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  coverEmpty: { backgroundColor: colors.primaryLight },
  coverEdit: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBox: {
    alignItems: 'center',
    marginTop: -40,
    paddingHorizontal: spacing.lg,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: typography.weight.extrabold },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  name: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.bold, color: colors.text },
  meta: { fontSize: typography.base.fontSize, color: colors.textSecondary, marginTop: spacing.xs },
  badge: {
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
  },
  badgeText: { color: colors.success, fontWeight: typography.weight.bold, fontSize: typography.sm.fontSize },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    ...shadows.md,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },
  statNum: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold, color: colors.text },
  statLabel: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
})
