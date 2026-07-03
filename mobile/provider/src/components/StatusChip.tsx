import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, spacing, typography } from '../design'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

type Props = {
  label: string
  variant?: Variant
  dot?: boolean
  icon?: string
  small?: boolean
}

const variants: Record<Variant, { bg: string; color: string; dot: string }> = {
  success: { bg: colors.successLight, color: colors.success, dot: '🟢' },
  warning: { bg: colors.warningLight, color: colors.warning, dot: '🟠' },
  danger: { bg: colors.dangerLight, color: colors.danger, dot: '🔴' },
  info: { bg: colors.infoLight, color: colors.info, dot: '🔵' },
  neutral: { bg: '#F1F5F9', color: colors.textSecondary, dot: '⚪' },
  primary: { bg: colors.primaryLight, color: colors.primary, dot: '🟢' },
}

export default function StatusChip({ label, variant = 'neutral', dot, icon, small }: Props) {
  const v = variants[variant]
  return (
    <View style={[s.chip, { backgroundColor: v.bg }, small && s.small]}>
      {dot ? <Text style={s.dot}>{v.dot}</Text> : null}
      {icon ? <Text style={s.dot}>{icon}</Text> : null}
      <Text style={[s.text, { color: v.color }, small && s.textSmall]}>{label}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  small: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  dot: { fontSize: 8 },
  text: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any },
  textSmall: { fontSize: typography.xs.fontSize },
})
