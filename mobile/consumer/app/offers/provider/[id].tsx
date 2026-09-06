import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../../src/components/AppHeader'
import StickyBottomBar from '../../../src/components/StickyBottomBar'
import Button from '../../../src/components/Button'
import StatusChip from '../../../src/components/StatusChip'
import { Check, Star, ShieldCheck, Circle, Phone } from 'lucide-react-native'
import { colors, spacing, radius, shadows, typography } from '../../../src/design'
import { apiGet } from '../../../src/api'
import { loadCategories, getCategoryLabel } from '../../../src/categories'
import { withScreenBoundary } from '../../../src/components/withScreenBoundary'

function ProviderDetail() {
  const { t, i18n } = useTranslation()
  const { id, name: pName, rating: pRating, missions: pMissions } =
    useLocalSearchParams<{ id: string; name?: string; rating?: string; missions?: string }>()

  const [profile, setProfile] = useState<any | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [stats, setStats] = useState<{ average: number; count: number } | null>(null)
  const [catLabels, setCatLabels] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r: any = await apiGet('/api/services/providers?limit=100')
        const items: any[] = r?.items || []
        const found = items.find((p: any) => String(p.userId) === String(id) || String(p.providerId) === String(id) || String(p.id) === String(id))
        if (mounted) setProfile(found || null)
      } catch { /* silent */ }
      try {
        const rv: any = await apiGet(`/api/services/reviews?providerId=${id}`)
        if (mounted) {
          setReviews(rv?.reviews || [])
          setStats(rv?.stats || null)
        }
      } catch { /* silent */ }
      try {
        const cats = await loadCategories()
        if (mounted) {
          setCatLabels(Object.fromEntries(cats.map(c => [c.slug, getCategoryLabel(c, i18n.language)])))
        }
      } catch { /* silent */ }
      if (mounted) setLoading(false)
    })()
    return () => { mounted = false }
  }, [id, i18n.language])

  const name = profile?.name || pName || t('home.newProvider')
  const specialties: string[] = Array.isArray(profile?.serviceCategories) ? profile.serviceCategories : []
  const trade = specialties.map(sl => catLabels[sl] || sl).filter(Boolean).slice(0, 3).join(' · ')
  const ratingAvg = stats?.average ?? (pRating ? Number(pRating) : 0)
  const ratingCount = stats?.count ?? 0
  const missionsCount = profile?.stats?.completedMissions ?? (pMissions ? Number(pMissions) : 0)
  const verified = !!profile?.kycVerified
  const available = profile
    ? (profile.maxConcurrentMissions == null || (profile.currentLoad ?? 0) < profile.maxConcurrentMissions)
    : false
  const phone = profile?.phone
  const initials = name.trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'P'

  const chooseProvider = () => {
    if (specialties[0]) {
      router.push({ pathname: '/create-request', params: { category: specialties[0] } } as any)
    } else {
      router.push('/create-request' as any)
    }
  }

  const contactProvider = () => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {})
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('clientProvider.title')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!profile && !pName) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('clientProvider.title')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('clientProvider.notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientProvider.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.headerCard}>
          <View style={s.avatar}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
            ) : (
              <Text style={s.avatarText}>{initials}</Text>
            )}
            {verified && (
              <View style={s.verified}>
                <Check size={12} color={colors.surface} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{name}</Text>
            {!!trade && <Text style={s.trade}>{trade}</Text>}
            <View style={s.ratingRow}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={s.rating}>
                {ratingAvg > 0 ? ratingAvg.toFixed(1) : '—'}{ratingCount > 0 ? ` (${ratingCount} ${t('clientProvider.reviews')})` : ''}
              </Text>
            </View>
          </View>
          <View style={s.missionsBox}>
            <Text style={s.missionsValue}>{missionsCount}</Text>
            <Text style={s.missionsLabel}>{t('clientProvider.missions')}</Text>
          </View>
        </View>

        {verified && (
          <View style={s.verifiedPill}>
            <ShieldCheck size={14} color={colors.success} />
            <Text style={s.verifiedPillText}>{t('clientProvider.verifiedKyc')}</Text>
          </View>
        )}

        {available && (
          <View style={s.badges}>
            <StatusChip label={t('clientProvider.availableNow')} icon={<Circle size={10} color={colors.success} fill={colors.success} />} variant="success" small />
          </View>
        )}

        {specialties.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('clientProvider.specialties')}</Text>
            <View style={s.specialties}>
              {specialties.map(slug => (
                <View key={slug} style={s.specialtyPill}>
                  <Text style={s.specialtyText}>{catLabels[slug] || slug}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientProvider.recentReviews')}</Text>
          {reviews.length === 0 ? (
            <Text style={s.noReviews}>{t('clientProvider.noReviews')}</Text>
          ) : (
            reviews.slice(0, 10).map(review => (
              <View key={review._id} style={s.reviewCard}>
                <View style={s.reviewHeader}>
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarText}>{t('clientProvider.client').slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={s.reviewName}>{t('clientProvider.client')}</Text>
                    <View style={s.reviewStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} color={i < review.rating ? colors.warning : colors.border} fill={i < review.rating ? colors.warning : 'transparent'} />
                      ))}
                    </View>
                  </View>
                  <Text style={s.reviewDate}>{new Date(review.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR')}</Text>
                </View>
                {!!review.comment && <Text style={s.reviewComment}>{review.comment}</Text>}
              </View>
            ))
          )}
        </View>

        {!!phone && (
          <TouchableOpacity style={s.contactBtn} activeOpacity={0.85} onPress={contactProvider} accessibilityLabel={t('clientProvider.contact')}>
            <Phone size={18} color={colors.text} />
            <Text style={s.contactText}>{t('clientProvider.contact')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <StickyBottomBar>
        <Button title={t('clientProvider.choose')} onPress={chooseProvider} size="lg" />
      </StickyBottomBar>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  headerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 24, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  verified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  trade: { fontSize: typography.base.fontSize, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  rating: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  missionsBox: { alignItems: 'center' },
  missionsValue: { fontSize: typography.xxl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  missionsLabel: { fontSize: typography.xs.fontSize, color: colors.textSecondary },
  verifiedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifiedPillText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specialtyPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  specialtyText: { fontSize: typography.sm.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  noReviews: { fontSize: typography.sm.fontSize, color: colors.textMuted },
  contactBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactText: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 12, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  reviewName: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewDate: { marginLeft: 'auto', fontSize: typography.xs.fontSize, color: colors.textMuted },
  reviewComment: { fontSize: typography.sm.fontSize, color: colors.textSecondary, lineHeight: 18 },
})

export default withScreenBoundary(ProviderDetail, 'ProviderDetail')
