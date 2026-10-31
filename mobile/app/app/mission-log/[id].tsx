import { createThemedStyles } from '../../src/theme'
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
import { ListOrdered } from 'lucide-react-native'
import { BackIcon } from '../../src/components/BackButton'

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
  const { colors, s } = useStyles()
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
          <BackIcon size={20} color={colors.text} strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {t('providerMissionDetails.logTitle', { defaultValue: 'Journal de la mission' })}
        </Text>
        <View style={s.headerBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primaryText} />
        </View>
      ) : entries.length === 0 ? (
        <View style={s.center}>
          <ListOrdered size={32} color={colors.textMuted} />
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



export default withScreenBoundary(MissionLogScreen, 'MissionLog')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: colors.text },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    scroll: { padding: 16, gap: 18, paddingBottom: 40 },
    dayGroup: { gap: 8 },
    dayTitle: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, gap: 14, borderWidth: 1, borderColor: colors.borderSoft },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rail: { width: 14, alignItems: 'center' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
    dotCurrent: { backgroundColor: colors.success, borderWidth: 3, borderColor: colors.successLight },
    line: { position: 'absolute', top: 12, width: 2, height: 28, backgroundColor: colors.bgDeep },
    time: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, width: 44 },
    label: { flex: 1, fontSize: 13, color: colors.textSecondary },
    labelCurrent: { fontWeight: '800', color: colors.primaryText },
    currentBadge: { backgroundColor: colors.brandSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    currentBadgeText: { fontSize: 10, fontWeight: '800', color: colors.primaryText },
  })
  return { colors, s }
})
