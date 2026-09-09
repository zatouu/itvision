import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Sparkles, ChevronRight, Check, AlertTriangle } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../../design'
import type { StructuredAdvice } from '../../types'

const STATUS_STEP: Record<string, number> = {
  assigned: 1,
  accepted: 1,
  on_the_way: 2,
  provider_arriving: 2,
  arrived: 3,
  in_progress: 4,
  paused: 4,
  awaiting_validation: 5,
}

const TOTAL_STEPS = 5

interface CoachCardProps {
  advice?: StructuredAdvice | null
  status?: string
  loading?: boolean
  offline?: boolean
  onPress?: () => void
  onRetry?: () => void
}

function CoachStepChip({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.stepChip}>
      <Text style={styles.stepChipText}>Étape {step}/{total}</Text>
    </View>
  )
}

function CoachBullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot}>
        <Check size={10} color="#fff" strokeWidth={3.2} />
      </View>
      <Text style={styles.bulletText} numberOfLines={1}>{text}</Text>
    </View>
  )
}

export function CoachCard({ advice, status = 'arrived', loading, offline, onPress, onRetry }: CoachCardProps) {
  const { t } = useTranslation()
  const step = STATUS_STEP[status] || 1

  if (offline) {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <AlertTriangle size={18} color={colors.textMuted} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>{t('coach.unavailable')}</Text>
          <Text style={styles.summary}>{t('coach.unavailableSub')}</Text>
        </View>
        <TouchableOpacity onPress={onRetry} style={styles.retry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.retryText}>{t('coach.retry')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Sparkles size={18} color={colors.brandInk} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>{t('coach.loading')}</Text>
          <View style={styles.skeletons}>
            <View style={styles.skeleton} />
            <View style={[styles.skeleton, { width: '65%' }]} />
            <View style={[styles.skeleton, { width: '78%' }]} />
          </View>
        </View>
      </View>
    )
  }

  if (!advice) return null

  const first = advice.sections?.[0]
  const bullets = first?.items?.slice(0, 2) || []

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {/* Row 1 */}
      <View style={styles.row1}>
        <View style={styles.avatar}>
          <Sparkles size={18} color={colors.brandInk} />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>{t('coach.title').toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={1}>{advice.title || t('coach.title')}</Text>
        </View>
        <CoachStepChip step={step} total={TOTAL_STEPS} />
      </View>

      {/* Row 2 */}
      {advice.summary ? (
        <Text style={styles.summary} numberOfLines={2}>{advice.summary}</Text>
      ) : null}

      {/* Row 3 */}
      <View style={styles.row3}>
        <View style={styles.bullets}>
          {bullets.map((it, i) => <CoachBullet key={i} text={it} />)}
        </View>
        <View style={styles.viewAll}>
          <Text style={styles.viewAllText}>{t('coach.viewAll')}</Text>
          <ChevronRight size={14} color={colors.brandInk} strokeWidth={2.6} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 2,
  },
  titleWrap: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.brandInk, letterSpacing: 0.5, opacity: 0.7, textTransform: 'uppercase' },
  title: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.brandInk, letterSpacing: -0.2 },
  stepChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: '#fff' },
  stepChipText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: colors.brandInk, letterSpacing: 0.2 },
  textWrap: { flex: 1, minWidth: 0 },
  summary: { fontSize: 13, fontWeight: typography.weight.medium as any, color: colors.brandInk, opacity: 0.85, lineHeight: 18 },
  row3: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bullets: { flexDirection: 'row', gap: 10, flex: 1, minWidth: 0 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  bulletDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bulletText: { fontSize: 12.5, fontWeight: typography.weight.semibold as any, color: colors.brandInk, flexShrink: 1 },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  skeletons: { gap: 5, marginTop: 6 },
  skeleton: { height: 8, borderRadius: 4, backgroundColor: '#fff', width: '90%', opacity: 0.7 },
  retry: { paddingVertical: 4 },
  retryText: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
})
