import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ListOrdered } from 'lucide-react-native'

import { apiGet } from '../../src/api'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { statusLabelKey } from '../../src/utils/missionStatus'

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

type LogEntry = {
  timestamp: string
  action?: string
  fromStatus?: string | null
  toStatus?: string | null
}

function MissionLogScreen() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)

  const [log, setLog] = useState<LogEntry[]>([])
  const [currentStatus, setCurrentStatus] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!requestId) return
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setLog(Array.isArray(r.item?.statusLog) ? r.item.statusLog : [])
      setCurrentStatus(r.item?.status || '')
    } catch (e: any) {
      toast.error(t('common.error', { defaultValue: 'Erreur' }), humanErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [requestId, t])

  useEffect(() => { load() }, [load])

  const entries = useMemo(() => {
    return log
      .filter((e) => e.toStatus)
      .map((e) => ({
        ...e,
        label: t(`providerMissionDetails.${statusLabelKey(e.toStatus as string)}`, { defaultValue: String(e.toStatus) }),
      }))
  }, [log, t])

  const grouped = useMemo(() => {
    const groups: Record<string, typeof entries> = {}
    for (const e of entries) {
      const day = new Date(e.timestamp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      if (!groups[day]) groups[day] = []
      groups[day].push(e)
    }
    return Object.entries(groups)
  }, [entries])

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()} activeOpacity={0.8} accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}>
          <ArrowLeft size={20} color="#0A1628" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {t('providerMissionDetails.logTitle', { defaultValue: 'Journal de la mission' })}
        </Text>
        <View style={s.headerBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0F7B4F" />
        </View>
      ) : entries.length === 0 ? (
        <View style={s.center}>
          <ListOrdered size={32} color="#94A3B8" />
          <Text style={s.emptyText}>
            {t('providerMissionDetails.logEmpty', { defaultValue: 'Aucun événement enregistré pour le moment' })}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {grouped.map(([day, items]) => (
            <View key={day} style={s.dayGroup}>
              <Text style={s.dayTitle}>{day}</Text>
              <View style={s.card}>
                {items.map((e, i) => {
                  const isLast = day === grouped[grouped.length - 1][0] && i === items.length - 1
                  const isCurrent = isLast && e.toStatus === currentStatus
                  return (
                    <View key={`${e.timestamp}-${i}`} style={s.row}>
                      <View style={s.rail}>
                        <View style={[s.dot, isCurrent && s.dotCurrent]} />
                        {i < items.length - 1 && <View style={s.line} />}
                      </View>
                      <Text style={s.time}>
                        {new Date(e.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[s.label, isCurrent && s.labelCurrent]}>{e.label}</Text>
                      {isCurrent && (
                        <View style={s.currentBadge}>
                          <Text style={s.currentBadgeText}>
                            {t('providerMissionDetails.logCurrent', { defaultValue: 'État actuel' })}
                          </Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#0A1628' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  scroll: { padding: 16, gap: 18, paddingBottom: 40 },
  dayGroup: { gap: 8 },
  dayTitle: { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, gap: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#CBD5E1' },
  dotCurrent: { backgroundColor: '#0F7B4F', borderWidth: 3, borderColor: '#E6F4EC' },
  line: { position: 'absolute', top: 12, width: 2, height: 28, backgroundColor: '#E2E8F0' },
  time: { fontSize: 12, fontWeight: '700', color: '#64748B', width: 44 },
  label: { flex: 1, fontSize: 13, color: '#475569' },
  labelCurrent: { fontWeight: '800', color: '#0F7B4F' },
  currentBadge: { backgroundColor: '#E6F4EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  currentBadgeText: { fontSize: 10, fontWeight: '800', color: '#0F7B4F' },
})

export default withScreenBoundary(MissionLogScreen, 'MissionLog')
