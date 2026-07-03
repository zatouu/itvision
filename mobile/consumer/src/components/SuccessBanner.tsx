import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, spacing, typography } from '../design'

type Props = {
  title: string
  subtitle?: string
  icon?: string
}

export default function SuccessBanner({ title, subtitle, icon = '✅' }: Props) {
  return (
    <View style={s.banner}>
      <View style={s.iconCircle}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <View style={s.text}>
        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.15)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24, color: colors.surface },
  text: { flex: 1, gap: 2 },
  title: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.success },
  subtitle: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
})
