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
import { Check, Star, ShieldCheck, Circle, Phone, MapPin, ArrowLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, shadows, typography, getCategoryMeta } from '../../../src/design'
import { apiGet } from '../../../src/api'
import { loadCategories, getCategoryLabel } from '../../../src/categories'
import { withScreenBoundary } from '../../../src/components/withScreenBoundary'

function ProviderDetail() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
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

  const zone = profile?.zone
  const zoneCity = zone?.city || zone?.name || ''
  const zoneRadius = zone?.radiusKm ?? zone?.radius ?? null

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Hero vert */}
      <View style={[s.hero, { paddingTop: insets.top + 10 }]}>
        <View style={s.heroCircle1} />
        <View style={s.heroCircle2} />
        <View style={s.heroRow}>
          <TouchableOpacity style={s.heroBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <ArrowLeft size={18} color="#fff" />
          </TouchableOpacity>
          {!!phone && (
            <TouchableOpacity style={s.heroBtn} onPress={contactProvider} activeOpacity={0.8}>
              <Phone size={17} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}>
        {/* Carte identité flottante */}
        <View style={s.identityCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              {profile?.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={s.avatarImage} />
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
            </View>
            {verified && (
              <View style={s.verified}>
                <Check size={12} color={colors.surface} strokeWidth={3} />
              </View>
            )}
          </View>
          <Text style={s.name}>{name}</Text>
          {verified && (
            <View style={s.verifiedPill}>
              <ShieldCheck size={12} color={colors.brandInk} />
              <Text style={s.verifiedPillText}>{t('clientProvider.verifiedKyc')}</Text>
            </View>
          )}
          <View style={s.ratingRow}>
            <Star size={12} color={colors.warning} fill={colors.warning} />
            <Text style={s.ratingValue}>{ratingAvg > 0 ? ratingAvg.toFixed(1) : '—'}</Text>
            <Text style={s.ratingMeta}>({ratingCount} {t('clientProvider.reviews')})</Text>
            <View style={s.dotSep} />
            <Text style={s.ratingMeta}>{missionsCount} {t('clientProvider.missions').toLowerCase()}</Text>
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            {[
              { label: t('clientProvider.statRating', { defaultValue: 'Note' }), value: ratingAvg > 0 ? ratingAvg.toFixed(1) : '—', icon: <Star size={11} color={colors.warning} /> },
              { label: t('clientProvider.missions'), value: String(missionsCount), icon: <Check size={11} color={colors.primary} /> },
              { label: t('clientProvider.reviews'), value: String(ratingCount), icon: <ShieldCheck size={11} color={colors.info} /> },
            ].map((st, i) => (
              <View key={i} style={s.statCell}>
                <View style={s.statLabelRow}>
                  {st.icon}
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
                <Text style={s.statValue}>{st.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {available && (
          <View style={s.badges}>
            <StatusChip label={t('clientProvider.availableNow')} icon={<Circle size={10} color={colors.success} fill={colors.success} />} variant="success" small />
          </View>
        )}

        {/* Spécialités */}
        {specialties.length > 0 && (
          <>
            <Text style={s.sectionHead}>{t('clientProvider.specialties')}</Text>
            <View style={s.specialties}>
              {specialties.map(slug => {
                const meta = getCategoryMeta(slug)
                return (
                  <View key={slug} style={[s.specialtyPill, { backgroundColor: meta.bg }]}>
                    <View style={[s.specialtyIcon, { backgroundColor: meta.color }]}>
                      <Text style={s.specialtyIconText}>{(catLabels[slug] || slug).slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <Text style={[s.specialtyText, { color: meta.color }]}>{catLabels[slug] || slug}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {/* Zone d'intervention */}
        {!!zoneCity && (
          <>
            <Text style={s.sectionHead}>{t('clientProvider.zone', { defaultValue: "Zone d'intervention" })}</Text>
            <View style={s.zoneCard}>
              <MapPin size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={s.zoneTitle}>{zoneCity}</Text>
                {zoneRadius != null && (
                  <Text style={s.zoneSub}>{t('clientProvider.zoneRadius', { km: zoneRadius, defaultValue: `Se déplace jusqu'à ${zoneRadius} km` })}</Text>
                )}
              </View>
              {available && <StatusChip label={t('clientProvider.online', { defaultValue: 'En ligne' })} variant="success" small />}
            </View>
          </>
        )}

        {/* Avis récents */}
        <Text style={s.sectionHead}>{t('clientProvider.recentReviews')}</Text>
        {reviews.length === 0 ? (
          <Text style={s.noReviews}>{t('clientProvider.noReviews')}</Text>
        ) : (
          reviews.slice(0, 10).map(review => (
            <View key={review._id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={s.reviewAvatar}>
                  <Text style={s.reviewAvatarText}>{t('clientProvider.client').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{t('clientProvider.client')}</Text>
                  <Text style={s.reviewDate}>{new Date(review.createdAt).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR')}</Text>
                </View>
                <View style={s.reviewStars}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={11} color={i < review.rating ? colors.warning : colors.border} fill={i < review.rating ? colors.warning : 'transparent'} />
                  ))}
                </View>
              </View>
              {!!review.comment && <Text style={s.reviewComment}>{review.comment}</Text>}
            </View>
          ))
        )}

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
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: 70,
    overflow: 'hidden',
  },
  heroCircle1: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroCircle2: { position: 'absolute', top: 30, right: 90, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  identityCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 0,
    marginTop: -46,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.md,
    alignItems: 'center',
  },
  avatarWrap: { marginTop: -36, position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 24, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  verified: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.3, marginTop: 10 },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verifiedPillText: { fontSize: 11, color: colors.brandInk, fontWeight: typography.weight.extrabold as any },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  ratingValue: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  ratingMeta: { fontSize: 12, color: colors.textMuted },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14, alignSelf: 'stretch' },
  statCell: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: typography.weight.bold as any, letterSpacing: 0.3, textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  sectionHead: {
    fontSize: 11,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 4,
  },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specialtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
  },
  specialtyIcon: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  specialtyIconText: { fontSize: 11, color: '#fff', fontWeight: typography.weight.extrabold as any },
  specialtyText: { fontSize: 12.5, fontWeight: typography.weight.bold as any },
  zoneCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.surface, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  zoneTitle: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  zoneSub: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  noReviews: { fontSize: typography.sm.fontSize, color: colors.textMuted },
  contactBtn: {
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
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { fontSize: 11, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  reviewName: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  reviewStars: { flexDirection: 'row', gap: 1 },
  reviewDate: { fontSize: 10.5, color: colors.textDim, fontWeight: '600' },
  reviewComment: { fontSize: 12, color: colors.text, lineHeight: 18 },
})

export default withScreenBoundary(ProviderDetail, 'ProviderDetail')
