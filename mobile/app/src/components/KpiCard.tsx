import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native'
import { useEffect, useRef } from 'react'
import { colors, radius, shadows, spacing, typography } from '../design'

type KpiCardProps = {
  value: string | number
  label: string
  subLabel?: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  onPress?: () => void
  right?: React.ReactNode
  compact?: boolean
}

export default function KpiCard({ value, label, subLabel, icon, iconBg, iconColor, onPress, right, compact }: KpiCardProps) {
  const scale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.06, duration: 120, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start()
  }, [value])

  // Disposition verticale : icône (+ accessoire) en haut, texte en pleine
  // largeur dessous — en ligne, le libellé n'avait que ~60dp sur 360dp
  // (« Reven us du jour », sous-libellés tronqués).
  const content = (
    <>
      <View style={s.top}>
        <View style={[s.icon, compact && s.iconCompact, { backgroundColor: iconBg }]}>
          {icon}
        </View>
        {right ? <View style={s.right}>{right}</View> : null}
      </View>
      <View style={s.text}>
        <Animated.Text style={[s.value, compact && s.valueCompact, { transform: [{ scale }] }]} numberOfLines={1} ellipsizeMode="tail">{value}</Animated.Text>
        <Text style={[s.label, compact && s.labelCompact]} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
        {subLabel ? <Text style={s.subLabel} numberOfLines={1} ellipsizeMode="tail">{subLabel}</Text> : null}
      </View>
    </>
  )
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.card, compact && s.cardCompact, shadows.sm]}>
        {content}
      </TouchableOpacity>
    )
  }
  return (
    <View style={[s.card, compact && s.cardCompact, shadows.sm]}>
      {content}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCompact: {
    padding: spacing.sm,
    gap: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompact: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  iconText: { },
  text: { flex: 1 },
  right: { justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text },
  valueCompact: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  label: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  labelCompact: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  subLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
})
