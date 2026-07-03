import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import { colors, radius, shadows, spacing, typography } from '../design'

type KpiCardProps = {
  value: string | number
  label: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  onPress?: () => void
}

export default function KpiCard({ value, label, icon, iconBg, iconColor, onPress }: KpiCardProps) {
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.card, shadows.sm]}>
        <View style={[s.icon, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        <View style={s.text}>
          <Text style={s.value}>{value}</Text>
          <Text style={s.label}>{label}</Text>
        </View>
      </TouchableOpacity>
    )
  }
  return (
    <View style={[s.card, shadows.sm]}>
      <View style={[s.icon, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <View style={s.text}>
        <Text style={s.value}>{value}</Text>
        <Text style={s.label}>{label}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { },
  text: { flex: 1 },
  value: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})
