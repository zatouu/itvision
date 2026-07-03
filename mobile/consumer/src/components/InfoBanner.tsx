import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, spacing, typography } from '../design'

type Props = {
  icon?: string
  title?: string
  text: string
  variant?: 'info' | 'success' | 'warning'
}

const variants = {
  info: { bg: colors.infoLight, color: colors.info, icon: 'ℹ️' },
  success: { bg: colors.successLight, color: colors.success, icon: '✅' },
  warning: { bg: colors.warningLight, color: colors.warning, icon: '⚠️' },
}

export default function InfoBanner({ icon, title, text, variant = 'info' }: Props) {
  const v = variants[variant]
  return (
    <View style={[s.banner, { backgroundColor: v.bg }]}>
      <Text style={s.icon}>{icon || v.icon}</Text>
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
