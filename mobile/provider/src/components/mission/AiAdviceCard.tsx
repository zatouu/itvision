import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Sparkles, ChevronRight } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { radius, spacing } from '../../design'

interface Props {
  advice?: string
  category?: string
  onPress?: () => void
}

const DEFAULT_ADVICE_BY_CATEGORY: Record<string, string> = {
  climatisation: "💡 Vérifiez l'unité extérieure avant de tester le compresseur",
  cooling: "💡 Vérifiez l'unité extérieure avant de tester le compresseur",
  electricite: "💡 Coupez le disjoncteur principal avant toute manipulation",
  electricity: "💡 Coupez le disjoncteur principal avant toute manipulation",
  plomberie: "💡 Vérifiez la vanne d'arrêt générale avant démontage",
  plumbing: "💡 Vérifiez la vanne d'arrêt générale avant démontage",
  menuiserie: "💡 Prenez les mesures au laser avant les découpes",
  carpentry: "💡 Prenez les mesures au laser avant les découpes",
  peinture: "💡 Nettoyez et poncez la surface pour une meilleure adhérence",
  painting: "💡 Nettoyez et poncez la surface pour une meilleure adhérence",
}

export const AiAdviceCard: React.FC<Props> = ({
  advice,
  category = 'climatisation',
  onPress,
}) => {
  const { t } = useTranslation()

  const normalizedCategory = category.toLowerCase()
  const displayAdvice =
    advice ||
    DEFAULT_ADVICE_BY_CATEGORY[normalizedCategory] ||
    "💡 Vérifiez le matériel et sécurisez la zone d'intervention"

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={s.card}
    >
      <View style={s.sparkleContainer}>
        <Sparkles size={20} color="#0F7B4F" />
      </View>

      <Text style={s.adviceText} numberOfLines={2}>
        {displayAdvice}
      </Text>

      <View style={s.rightAction}>
        <Text style={s.viewAllText}>
          {t('providerMissionActive.aiAdviceViewAll', { defaultValue: 'Voir tout' })}
        </Text>
        <ChevronRight size={14} color="#0F7B4F" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sparkleContainer: {
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: '#0A1628',
    fontWeight: '500',
    lineHeight: 18,
    marginRight: spacing.sm,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F7B4F',
  },
})
