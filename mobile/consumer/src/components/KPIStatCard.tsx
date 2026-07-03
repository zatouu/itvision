import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, shadows, spacing, typography } from '../design'

type Props = {
  icon?: string
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'navy' | 'blue' | 'orange'
  compact?: boolean
}

const accentMap = {
  green: { bg: '#E6F4EC', color: colors.primary },
  navy: { bg: '#E2E8F0', color: colors.navy },
  blue: { bg: '#EFF6FF', color: colors.electricity },
  orange: { bg: '#FFF7ED', color: colors.carpentry },
}

export default function KPIStatCard({ icon, label, value, sub, accent = 'green', compact }: Props) {
  const a = accentMap[accent]
  return (
    <View style={[s.card, shadows.sm, compact && s.compact]}>
      <View style={[s.iconCircle, { backgroundColor: a.bg }]}>
        <Text style={[s.icon, { color: a.color }]}>{icon || '•'}</Text>
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label}>{label}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  compact: { padding: spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 16 },
  value: {
    fontSize: typography.xl.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    marginTop: spacing.xs,
  },
  label: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium as any,
    marginTop: 2,
  },
  sub: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
})
