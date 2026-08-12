import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography, shadows, getCategoryMeta } from '../../design'
import VoiceMessagePill from './VoiceMessagePill'

type Props = {
  title: string
  category: string
  location?: string
  publishedMinutesAgo?: number
  budget?: number
  voiceUri?: string
  voiceDuration?: number
}

export default function RequestSummaryCard({
  title,
  category,
  location,
  publishedMinutesAgo,
  budget,
  voiceUri,
  voiceDuration,
}: Props) {
  const { t } = useTranslation()
  const meta = getCategoryMeta(category)

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={[s.catTile, { backgroundColor: meta.color }]}>
          <Text style={s.catAbbr}>{meta.label.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={s.info}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {[location, publishedMinutesAgo != null ? t('clientOffers.publishedAgo', { minutes: publishedMinutesAgo }) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {budget != null && (
          <View style={s.budgetCol}>
            <Text style={s.budgetValue}>{budget.toLocaleString('fr-FR')}</Text>
            <Text style={s.budgetLabel}>{t('clientOffers.budget')}</Text>
          </View>
        )}
      </View>
      {voiceUri ? (
        <View style={s.voiceRow}>
          <VoiceMessagePill uri={voiceUri} durationSeconds={voiceDuration} />
        </View>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  catTile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catAbbr: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  info: { flex: 1 },
  title: { fontSize: typography.base.fontSize, fontWeight: typography.weight.bold as any, color: colors.text },
  subtitle: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  budgetCol: { alignItems: 'flex-end' },
  budgetValue: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  budgetLabel: { fontSize: typography.xs.fontSize, color: colors.textSecondary, marginTop: 1 },
  voiceRow: { marginTop: spacing.sm },
})
