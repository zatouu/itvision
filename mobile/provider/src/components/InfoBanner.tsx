import { View, Text, StyleSheet } from 'react-native'
import { Info, CheckCircle2, AlertTriangle } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../design'

type Props = {
  title?: string
  text: string
  variant?: 'info' | 'success' | 'warning'
}

const variants = {
  info: { bg: colors.infoLight, color: colors.info, Icon: Info },
  success: { bg: colors.successLight, color: colors.success, Icon: CheckCircle2 },
  warning: { bg: colors.warningLight, color: colors.warning, Icon: AlertTriangle },
}

export default function InfoBanner({ title, text, variant = 'info' }: Props) {
  const v = variants[variant]
  return (
    <View style={[s.banner, { backgroundColor: v.bg }]}>
      <v.Icon size={18} color={v.color} />
      <View style={s.text}>
        {title ? <Text style={[s.title, { color: v.color }]}>{title}</Text> : null}
        <Text style={[s.body, { color: v.color }]}>{text}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: { fontSize: 16, marginTop: 1 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any },
  body: { fontSize: typography.sm.fontSize, lineHeight: 18 },
})
