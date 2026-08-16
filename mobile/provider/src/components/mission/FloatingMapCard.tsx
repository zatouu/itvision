import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { radius, spacing } from '../../design'

interface Props {
  duration?: string
  distance?: string
}

export const FloatingMapCard: React.FC<Props> = ({
  duration = '2 min',
  distance = '1.2 km',
}) => {
  const { t } = useTranslation()

  return (
    <View style={s.card}>
      <View style={s.section}>
        <Text style={s.valueText}>{duration}</Text>
        <Text style={s.labelText}>
          {t('providerMissionActive.estimatedTime', { defaultValue: 'Temps estimé' })}
        </Text>
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.valueText}>{distance}</Text>
        <Text style={s.labelText}>
          {t('providerMissionActive.distance', { defaultValue: 'Distance' })}
        </Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 120,
  },
  section: {
    paddingVertical: 2,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A1628',
    letterSpacing: -0.3,
  },
  labelText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
})
