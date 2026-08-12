import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Eye, Timer } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, spacing, radius, typography } from '../../design'

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0m 00s'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

type Props = {
  viewersCount: number
  expiresAt?: string // ISO date for countdown
  compact?: boolean
}

export default function LiveStatusBar({ viewersCount, expiresAt, compact }: Props) {
  const { t } = useTranslation()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const remainingRef = useRef(expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0)
  const timerTextRef = useRef(formatCountdown(remainingRef.current))

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [pulseAnim])

  // Countdown
  const [timerText, setTimerText] = useState(timerTextRef.current)
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const remaining = new Date(expiresAt).getTime() - Date.now()
      setTimerText(formatCountdown(Math.max(0, remaining)))
      if (remaining <= 0 && countdownRef.current) clearInterval(countdownRef.current)
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [expiresAt])

  if (compact) {
    return (
      <View style={s.pillCompact}>
        <Animated.View style={[s.dot, { transform: [{ scale: pulseAnim }] }]} />
        <Text style={s.textCompact}>{t('clientOffers.realtime')}</Text>
        <View style={s.divider} />
        <Eye size={12} color={colors.primaryDark} />
        <Text style={s.textCompact}>{t('clientOffers.viewersCount', { count: viewersCount })}</Text>
        {expiresAt ? (
          <>
            <View style={s.divider} />
            <Timer size={12} color={colors.primaryDark} />
            <Text style={[s.textCompact, s.timerText]}>{timerText}</Text>
          </>
        ) : null}
      </View>
    )
  }

  return (
    <View style={s.pill}>
      <Animated.View style={[s.dot, { transform: [{ scale: pulseAnim }] }]} />
      <Text style={s.text}>{t('clientOffers.realtime')}</Text>
      <View style={s.divider} />
      <View style={s.item}>
        <Eye size={14} color={colors.primaryDark} />
        <Text style={s.text}>{t('clientOffers.viewersCount', { count: viewersCount })}</Text>
      </View>
      {expiresAt ? (
        <>
          <View style={s.divider} />
          <View style={s.item}>
            <Timer size={14} color={colors.primaryDark} />
            <Text style={[s.text, s.timerText]}>{timerText}</Text>
          </View>
        </>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  pillCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  text: {
    fontSize: typography.sm.fontSize,
    color: colors.primaryDark,
    fontWeight: typography.weight.semibold as any,
  },
  textCompact: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: typography.weight.medium as any,
  },
  timerText: {
    fontWeight: typography.weight.bold as any,
    fontVariant: ['tabular-nums'],
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: '#BBF7D0',
  },
})
