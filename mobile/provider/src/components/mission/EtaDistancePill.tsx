import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Car } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { radius } from '../../design'

interface Props {
  duration?: string
  distance?: string
}

export const EtaDistancePill: React.FC<Props> = ({
  duration = '2 min',
  distance = '1.2 km',
}) => {
  const { t } = useTranslation()
  const fadeAnim = useRef(new Animated.Value(1)).current
  const translateAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    fadeAnim.setValue(0.7)
    translateAnim.setValue(4)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }, [duration, distance])

  return (
    <Animated.View
      style={[
        s.pill,
        { opacity: fadeAnim, transform: [{ translateY: translateAnim }] },
      ]}
    >
      <Car size={18} color="#0F7B4F" strokeWidth={2.2} style={{ marginRight: 8 }} />
      <Text style={s.durationText}>{duration}</Text>
      <Text style={s.dot}>·</Text>
      <Text style={s.distanceText}>{distance}</Text>
    </Animated.View>
  )
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A1628',
    letterSpacing: -0.3,
  },
  dot: {
    fontSize: 14,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
})
