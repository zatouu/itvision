import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../design'

type Props = {
  title: string
  action?: string
  onAction?: () => void
  compact?: boolean
}

export default function SectionHeader({ title, action, onAction, compact }: Props) {
  return (
    <View style={[s.row, compact && s.compact]}>
      <Text style={s.title}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction} style={s.action} activeOpacity={0.7}>
          <Text style={s.actionText}>{action}</Text>
          <Text style={s.actionText}>›</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  compact: { marginTop: spacing.sm, marginBottom: spacing.sm },
  title: {
    fontSize: typography.md.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.semibold as any,
    color: colors.primary,
  },
})
