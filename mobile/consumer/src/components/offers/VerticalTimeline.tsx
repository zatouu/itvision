import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography } from '../../design'

type Step = 'done' | 'active' | 'pending'

type TimelineStep = {
  key: string
  label: string
  status: Step
  statusText?: string
}

type Props = {
  steps: TimelineStep[]
}

function StepIcon({ status }: { status: Step }) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (status !== 'active') return
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [status, pulseAnim])

  if (status === 'done') {
    return (
      <View style={[s.iconCircle, s.iconDone]}>
        <Check size={14} color={colors.surface} strokeWidth={3} />
      </View>
    )
  }
  if (status === 'active') {
    return (
      <Animated.View style={[s.iconCircle, s.iconActive, { transform: [{ scale: pulseAnim }] }]}>
        <View style={s.iconActiveInner} />
      </Animated.View>
    )
  }
  return <View style={[s.iconCircle, s.iconPending]} />
}

export default function VerticalTimeline({ steps }: Props) {
  const { t } = useTranslation()

  return (
    <View>
      <Text style={s.sectionTitle}>{t('clientOffers.howItWorks')}</Text>
      {steps.map((step, idx) => (
        <View key={step.key} style={s.stepRow}>
          {/* Line + Icon column */}
          <View style={s.iconCol}>
            {idx > 0 && <View style={[s.line, steps[idx - 1].status === 'done' && s.lineDone]} />}
            <StepIcon status={step.status} />
            {idx < steps.length - 1 && <View style={[s.line, step.status === 'done' && s.lineDone]} />}
          </View>
          {/* Content */}
          <View style={s.contentCol}>
            <Text style={[
              s.stepLabel,
              step.status === 'active' && s.stepLabelActive,
              step.status === 'pending' && s.stepLabelPending,
            ]}>
              {step.label}
            </Text>
            {step.statusText ? (
              <Text style={[
                s.stepStatus,
                step.status === 'active' && s.stepStatusActive,
              ]}>
                {step.statusText}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: typography.xs.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  stepRow: { flexDirection: 'row', minHeight: 52 },
  iconCol: { width: 32, alignItems: 'center' },
  line: { width: 2, flex: 1, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.success },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDone: { backgroundColor: colors.success },
  iconActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  iconActiveInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  iconPending: {
    backgroundColor: colors.bg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  contentCol: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.lg },
  stepLabel: {
    fontSize: typography.base.fontSize,
    fontWeight: typography.weight.semibold as any,
    color: colors.text,
  },
  stepLabelActive: { color: colors.primary },
  stepLabelPending: { color: colors.textMuted },
  stepStatus: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepStatusActive: { color: colors.primary, fontWeight: typography.weight.medium as any },
})
