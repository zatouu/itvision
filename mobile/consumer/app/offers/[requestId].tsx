import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StatusChip from '../../src/components/StatusChip'
import Button from '../../src/components/Button'
import { Star, Check, Clock, SlidersHorizontal } from 'lucide-react-native'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { apiGet, apiPost } from '../../src/api'
import { confirm } from '../../src/confirm'
import { toast } from '../../src/toast'

const SORTS = ['recommended', 'cheapest', 'fastest', 'bestRated']

type Offer = {
  _id: string
  providerId: string
  providerName?: string
  providerVerified?: boolean
  providerRating?: { avg?: number; count?: number }
  price: number
  etaMinutes?: number
  message?: string
  status?: string
}

export default function OffersReceived() {
  const { t } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const [request, setRequest] = useState<any>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('recommended')
  const [accepting, setAccepting] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const data: any = await apiGet(`/api/services/requests/${requestId}/offers`)
      setRequest(data.request || null)
      setOffers(Array.isArray(data.offers) ? data.offers : [])
    } catch (e: any) {
      toast.error(t('common.error'), e?.message || t('offers.loadError'))
    } finally {
      setLoading(false)
    }
  }, [requestId, t])

  useEffect(() => { load() }, [load])

  const sortedOffers = useMemo(() => {
    const list = [...offers]
    list.sort((a, b) => {
      if (sort === 'cheapest') return a.price - b.price
      if (sort === 'fastest') return (a.etaMinutes || 0) - (b.etaMinutes || 0)
      if (sort === 'bestRated') return (b.providerRating?.avg || 0) - (a.providerRating?.avg || 0)
      // recommended = score combiné prix/ETA/note
      const scoreA = (a.providerRating?.avg || 0) * 10 - (a.price / 1000) - (a.etaMinutes || 0) * 0.5
      const scoreB = (b.providerRating?.avg || 0) * 10 - (b.price / 1000) - (b.etaMinutes || 0) * 0.5
      return scoreB - scoreA
    })
    return list
  }, [offers, sort])

  const meta = request ? getCategoryMeta(request.category) : getCategoryMeta('')

  const acceptOffer = async (offer: Offer) => {
    const ok = await confirm(t('offers.confirmTitle'), t('offers.confirmMsg', { price: offer.price.toLocaleString('fr-FR') }))
    if (!ok) return
    setAccepting(offer._id)
    try {
      await apiPost(`/api/services/offers/${offer._id}/accept`, {})
      router.replace(`/mission/${requestId}`)
    } catch (e: any) {
      toast.error(t('common.error'), e?.message || t('offers.acceptError'))
    } finally {
      setAccepting(null)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientOffers.title')} onBack={() => router.back()} />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={s.summaryCard}>
              <View style={s.summaryHeader}>
                <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
                  <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={s.summaryTitle}>{meta.label} {request?.subCategory ? `• ${request.subCategory}` : ''}</Text>
                  <Text style={s.summarySub}>{request?.location?.address || request?.address || ''}</Text>
                </View>
              </View>
            </View>

            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>{t('clientOffers.live', { count: offers.length })}</Text>
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
              {sortedOffers.map((offer, idx) => {
                const isBest = idx === 0
                const initials = offer.providerName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'P'
                const hasRating = Number.isFinite(offer.providerRating?.avg) && (offer.providerRating?.avg || 0) > 0
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
                        {offer.providerVerified ? <View style={s.verified}><Check size={9} color={colors.surface} /></View> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>{offer.providerName}</Text>
                        <View style={s.ratingRow}>
                          <Star size={14} color={colors.warning} fill={colors.warning} />
                          <Text style={s.rating}>{hasRating ? `${offer.providerRating?.avg} (${offer.providerRating?.count || 0})` : t('clientOffers.noRating')}</Text>
                        </View>
                      </View>
                      <View style={s.priceBox}>
                        <Text style={s.price}>{offer.price.toLocaleString('fr-FR')}</Text>
                        <Text style={s.priceCurrency}>FCFA</Text>
                      </View>
                    </View>
                    {offer.message ? <Text style={s.message}>{offer.message}</Text> : null}
                    <View style={s.metaRow}>
                      <StatusChip label={offer.etaMinutes ? `${offer.etaMinutes} min` : t('offers.noEta')} icon={<Clock size={12} color={colors.textSecondary} />} variant="neutral" small />
                      {offer.providerVerified ? <StatusChip label={t('clientOffers.verified')} variant="success" small /> : null}
                    </View>
                    <View style={s.actions}>
                      <TouchableOpacity
                        style={s.profileBtn}
                        onPress={() => router.push(`/offers/provider/${offer.providerId}`)}
                        activeOpacity={0.85}
                      >
                        <Text style={s.profileBtnText}>{t('clientOffers.viewProfile')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.chooseBtn, accepting === offer._id && { opacity: 0.6 }]}
                        activeOpacity={0.85}
                        onPress={() => acceptOffer(offer)}
                        disabled={accepting === offer._id}
                      >
                        <Text style={s.chooseBtnText}>{accepting === offer._id ? t('common.loading') : t('clientOffers.choose')}</Text>
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
              onPress={() => toast.info(t('common.comingSoon'), t('clientOffers.compareSoon'))}
              fullWidth
              size="lg"
              icon={<SlidersHorizontal size={18} color={colors.text} />}
            />
          </View>
        </>
      )}
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
  verifiedText: { color: colors.surface },
  name: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  star: { color: colors.warning },
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
