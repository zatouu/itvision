import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import ScreenContainer from '../../src/components/ScreenContainer'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import Button from '../../src/components/Button'
import StatusChip from '../../src/components/StatusChip'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { mockRequests } from '../../src/mock'
import type { ServiceRequest } from '../../src/types'

export default function NearbyRequestDetail() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [request] = useState<ServiceRequest | undefined>(() => mockRequests.find((r: ServiceRequest) => r._id === id))

  if (!request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('providerNearby.request')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('providerNearby.notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const meta = getCategoryMeta(request.category)
  const postedAt = new Date(request.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const initials = 'CL'
  const distance = '1.2 km'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('providerNearby.request')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={s.categoryRow}>
          <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
            <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.category}>{meta.label}</Text>
            <Text style={s.subCategory}>{request.subCategory || request.description.slice(0, 40)}</Text>
          </View>
        </View>

        <View style={s.pills}>
          <StatusChip label={`${t('providerNearby.posted')} ${postedAt}`} variant="neutral" small />
          <StatusChip label={distance} variant="info" small />
          <StatusChip label={t('providerNearby.urgent')} variant="warning" small />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerNearby.location')}</Text>
          <View style={s.locationRow}>
            <Text style={s.locationIcon}>📍</Text>
            <Text style={s.locationText}>{request.address}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerNearby.description')}</Text>
          <Text style={s.description}>{request.description}</Text>
        </View>

        {request.media && request.media.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('providerNearby.media')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {request.media.map((m, i) => (
                  <View key={i} style={s.thumb}>
                    {m.type === 'image' ? (
                      <Image source={{ uri: m.url }} style={s.thumbImage} />
                    ) : (
                      <View style={s.audioThumb}>
                        <Text style={s.audioIcon}>🎤</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={s.detailCard}>
          <Text style={s.sectionTitle}>{t('providerNearby.details')}</Text>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.budget')}</Text>
            <Text style={s.detailValue}>{request.budget?.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.reference')}</Text>
            <Text style={s.detailValue}>#{request._id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.payment')}</Text>
            <Text style={s.detailValue}>{t('providerNearby.cashOrMobile')}</Text>
          </View>
        </View>

        <View style={s.clientCard}>
          <View style={s.clientAvatar}>
            <Text style={s.clientInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.clientName}>{t('providerNearby.client')}</Text>
            <Text style={s.clientSub}>{t('providerNearby.verifiedClient')}</Text>
          </View>
          <View style={s.trustBadge}>
            <Text style={s.trustText}>✓ {t('providerNearby.trust')}</Text>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <View style={s.bottomActions}>
          <Button
            title={t('providerNearby.askQuestion')}
            variant="outline"
            onPress={() => router.push(`/mission-chat?id=${request._id}`)}
            fullWidth={false}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title={t('providerNearby.makeOffer')}
            onPress={() => router.push(`/offer/create?requestId=${request._id}`)}
            fullWidth={false}
          />
        </View>
      </StickyBottomBar>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAbbr: { fontSize: 18, fontWeight: typography.weight.extrabold as any },
  category: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  subCategory: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  pills: {
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
    marginBottom: spacing.sm,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationIcon: { fontSize: 16 },
  locationText: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.medium as any, flex: 1 },
  description: { fontSize: typography.base.fontSize, color: colors.textSecondary, lineHeight: 22 },
  thumb: { width: 80, height: 80, borderRadius: radius.lg, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  audioThumb: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: { fontSize: 24 },
  detailCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: typography.base.fontSize, color: colors.textSecondary },
  detailValue: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
  clientCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitials: { fontSize: 16, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  clientName: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  clientSub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  trustBadge: {
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trustText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
