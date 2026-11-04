import { createThemedStyles } from '../../theme'
import { View, Text, StyleSheet } from 'react-native'
import { Lightbulb } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { spacing, radius, typography } from '../../design'

export default function TipCard() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  return (
    <View style={s.card}>
      <Lightbulb size={18} color={colors.warning} />
      <Text style={s.text}>{t('clientOffers.tipVoice')}</Text>
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
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
      color: colors.warnInk,
      lineHeight: 18,
    },
  })
  return { colors, s }
})
