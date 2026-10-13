import { createThemedStyles } from '../theme'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { type } from '../design'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const { s } = useStyles()
  return (
    <View style={s.container}>
      <View style={s.iconCircle}>
        {icon}
      </View>
      <Text style={s.title} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.75} accessibilityRole="button">
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 8 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    icon: { },
    title: { ...type.title3, color: colors.ink, textAlign: 'center' },
    subtitle: { ...type.subhead, color: colors.textSecondary, textAlign: 'center', maxWidth: 280 },
    btn: { backgroundColor: colors.brandSoft, borderRadius: 14, paddingHorizontal: 22, minHeight: 44, justifyContent: 'center', marginTop: 12 },
    btnText: { ...type.headline, color: colors.brandInk },
  })
  return { colors, s }
})
