import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sparkles, ChevronRight, Check } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../../design'
import type { StructuredAdvice } from '../../types'

interface CoachCardProps {
  advice?: StructuredAdvice | null
  loading?: boolean
  offline?: boolean
  onPress?: () => void
  onRetry?: () => void
}

export function CoachCard({ advice, loading, offline, onPress, onRetry }: CoachCardProps) {
  const { t } = useTranslation()

  if (offline) {
    return (
      <View style={s.card}>
        <View style={s.iconWrap}>
          <Sparkles size={18} color={colors.textMuted} />
        </View>
        <View style={s.textWrap}>
          <Text style={s.title}>{t('coach.title')}</Text>
          <Text style={s.summary}>{t('coach.unavailable')}</Text>
        </View>
        <TouchableOpacity onPress={onRetry} style={s.retry}>
          <Text style={s.retryText}>{t('coach.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={s.card}>
        <View style={s.iconWrap}>
          <Sparkles size={18} color={colors.primary} />
        </View>
        <View style={s.textWrap}>
          <Text style={s.title}>{t('coach.title')}</Text>
          <View style={s.skeleton} />
          <View style={[s.skeleton, { width: '60%' }]} />
        </View>
      </View>
    )
  }

  if (!advice) return null

  const first = advice.sections?.[0]
  const items = first?.items?.slice(0, 2) || []

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.85} onPress={onPress}>
      <View style={s.iconWrap}>
        <Sparkles size={18} color={colors.primary} />
      </View>
      <View style={s.textWrap}>
        <Text style={s.title}>{advice.title || t('coach.title')}</Text>
        {advice.summary ? (
          <Text style={s.summary} numberOfLines={2}>{advice.summary}</Text>
        ) : null}
        {items.length > 0 && (
          <View style={s.pills}>
            {items.map((it, i) => (
              <View key={i} style={s.pill}>
                <Check size={11} color={colors.brandInk} />
                <Text style={s.pillText} numberOfLines={1}>{it}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={s.action}>
        <Text style={s.actionText}>{t('coach.viewAll')}</Text>
        <ChevronRight size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.brandInk, marginBottom: 2 },
  summary: { fontSize: 13, color: colors.text, fontWeight: typography.weight.medium as any, lineHeight: 18 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  pillText: { fontSize: 11.5, color: colors.brandInk, fontWeight: typography.weight.semibold as any, maxWidth: 100 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.primary },
  retry: { paddingVertical: 4 },
  retryText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.primary },
  skeleton: { height: 10, borderRadius: 4, backgroundColor: colors.border, width: '80%', marginTop: 4 },
})
