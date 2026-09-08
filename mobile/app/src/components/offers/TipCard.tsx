import { View, Text, StyleSheet } from 'react-native'
import { Lightbulb } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography } from '../../design'

export default function TipCard() {
  const { t } = useTranslation()
  return (
    <View style={s.card}>
      <Lightbulb size={18} color={colors.warning} />
      <Text style={s.text}>{t('clientOffers.tipVoice')}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  text: {
    flex: 1,
    fontSize: typography.sm.fontSize,
    color: '#92400E',
    lineHeight: 18,
  },
})
