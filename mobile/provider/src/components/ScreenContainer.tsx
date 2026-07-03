import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../design'

type Props = {
  children: React.ReactNode
  scroll?: boolean
  refresh?: boolean
  onRefresh?: () => void
  safe?: boolean
  style?: any
  contentStyle?: any
  padding?: boolean
}

export default function ScreenContainer({
  children,
  scroll = true,
  refresh,
  onRefresh,
  safe = true,
  style,
  contentStyle,
  padding = true,
}: Props) {
  const inner = (
    <View style={[s.container, padding && s.padding, style]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, contentStyle]}
          refreshControl={refresh && onRefresh ? <RefreshControl refreshing={refresh} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[s.content, contentStyle]}>{children}</View>
      )}
    </View>
  )

  if (safe) return <SafeAreaView style={s.safe}>{inner}</SafeAreaView>
  return inner
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  padding: { paddingHorizontal: spacing.lg },
  content: { paddingBottom: spacing.xxxl },
})
