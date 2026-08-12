import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import { Star, Check, Clock, MessageCircle } from 'lucide-react-native'
import { colors, spacing, radius, typography, shadows } from '../../design'
import { hapticSuccess } from '../../haptics'

export type Offer = {
  _id: string
  providerId: string
  providerName?: string
  providerAvatar?: string
  providerVerified?: boolean
  providerRating?: { avg?: number; count?: number }
  price: number
  etaMinutes?: number
  message?: string
  experienceYears?: number
  materialIncluded?: boolean
  distanceKm?: number
  isNew?: boolean
  status?: 'submitted' | 'withdrawn' | 'accepted' | 'rejected' | 'expired'
  clientCounterPrice?: number
  clientCounterStatus?: 'pending' | 'accepted' | 'rejected'
}

type Props = {
  offer: Offer
  isBest: boolean
  budget?: number
  onChoose: (offer: Offer) => void
  onNegotiate: (offer: Offer) => void
  disabled?: boolean
  hasAcceptedOffer?: boolean
}

function BudgetDeltaChip({ price, budget }: { price: number; budget?: number }) {
  const { t } = useTranslation()
  if (!budget) return null
  const delta = price - budget
  if (delta === 0) return null
  const deltaK = Math.round(Math.abs(delta) / 1000)
  const isLess = delta < 0
  return (
    <Text style={[s.delta, isLess ? s.deltaGreen : s.deltaOrange]}>
      {isLess
        ? t('clientOffers.againstBudgetLess', { amount: deltaK })
        : t('clientOffers.againstBudgetMore', { amount: deltaK })
      }
    </Text>
  )
}

export default function OfferCard({ offer, isBest, budget, onChoose, onNegotiate, disabled, hasAcceptedOffer }: Props) {
  const { t } = useTranslation()
  const slideAnim = useRef(new Animated.Value(offer.isNew ? 50 : 0)).current
  const fadeAnim = useRef(new Animated.Value(offer.isNew ? 0 : 1)).current
  const [showNewBadge, setShowNewBadge] = useState(!!offer.isNew)

  useEffect(() => {
    if (offer.isNew) {
      hapticSuccess()
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start()
      const timer = setTimeout(() => setShowNewBadge(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [offer.isNew, slideAnim, fadeAnim])

  const initials = offer.providerName?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'P'
  const hasRating = Number.isFinite(offer.providerRating?.avg) && (offer.providerRating?.avg || 0) > 0

  return (
    <Animated.View
      style={[
        s.card,
        isBest && s.cardBest,
        { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      {isBest && (
        <View style={s.bestRibbon}>
          <Text style={s.bestRibbonText}>{t('clientOffers.bestChoice')}</Text>
        </View>
      )}
      {showNewBadge && !isBest && (
        <View style={s.newBadge}>
          <Text style={s.newBadgeText}>{t('clientOffers.newBadge')}</Text>
        </View>
      )}

      {/* Provider row */}
      <View style={s.headerRow}>
        <View style={s.avatarWrap}>
          {offer.providerAvatar ? (
            <Image
              source={{ uri: offer.providerAvatar }}
              style={s.avatarImg}
              contentFit="cover"
              placeholder={require('../../../assets/icon.png')}
              transition={200}
            />
          ) : (
            <View style={[s.avatarImg, s.avatarFallback]}>
              <Text style={s.avatarInitials}>{initials}</Text>
            </View>
          )}
          {offer.providerVerified && (
            <View style={s.verifiedBadge}>
              <Check size={10} color={colors.surface} strokeWidth={3} />
            </View>
          )}
        </View>

        <View style={s.providerInfo}>
          <Text style={s.providerName} numberOfLines={1}>{offer.providerName || '—'}</Text>
          <View style={s.ratingRow}>
            <Star size={13} color={colors.warning} fill={colors.warning} />
            <Text style={s.rating}>
              {hasRating
                ? `${offer.providerRating?.avg} ${t('clientOffers.reviews', { count: offer.providerRating?.count || 0 })}`
                : t('clientOffers.noRating')
              }
            </Text>
          </View>
        </View>

        <View style={s.priceCol}>
          <Text style={s.priceValue}>{offer.price.toLocaleString('fr-FR')}</Text>
          <Text style={s.priceCurrency}>FCFA</Text>
          <BudgetDeltaChip price={offer.price} budget={budget} />
        </View>
      </View>

      {/* Pills row */}
      <View style={s.pillsRow}>
        {offer.providerVerified && (
          <View style={s.pillVerified}>
            <Check size={10} color={colors.primary} />
            <Text style={s.pillVerifiedText}>{t('clientOffers.verified')}</Text>
          </View>
        )}
        {offer.experienceYears != null && offer.experienceYears > 0 && (
          <View style={s.pill}>
            <Text style={s.pillText}>{t('clientOffers.experienceYears', { years: offer.experienceYears })}</Text>
          </View>
        )}
        {offer.materialIncluded && (
          <View style={s.pill}>
            <Text style={s.pillText}>{t('clientOffers.materialIncluded')}</Text>
          </View>
        )}
      </View>

      {/* Message quote */}
      {offer.message ? (
        <Text style={s.message} numberOfLines={2}>"{offer.message}"</Text>
      ) : null}

      {/* ETA */}
      {offer.etaMinutes != null && (
        <View style={s.etaRow}>
          <Clock size={13} color={colors.textSecondary} />
          <Text style={s.etaText}>{t('clientOffers.arrivesIn', { minutes: offer.etaMinutes })}</Text>
        </View>
      )}

      {/* Contre-offre status badge */}
      {offer.clientCounterStatus === 'pending' && (
        <View style={s.counterBadge}>
          <Text style={s.counterBadgeText}>{t('clientOffers.counterPending', { defaultValue: 'Contre-offre en attente' })} — {offer.clientCounterPrice?.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      )}
      {offer.clientCounterStatus === 'accepted' && (
        <View style={s.counterBadgeAccepted}>
          <Text style={s.counterBadgeTextAccepted}>{t('clientOffers.counterAccepted', { defaultValue: 'Contre-offre acceptée' })} — {offer.clientCounterPrice?.toLocaleString('fr-FR')} FCFA</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={s.actions}>
        {offer.status === 'accepted' ? (
          <View style={s.acceptedRow}>
            <Check size={18} color={colors.success} strokeWidth={3} />
            <Text style={s.acceptedText}>{t('clientOffers.accepted', { defaultValue: 'Accepté' })}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[s.negotiateBtn, (disabled || hasAcceptedOffer) && { opacity: 0.4 }]}
              onPress={() => onNegotiate(offer)}
              activeOpacity={0.85}
              disabled={disabled || hasAcceptedOffer}
            >
              <Text style={s.negotiateBtnText}>{t('clientOffers.negotiate')}</Text>
              <MessageCircle size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chooseBtn, (disabled || hasAcceptedOffer) && { opacity: 0.4 }]}
              onPress={() => onChoose(offer)}
              activeOpacity={0.85}
              disabled={disabled || hasAcceptedOffer}
            >
              <Text style={s.chooseBtnText}>{t('clientOffers.choose')}</Text>
              <Check size={16} color={colors.surface} strokeWidth={3} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardBest: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  bestRibbon: {
    alignSelf: 'flex-end',
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
    marginRight: -spacing.xs,
  },
  bestRibbonText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: typography.weight.extrabold as any,
    letterSpacing: 0.5,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warning,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  newBadgeText: {
    fontSize: 10,
    color: colors.surface,
    fontWeight: typography.weight.bold as any,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: typography.weight.extrabold as any,
    color: colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  providerInfo: { flex: 1 },
  providerName: {
    fontSize: typography.base.fontSize,
    fontWeight: typography.weight.bold as any,
    color: colors.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  rating: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
  },
  priceCol: { alignItems: 'flex-end' },
  priceValue: {
    fontSize: typography.xl.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  priceCurrency: {
    fontSize: typography.xs.fontSize,
    color: colors.textSecondary,
    marginTop: 1,
  },
  delta: {
    fontSize: 11,
    fontWeight: typography.weight.semibold as any,
    marginTop: 2,
  },
  deltaGreen: { color: colors.success },
  deltaOrange: { color: colors.warning },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  pill: {
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium as any,
  },
  pillVerified: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pillVerifiedText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: typography.weight.semibold as any,
  },
  message: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  etaText: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  negotiateBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  negotiateBtnText: {
    fontSize: typography.base.fontSize,
    color: colors.primary,
    fontWeight: typography.weight.bold as any,
  },
  chooseBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    ...shadows.sm,
  },
  chooseBtnText: {
    fontSize: typography.base.fontSize,
    color: colors.surface,
    fontWeight: typography.weight.bold as any,
  },
  counterBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterBadgeText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: typography.weight.semibold as any,
  },
  counterBadgeAccepted: {
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterBadgeTextAccepted: {
    fontSize: 12,
    color: colors.success,
    fontWeight: typography.weight.semibold as any,
  },
  acceptedRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
  },
  acceptedText: {
    fontSize: typography.base.fontSize,
    color: colors.success,
    fontWeight: typography.weight.extrabold as any,
  },
})
