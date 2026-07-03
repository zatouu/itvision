import { View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, shadows, spacing } from '../design'

type Props = {
  children: React.ReactNode
  style?: any
}

export default function StickyBottomBar({ children, style }: Props) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }, style]}>
      {children}
    </View>
  )
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    ...shadows.xl,
  },
})
