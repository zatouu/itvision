import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { MapPin, Lock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { radius, spacing } from '../../design'

interface Props {
  category?: string
  categoryCode?: string
  price?: number | string
  reference?: string
  address?: string
  paymentMethod?: string
  compact?: boolean
  style?: ViewStyle
}

export const MissionSummaryCard: React.FC<Props> = ({
  category,
  categoryCode,
  price,
  reference,
  address,
  paymentMethod = 'Cash',
  compact = false,
  style,
}) => {
  const { t } = useTranslation()

  const normalizedCategory = (category || '').toLowerCase()
  const displayCategory = t(`categories.${normalizedCategory}`, { defaultValue: category || t('common.service', { defaultValue: 'Service' }) })

  const formattedPrice =
    price !== undefined && price !== null
      ? typeof price === 'number'
        ? `${price.toLocaleString('fr-FR')} FCFA`
        : `${price} FCFA`
      : t('mission.notProvided', { defaultValue: 'Non précisé' })

  // Get code from category name if not given
  const displayCode = categoryCode || (displayCategory ? displayCategory.slice(0, 2).toUpperCase() : 'SR')

  return (
    <View style={[s.card, style]}>
      {/* Top Row */}
      <View style={s.topRow}>
        <View style={s.leftCategoryGroup}>
          <View style={s.categoryTile}>
            <Text style={s.categoryCode}>{displayCode}</Text>
          </View>
          <Text style={s.categoryName} numberOfLines={1}>
            {displayCategory}
          </Text>
        </View>

        <Text style={s.priceText}>
          {formattedPrice}
        </Text>
      </View>

      {/* Bottom Meta Row */}
      <View style={s.bottomRow}>
        {!compact ? (
          <>
            {reference ? (
              <>
                <Text style={[s.metaText, { flexShrink: 0 }]} numberOfLines={1}>
                  Réf {reference.startsWith('#') ? reference : `#${reference}`}
                </Text>
                <Text style={s.bullet}>·</Text>
              </>
            ) : null}

            {address ? (
              <>
                <View style={s.inlineItem}>
                  <MapPin size={11} color="#64748B" style={{ marginRight: 2 }} />
                  <Text style={s.metaText} numberOfLines={1}>
                    {address}
                  </Text>
                </View>
                <Text style={s.bullet}>·</Text>
              </>
            ) : null}

            <View style={s.inlineItem}>
              <Lock size={11} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={s.metaText} numberOfLines={1}>
                {t('providerMissionActive.paymentSecured', { defaultValue: 'Paiement sécurisé' })} ({paymentMethod})
              </Text>
            </View>
          </>
        ) : (
          <View style={s.inlineItemRight}>
            <Lock size={11} color="#0F7B4F" style={{ marginRight: 3 }} />
            <Text style={s.metaTextSecured}>
              {t('providerMissionActive.paymentCashSecured', { defaultValue: 'Cash sécurisé' })}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftCategoryGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A1628',
    flexShrink: 1,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F7B4F',
    letterSpacing: -0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  inlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  inlineItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  metaTextSecured: {
    fontSize: 12,
    color: '#0F7B4F',
    fontWeight: '600',
  },
  bullet: {
    fontSize: 12,
    color: '#CBD5E1',
    marginHorizontal: 5,
  },
})
