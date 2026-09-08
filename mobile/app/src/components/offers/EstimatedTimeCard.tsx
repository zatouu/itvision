import { View, Text, StyleSheet } from 'react-native'
import { Clock } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography } from '../../design'

export default function EstimatedTimeCard() {
  const { t } = useTranslation()
  return (
    <View style={s.card}>
      <View style={s.iconWrap}>
        <Clock size={28} color={colors.primary} />
      </View>
      <View style={s.textCol}>
        <Text style={s.label}>{t('clientOffers.estimatedTime')}</Text>
        <Text style={s.value}>{t('clientOffers.estimatedValue')}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  label: {
    fontSize: typography.sm.fontSize,
    color: colors.primaryDark,
    fontWeight: typography.weight.medium as any,
  },
  value: {
    fontSize: typography.xxl.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.primary,
    marginTop: 2,
  },
})
