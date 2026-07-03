import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StatusChip from '../../src/components/StatusChip'
import Button from '../../src/components/Button'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { mockOffers, mockRequests } from '../../src/mock'
import type { Offer } from '../../src/types'

const SORTS = ['recommended', 'cheapest', 'fastest', 'bestRated']

export default function OffersReceived() {
  const { t } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const request = mockRequests.find(r => r._id === requestId)
  const [sort, setSort] = useState('recommended')
  const [offers] = useState<Offer[]>(() => {
    const list = mockOffers.filter(o => o.requestId === (requestId || 'req1'))
    return list.sort((a, b) => {
      if (sort === 'cheapest') return a.price - b.price
      if (sort === 'fastest') return (a.etaMinutes || 0) - (b.etaMinutes || 0)
      if (sort === 'bestRated') return (b.providerRating?.avg || 0) - (a.providerRating?.avg || 0)
      return 0
    })
  })

  const meta = request ? getCategoryMeta(request.category) : getCategoryMeta('')
  const liveCount = 3

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientOffers.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={s.summaryCard}>
          <View style={s.summaryHeader}>
            <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
              <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={s.summaryTitle}>{meta.label} • {request?.subCategory}</Text>
              <Text style={s.summarySub}>{request?.address}</Text>
            </View>
          </View>
        </View>

        <View style={s.livePill}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{t('clientOffers.live', { count: liveCount })}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortBar}>
          {SORTS.map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => setSort(key)}
              style={[s.sortPill, sort === key && s.sortPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.sortText, sort === key && s.sortTextActive]}>{t(`clientOffers.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.list}>
          {offers.map((offer, idx) => {
            const isBest = idx === 0
            const initials = offer.providerName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'P'
            return (
              <View key={offer._id} style={[s.card, isBest && s.cardBest]}>
                {isBest ? (
                  <View style={s.bestBadge}>
                    <Text style={s.bestBadgeText}>{t('clientOffers.bestChoice')}</Text>
                  </View>
                ) : null}
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                    {offer.providerVerified ? <View style={s.verified}><Text style={s.verifiedText}>✓</Text></View> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{offer.providerName}</Text>
                    <View style={s.ratingRow}>
                      <Text style={s.star}>★</Text>
                      <Text style={s.rating}>{offer.providerRating?.avg} ({offer.providerRating?.count})</Text>
                    </View>
                  </View>
                  <View style={s.priceBox}>
                    <Text style={s.price}>{offer.price.toLocaleString('fr-FR')}</Text>
                    <Text style={s.priceCurrency}>FCFA</Text>
                  </View>
                </View>
                <Text style={s.message}>{offer.message}</Text>
                <View style={s.metaRow}>
                  <StatusChip label={`⏱ ${offer.etaMinutes} min`} variant="neutral" small />
                  <StatusChip label={t('clientOffers.verified')} variant="success" small />
                </View>
                <View style={s.actions}>
                  <TouchableOpacity
                    style={s.profileBtn}
                    onPress={() => router.push(`/offers/provider/${offer.providerId}`)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.profileBtnText}>{t('clientOffers.viewProfile')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.chooseBtn} activeOpacity={0.85}>
                    <Text style={s.chooseBtnText}>{t('clientOffers.choose')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>

      <View style={s.bottomBar}>
        <Button
          title={t('clientOffers.compare')}
          variant="secondary"
          onPress={() => {}}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAbbr: { fontSize: 16, fontWeight: typography.weight.extrabold as any },
  summaryTitle: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  summarySub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  livePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  sortBar: { paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.sm },
  sortPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sortText: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  sortTextActive: { color: colors.surface, fontWeight: typography.weight.extrabold as any },
  list: { paddingHorizontal: spacing.lg, marginTop: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardBest: { borderColor: colors.success, borderWidth: 2 },
  bestBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  bestBadgeText: { fontSize: typography.xs.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { fontSize: 16, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  verified: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  verifiedText: { fontSize: 9, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  name: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  star: { fontSize: 12, color: colors.warning },
  rating: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  priceCurrency: { fontSize: typography.xs.fontSize, color: colors.textSecondary },
  message: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  profileBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  profileBtnText: { fontSize: typography.base.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  chooseBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
  },
  chooseBtnText: { fontSize: typography.base.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.xl,
  },
})
