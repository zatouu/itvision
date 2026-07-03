import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius, shadows, spacing, typography } from '../design'

type Props = {
  title: string
  subtitle?: string
  icon?: string
  variant?: 'navy' | 'white' | 'green'
  onPress?: () => void
  badge?: string | number
  fullWidth?: boolean
}

export default function ActionCard({ title, subtitle, icon, variant = 'white', onPress, badge, fullWidth }: Props) {
  const isNavy = variant === 'navy'
  const isGreen = variant === 'green'
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.card, isNavy && s.navy, isGreen && s.green, fullWidth && s.fullWidth, shadows.sm]}
    >
      <View style={s.content}>
        <View style={[s.iconCircle, isNavy && s.iconCircleNavy, isGreen && s.iconCircleGreen]}>
          <Text style={s.icon}>{icon || '•'}</Text>
        </View>
        <View style={s.text}>
          <Text style={[s.title, isNavy && s.lightText, isGreen && s.lightText]}>{title}</Text>
          {subtitle ? <Text style={[s.subtitle, isNavy && s.lightSub, isGreen && s.lightSub]}>{subtitle}</Text> : null}
        </View>
      </View>
      {badge ? (
        <View style={[s.badge, isNavy && s.badgeLight, isGreen && s.badgeLight]}>
          <Text style={[s.badgeText, (isNavy || isGreen) && s.badgeTextDark]}>{badge}</Text>
        </View>
      ) : (
        <Text style={[s.chevron, (isNavy || isGreen) && s.lightText]}>›</Text>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullWidth: { width: '100%' },
  navy: { backgroundColor: colors.navy, borderColor: colors.navy },
  green: { backgroundColor: colors.primary, borderColor: colors.primary },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleNavy: { backgroundColor: colors.navyLight },
  iconCircleGreen: { backgroundColor: 'rgba(255,255,255,0.2)' },
  icon: { fontSize: 20 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  subtitle: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  lightText: { color: colors.surface },
  lightSub: { color: 'rgba(255,255,255,0.75)' },
  chevron: { fontSize: 22, color: colors.textSecondary, fontWeight: '300' },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeLight: { backgroundColor: colors.surface },
  badgeText: { fontSize: typography.xs.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  badgeTextDark: { color: colors.text },
})
