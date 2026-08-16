import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTranslation } from 'react-i18next'
import { formatDuration, formatTimer } from '../../utils/duration'
import { typography, radius, spacing } from '../../design'

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
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
  let gradientColors: [string, string] = ['#7C3AED', '#A855F7'] // violet for in_progress
  let title = t('providerMissionActive.statusInProgress', { defaultValue: 'Intervention en cours' })

  if (status === 'on_the_way' || status === 'provider_arriving') {
    gradientColors = ['#2563EB', '#3B82F6']
    title = t('providerMissionActive.statusEnRoute', { defaultValue: 'En route vers le client' })
  } else if (status === 'arrived') {
    gradientColors = ['#2563EB', '#3B82F6']
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
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientCard}
      >
        <View style={s.leftContent}>
          <View style={s.statusTagRow}>
            <Animated.View style={[s.pulseDot, { opacity: pulseAnim }]} />
            <Text style={s.statusTagText}>
              {t('providerMissionActive.statusCurrent', { defaultValue: 'STATUT ACTUEL' })}
            </Text>
          </View>
          <Text style={s.mainTitle} numberOfLines={1} adjustsFontSizeToFit>
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
      </LinearGradient>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius['2xl'],
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  gradientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius['2xl'],
    minHeight: 120,
  },
  leftContent: {
    flex: 1,
    paddingRight: spacing.md,
    justifyContent: 'center',
  },
  statusTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sinceSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timerText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F7B4F',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
})
