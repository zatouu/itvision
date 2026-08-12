import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography } from '../../design'

export const SORT_KEYS = ['recommended', 'cheapest', 'nearest', 'bestRated', 'fastest'] as const
export type SortKey = typeof SORT_KEYS[number]

type Props = {
  active: SortKey
  onChange: (key: SortKey) => void
}

export default function SortingPillsRow({ active, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.row}
    >
      {SORT_KEYS.map(key => (
        <TouchableOpacity
          key={key}
          onPress={() => onChange(key)}
          style={[s.pill, active === key && s.pillActive]}
          activeOpacity={0.8}
        >
          <Text style={[s.text, active === key && s.textActive]}>
            {t(`clientOffers.sort${key.charAt(0).toUpperCase() + key.slice(1)}`)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  text: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium as any,
  },
  textActive: { color: colors.surface, fontWeight: typography.weight.bold as any },
})
