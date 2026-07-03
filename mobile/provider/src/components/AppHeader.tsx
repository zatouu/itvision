import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Bell } from 'lucide-react-native'
import { colors, spacing, typography } from '../design'

type Props = {
  title?: string
  onBack?: () => void
  right?: React.ReactNode
  showBell?: boolean
  onBell?: () => void
  badge?: number
  transparent?: boolean
  left?: React.ReactNode
}

export default function AppHeader({ title, onBack, right, showBell, onBell, badge, transparent, left }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm }, transparent && s.transparent]}>
      <View style={s.side}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={s.iconBtn} activeOpacity={0.8}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          left || <View style={s.placeholder} />
        )}
      </View>
      {title ? <Text style={s.title}>{title}</Text> : null}
      <View style={[s.side, s.right]}>
        {right}
        {showBell ? (
          <TouchableOpacity onPress={onBell} style={s.iconBtn} activeOpacity={0.8}>
            <Bell size={22} color={colors.text} />
            {badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
        {!right && !showBell ? <View style={s.placeholder} /> : null}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.bg,
  },
  transparent: { backgroundColor: 'transparent' },
  side: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 40 },
  right: { justifyContent: 'flex-end' },
  title: {
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    textAlign: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  placeholder: { width: 40 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, color: colors.surface, fontWeight: typography.weight.bold as any },
})
