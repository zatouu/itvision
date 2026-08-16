import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../../src/components/AppHeader'
import StickyBottomBar from '../../../src/components/StickyBottomBar'
import Button from '../../../src/components/Button'
import StatusChip from '../../../src/components/StatusChip'
import { Check, Star, ShieldCheck, Zap, Wrench, Circle, MessageCircle, Clock, ChevronRight } from 'lucide-react-native'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../../src/design'
import { mockProviders, mockOffers } from '../../../src/mock'
import { withScreenBoundary } from '../../../src/components/withScreenBoundary'

function ProviderDetail() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [provider] = useState(() => mockProviders.find(p => p._id === id))
  const offer = mockOffers.find(o => o.providerId === id)

  if (!provider) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('clientProvider.title')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('clientProvider.notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const meta = getCategoryMeta(provider.category)
  const initials = provider.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientProvider.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
            {provider.verified ? (
              <View style={s.verified}>
                <Check size={12} color={colors.surface} />
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{provider.name}</Text>
            <Text style={s.trade}>{provider.trade}</Text>
            <View style={s.ratingRow}>
              <Star size={14} color={colors.warning} fill={colors.warning} />
              <Text style={s.rating}>{provider.rating.avg} ({provider.rating.count} avis)</Text>
            </View>
          </View>
          <View style={s.missionsBox}>
            <Text style={s.missionsValue}>{provider.missionsCount}</Text>
            <Text style={s.missionsLabel}>{t('clientProvider.missions')}</Text>
          </View>
        </View>

        {provider.verified ? (
          <View style={s.verifiedPill}>
            <ShieldCheck size={14} color={colors.success} />
            <Text style={s.verifiedPillText}>{t('clientProvider.verifiedKyc')}</Text>
          </View>
        ) : null}

        <View style={s.badges}>
          <StatusChip label={t('clientProvider.fast')} icon={<Zap size={12} color={colors.primary} />} variant="primary" small />
          <StatusChip label={t('clientProvider.materialIncluded')} icon={<Wrench size={12} color={colors.info} />} variant="info" small />
          <StatusChip label={t('clientProvider.availableNow')} icon={<Circle size={10} color={colors.success} fill={colors.success} />} variant="success" small />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientProvider.about')}</Text>
          <Text style={s.aboutText}>{provider.about}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientProvider.specialties')}</Text>
          <View style={s.specialties}>
            {provider.specialties?.map(specialty => (
              <View key={specialty} style={s.specialtyPill}>
                <Text style={s.specialtyText}>{specialty}</Text>
              </View>
            ))}
          </View>
        </View>

        {provider.portfolio && provider.portfolio.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('clientProvider.portfolio')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {provider.portfolio.map(item => (
                  <View key={item.id} style={s.portfolioItem}>
                    <Image source={{ uri: item.url }} style={s.portfolioImage} />
                    {item.beforeAfter ? (
                      <View style={s.portfolioLabel}>
                        <Text style={s.portfolioLabelText}>{item.label}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientProvider.recentReviews')}</Text>
          {provider.recentReviews?.map(review => (
            <View key={review._id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={s.reviewAvatar}>
                  <Text style={s.reviewAvatarText}>{review.reviewerId.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.reviewName}>{review.reviewerId}</Text>
                  <View style={s.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} color={i < review.rating ? colors.warning : colors.border} fill={i < review.rating ? colors.warning : 'transparent'} />
                    ))}
                  </View>
                </View>
                <Text style={s.reviewDate}>{new Date(review.createdAt).toLocaleDateString('fr-FR')}</Text>
              </View>
              <Text style={s.reviewComment}>{review.comment}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={s.contactBtn} activeOpacity={0.85}>
          <MessageCircle size={18} color={colors.text} />
          <Text style={s.contactText}>{t('clientProvider.contact')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <StickyBottomBar>
        <View style={s.bottomRow}>
          <View>
            <Text style={s.offerLabel}>{t('clientProvider.offer')}</Text>
            <Text style={s.offerPrice}>{offer?.price.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <Button title={t('clientProvider.choose')} onPress={() => {}} size="lg" />
        </View>
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
  },
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
  verifiedText: { color: colors.surface },
  name: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  trade: { fontSize: typography.base.fontSize, color: colors.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  star: { color: colors.warning },
  rating: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  missionsBox: { alignItems: 'center' },
  missionsValue: { fontSize: typography.xxl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  missionsLabel: { fontSize: typography.xs.fontSize, color: colors.textSecondary },
  verifiedPill: {
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  verifiedPillText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any, marginLeft: 4 },
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
  aboutText: { fontSize: typography.base.fontSize, color: colors.textSecondary, lineHeight: 22 },
  specialties: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specialtyPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  specialtyText: { fontSize: typography.sm.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  portfolioItem: {
    width: 140,
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  portfolioImage: { width: '100%', height: '100%' },
  portfolioLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  portfolioLabelText: { fontSize: 10, color: colors.surface, fontWeight: typography.weight.extrabold as any },
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
  contactIcon: { color: colors.text },
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
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  offerLabel: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  offerPrice: { fontSize: typography.xl.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(ProviderDetail, 'ProviderDetail')

