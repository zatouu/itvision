import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg'
import { useTranslation } from 'react-i18next'
import { formatDuration, formatTimer } from '../../utils/duration'
import { radius, spacing } from '../../design'

interface Props {
  status: string
  elapsedSeconds: number
  onLongPress?: () => void
  onPress?: () => void
}

export const MissionStatusHeroCard: React.FC<Props> = ({
  status,
  elapsedSeconds,
  onLongPress,
  onPress,
}) => {
  const { t } = useTranslation()
  const pulseAnim = useRef(new Animated.Value(1)).current
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width > 0 && height > 0) {
      setCardSize({ width, height })
    }
  }

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulseAnim])

  // Gradient selection by status
  let gradientColors: [string, string] = ['#7C3AED', '#9333EA'] // violet for in_progress
  let title = t('providerMissionActive.statusInProgress', { defaultValue: 'Intervention en cours' })

  if (status === 'on_the_way' || status === 'provider_arriving') {
    gradientColors = ['#1D4ED8', '#3B82F6']
    title = t('providerMissionActive.statusEnRoute', { defaultValue: 'En route vers le client' })
  } else if (status === 'arrived') {
    gradientColors = ['#2563EB', '#60A5FA']
    title = t('providerMissionActive.statusArrived', { defaultValue: 'Sur place' })
  } else if (status === 'paused') {
    gradientColors = ['#D97706', '#F59E0B']
    title = t('providerMissionActive.statusPaused', { defaultValue: 'En pause' })
  } else if (status === 'awaiting_validation') {
    gradientColors = ['#D97706', '#F59E0B']
    title = t('providerMissionActive.statusAwaitingValidation', { defaultValue: 'En attente de validation' })
  } else if (status === 'assigned' || status === 'accepted') {
    gradientColors = ['#0F7B4F', '#10B981']
    title = t('providerMissionActive.statusAssigned', { defaultValue: 'Mission assignée' })
  } else if (status === 'completed') {
    gradientColors = ['#0F7B4F', '#059669']
    title = t('providerMissionActive.progressCompleted', { defaultValue: 'Terminée' })
  }

  const durationText = formatDuration(elapsedSeconds)
  const timerText = formatTimer(elapsedSeconds)
  const sinceText = t('providerMissionActive.since', {
    duration: durationText,
    defaultValue: `Depuis ${durationText}`,
  })

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={s.wrapper}
    >
      <View
        style={[s.gradientCard, { backgroundColor: gradientColors[0] }]}
        onLayout={onLayout}
      >
        {/* SVG Gradient Fill matching exact measured container */}
        {cardSize.width > 0 && cardSize.height > 0 && (
          <Svg
            style={StyleSheet.absoluteFillObject}
            width={cardSize.width}
            height={cardSize.height}
            pointerEvents="none"
          >
            <Defs>
              <SvgLinearGradient id="heroCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
                <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect
              width={cardSize.width}
              height={cardSize.height}
              fill="url(#heroCardGrad)"
              rx={radius['2xl']}
              ry={radius['2xl']}
            />
          </Svg>
        )}

        <View style={s.leftContent}>
          <View style={s.statusTagRow}>
            <Animated.View style={[s.pulseDot, { opacity: pulseAnim }]} />
            <Text style={s.statusTagText}>
              {t('providerMissionActive.statusCurrent', { defaultValue: 'STATUT ACTUEL' })}
            </Text>
          </View>
          <Text style={s.mainTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={s.sinceSubtitle}>
            {sinceText}
          </Text>
        </View>

        <View style={s.timerContainer}>
          <View style={s.timerCircle}>
            <Text style={s.timerText}>{timerText}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius['2xl'],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  gradientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: radius['2xl'],
    minHeight: 110,
    overflow: 'hidden',
  },
  leftContent: {
    flex: 1,
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  statusTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.88)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 25,
  },
  sinceSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  timerText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F7B4F',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
})
