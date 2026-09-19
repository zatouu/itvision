import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Image } from 'expo-image'
import QRCode from 'react-native-qrcode-svg'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import AppHeader from '../src/components/AppHeader'
import Skeleton from '../src/components/Skeleton'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { getCategoryLabel, loadCategories } from '../src/categories'
import { resolveMediaUrl } from '../src/media'
import { getInitials } from '../src/user-display'
import { hapticLight } from '../src/haptics'
import {
  Phone, ShieldCheck, Clock3, Star, Briefcase, Award, Share2, MapPin, QrCode,
} from 'lucide-react-native'
import { colors, spacing, radius, typography, fonts, shadows } from '../src/design'

function ProPassport() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [catLabels, setCatLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    loadCategories()
      .then(cats => {
        const m: Record<string, string> = {}
        cats.forEach(c => { m[c.slug] = getCategoryLabel(c, i18n.language) })
        setCatLabels(m)
      })
      .catch(() => {})

    apiGet('/api/provider/profile')
      .then(r => setData(r))
      .catch(e => toast.error(t('common.error'), humanErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const user = data?.user || {}
  const provider = data?.provider || {}
  const reviews = data?.reviews || { average: 0, count: 0 }
  const stats = user.providerStats || {}

  const passportId = `XEUY-${String(user._id || '').slice(-6).toUpperCase() || '000000'}`
  const qrPayload = JSON.stringify({
    t: 'xeuy-passport',
    v: 1,
    uid: user._id,
    name: user.name,
    verified: !!provider.kycVerified || !!user.kycVerified,
  })

  const trades: string[] = (provider.serviceCategories || [])
    .map((slug: string) => catLabels[slug] || slug)
    .slice(0, 3)
  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : null
  const identityVerified = !!(provider.kycVerified || user.kycVerified)

  const share = async () => {
    hapticLight()
    const line1 = `${user.name} — ${trades.join(', ') || t('passport.fallbackTrade', { defaultValue: 'Prestataire' })}`
    const line2 = identityVerified ? `✓ ${t('passport.identityVerified')}` : ''
    const line3 = `ID ${passportId} · Xeuy Bi`
    try {
      await Share.share({ message: [line1, line2, line3].filter(Boolean).join('\n') })
    } catch { /* annulé */ }
  }

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader title={t('passport.title', { defaultValue: 'Passeport pro' })} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <>
            <Skeleton height={220} radius={radius.xl} />
            <Skeleton height={240} radius={radius.xl} style={{ marginTop: spacing.md }} />
          </>
        ) : (
          <>
            {/* Carte identité */}
            <View style={s.idCard}>
              <View style={s.idTop}>
                <View style={s.avatarWrap}>
                  {user.avatarUrl ? (
                    <Image source={{ uri: resolveMediaUrl(user.avatarUrl) }} style={s.avatar} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarText}>{getInitials(user.name)}</Text>
                    </View>
                  )}
                  {identityVerified && (
                    <View style={s.verifiedDot}>
                      <ShieldCheck size={11} color="#fff" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <View style={s.idInfo}>
                  <Text style={s.name} numberOfLines={1}>{user.name || '—'}</Text>
                  <Text style={s.trade} numberOfLines={1}>
                    {trades.length > 0 ? trades.join(' · ') : t('passport.fallbackTrade', { defaultValue: 'Prestataire de services' })}
                  </Text>
                  {provider.zone?.city ? (
                    <View style={s.locRow}>
                      <MapPin size={11} color="rgba(255,255,255,0.75)" />
                      <Text style={s.locText} numberOfLines={1}>{provider.zone.city}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Badges de confiance */}
              <View style={s.badgeRow}>
                <View style={s.badge}>
                  <Phone size={11} color="#A7F3D0" />
                  <Text style={s.badgeText}>{t('passport.phoneVerified')}</Text>
                </View>
                <View style={[s.badge, !identityVerified && s.badgePending]}>
                  {identityVerified
                    ? <ShieldCheck size={11} color="#A7F3D0" />
                    : <Clock3 size={11} color={colors.warning} />}
                  <Text style={[s.badgeText, !identityVerified && s.badgeTextPending]}>
                    {identityVerified ? t('passport.identityVerified') : t('passport.identityPending')}
                  </Text>
                </View>
                {memberSince && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{t('passport.memberSince', { year: memberSince })}</Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={s.statsRow}>
                <View style={s.stat}>
                  <Briefcase size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.statNum}>{stats.completedMissions ?? 0}</Text>
                  <Text style={s.statLabel}>{t('passport.missions')}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Star size={13} color="#FDE68A" />
                  <Text style={s.statNum}>{reviews.average > 0 ? reviews.average.toFixed(1) : '—'}</Text>
                  <Text style={s.statLabel}>{t('passport.rating', { count: reviews.count })}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Award size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={s.statNum}>{Math.round(provider.scoreXeuy ?? 0)}</Text>
                  <Text style={s.statLabel}>{t('passport.score')}</Text>
                </View>
              </View>
            </View>

            {/* QR identité */}
            <View style={s.qrCard}>
              <View style={s.qrHeader}>
                <QrCode size={16} color={colors.textSecondary} />
                <Text style={s.qrTitle}>{t('passport.qrTitle', { defaultValue: 'Mon identifiant' })}</Text>
              </View>
              <View style={s.qrBox}>
                <QRCode value={qrPayload} size={168} color={colors.ink} backgroundColor="white" />
              </View>
              <Text style={s.qrId}>{passportId}</Text>
              <Text style={s.qrHint}>{t('passport.qrHint', { defaultValue: 'Faites scanner ce code pour prouver votre identité Xeuy' })}</Text>
            </View>

            {/* Partage */}
            <TouchableOpacity style={s.shareBtn} onPress={share} activeOpacity={0.85}>
              <Share2 size={17} color="#fff" />
              <Text style={s.shareText}>{t('passport.share', { defaultValue: 'Partager mon profil' })}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  idCard: {
    backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.xl,
    ...shadows.lg, overflow: 'hidden', gap: spacing.lg,
  },
  idTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  avatarFallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: typography.weight.extrabold as any },
  verifiedDot: {
    position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.navy,
  },
  idInfo: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: '#fff', fontSize: 21, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, letterSpacing: -0.3 },
  trade: { color: '#A7F3D0', fontSize: 13, fontWeight: typography.weight.semibold as any },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locText: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.18)' },
  badgeText: { color: '#E7F8EF', fontSize: 11, fontWeight: typography.weight.bold as any },
  badgeTextPending: { color: '#FCD34D' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },
  statNum: { color: '#fff', fontSize: 18, fontWeight: typography.weight.extrabold as any },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10.5, fontWeight: typography.weight.semibold as any },

  qrCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm, gap: spacing.sm,
  },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  qrTitle: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  qrBox: { backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  qrId: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: 2 },
  qrHint: { fontSize: 11.5, color: colors.textMuted, textAlign: 'center', lineHeight: 16, maxWidth: 260 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15,
    ...shadows.hero,
  },
  shareText: { color: '#fff', fontSize: 15, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(ProPassport, 'ProPassport')
