import React from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native'
import { X, Activity, Clock, PauseCircle, Calendar, Hash } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { formatDuration } from '../../utils/duration'
import { radius, spacing } from '../../design'

interface Props {
  visible: boolean
  onClose: () => void
  activeSeconds: number
  pausedSeconds: number
  pauseCount: number
  lastActivityAt?: number | null
  createdAt?: string | null
  requestId?: string | null
}

export const AdminMetricsModal: React.FC<Props> = ({
  visible,
  onClose,
  activeSeconds,
  pausedSeconds,
  pauseCount,
  lastActivityAt,
  createdAt,
  requestId,
}) => {
  const { t } = useTranslation()

  const formattedLastActivity = lastActivityAt
    ? new Date(lastActivityAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

  const formattedCreatedAt = createdAt
    ? new Date(createdAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={s.sheet}>
          <View style={s.header}>
            <View style={s.headerTitleRow}>
              <Activity size={20} color="#0F7B4F" style={{ marginRight: 8 }} />
              <Text style={s.title}>
                {t('providerMissionActive.adminMetricsTitle', { defaultValue: 'Détails de la mission' })}
              </Text>
            </View>

            <TouchableOpacity style={s.closeButton} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.content}>
            <View style={s.metricCard}>
              <View style={s.metricIconSlot}>
                <Clock size={18} color="#0F7B4F" />
              </View>
              <View style={s.metricInfo}>
                <Text style={s.metricLabel}>
                  {t('providerMissionActive.adminTotalActiveTime', { defaultValue: 'Temps actif total' })}
                </Text>
                <Text style={s.metricValue}>{formatDuration(activeSeconds)}</Text>
              </View>
            </View>

            <View style={s.metricCard}>
              <View style={[s.metricIconSlot, { backgroundColor: '#FEF3C7' }]}>
                <PauseCircle size={18} color="#D97706" />
              </View>
              <View style={s.metricInfo}>
                <Text style={s.metricLabel}>
                  {t('providerMissionActive.adminPauseTime', { defaultValue: 'Temps en pause' })}
                </Text>
                <Text style={s.metricValue}>{formatDuration(pausedSeconds)}</Text>
              </View>
            </View>

            <View style={s.metricCard}>
              <View style={[s.metricIconSlot, { backgroundColor: '#EFF6FF' }]}>
                <Hash size={18} color="#2563EB" />
              </View>
              <View style={s.metricInfo}>
                <Text style={s.metricLabel}>
                  {t('providerMissionActive.adminPauseCount', { defaultValue: 'Nombre de pauses' })}
                </Text>
                <Text style={s.metricValue}>{pauseCount}</Text>
              </View>
            </View>

            <View style={s.metricCard}>
              <View style={[s.metricIconSlot, { backgroundColor: '#F1F5F9' }]}>
                <Activity size={18} color="#475569" />
              </View>
              <View style={s.metricInfo}>
                <Text style={s.metricLabel}>
                  {t('providerMissionActive.adminLastActivity', { defaultValue: 'Dernière activité' })}
                </Text>
                <Text style={s.metricValue}>{formattedLastActivity}</Text>
              </View>
            </View>

            {createdAt ? (
              <View style={s.metricCard}>
                <View style={[s.metricIconSlot, { backgroundColor: '#F1F5F9' }]}>
                  <Calendar size={18} color="#475569" />
                </View>
                <View style={s.metricInfo}>
                  <Text style={s.metricLabel}>Création de la mission</Text>
                  <Text style={s.metricValue}>{formattedCreatedAt}</Text>
                </View>
              </View>
            ) : null}

            {requestId ? (
              <Text style={s.requestIdText}>ID Mission: {requestId}</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A1628',
  },
  closeButton: {
    padding: 6,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: 12,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
  },
  metricIconSlot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0A1628',
  },
  requestIdText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: spacing.md,
  },
})
