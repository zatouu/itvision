import { View, Text, StyleSheet } from 'react-native'
import { Circle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../design'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

type Props = {
  label: string
  variant?: Variant
  dot?: boolean
  icon?: React.ReactNode
  small?: boolean
}

const variants: Record<Variant, { bg: string; color: string; Icon: typeof Circle }> = {
  success: { bg: colors.successLight, color: colors.success, Icon: CheckCircle2 },
  warning: { bg: colors.warningLight, color: colors.warning, Icon: AlertTriangle },
  danger: { bg: colors.dangerLight, color: colors.danger, Icon: AlertTriangle },
  info: { bg: colors.infoLight, color: colors.info, Icon: Info },
  neutral: { bg: '#F1F5F9', color: colors.textSecondary, Icon: Circle },
  primary: { bg: colors.primaryLight, color: colors.primary, Icon: Circle },
}

export default function StatusChip({ label, variant = 'neutral', dot, icon, small }: Props) {
  const v = variants[variant]
  const iconSize = small ? 10 : 12
  return (
    <View style={[s.chip, { backgroundColor: v.bg }, small && s.small]}>
      {dot ? <v.Icon size={iconSize} color={v.color} /> : null}
      {icon ? <View style={s.iconWrap}>{icon}</View> : null}
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
  iconWrap: { marginRight: 2 },
  text: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any },
  textSmall: { fontSize: typography.xs.fontSize },
})
