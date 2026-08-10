import { useEffect, useState, useCallback } from 'react'
import { colors } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import SideMenu from '../src/components/SideMenu'
import { Menu } from 'lucide-react-native'
import EmptyState from '../src/components/EmptyState'
import {
  Notification,
  clearNotifications,
  loadNotifications,
  reloadNotifications,
  loadBackendNotifications,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../src/notifications'
import { confirm } from '../src/confirm'
import { apiPost } from '../src/api'
import { Bell } from 'lucide-react-native'
import { getPushTokenStatus, scheduleLocalNotification, registerPushToken } from '../src/push'

const KIND_META: Record<Notification['kind'], { tagKey: string; color: string; bg: string }> = {
  'offer-received':         { tagKey: 'notifications.kind_offer',       color: '#B45309', bg: colors.warningLight },
  'request-assigned':       { tagKey: 'notifications.kind_mission',     color: '#065F46', bg: '#ECFDF5' },
  'request-status-changed': { tagKey: 'notifications.kind_mission',     color: '#5B21B6', bg: '#F5F3FF' },
  'mission-update':         { tagKey: 'notifications.kind_mission',     color: colors.navyLight, bg: colors.slate100 },
  'info':                   { tagKey: 'notifications.kind_info',       color: '#475569', bg: colors.slate100 },
}

function formatRelative(ts: number, t: any): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 60) return t('notifications.ago_seconds', { count: diffSec })
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return t('notifications.ago_minutes', { count: diffMin })
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return t('notifications.ago_hours', { count: diffH })
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

function NotificationsScreen() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Notification[]>([])
  const [, setTick] = useState(0)
  const [diagRunning, setDiagRunning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      const fresh = await loadBackendNotifications()
      setItems([...fresh])
    } catch {} finally {
      setRefreshing(false)
    }
  }

  const runDiagnostics = async () => {
    setDiagRunning(true)
    try {
      const status = await getPushTokenStatus()
      const localId = await scheduleLocalNotification('Test local Xeuy Bi', 'Cette notification locale prouve que canal + permissions fonctionnent.', { type: 'test:local' })

      let backendResult = 'Non testé'
      try {
        const r = await apiPost('/api/notifications/test-push', { appType: 'consumer' })
        backendResult = r.success
          ? `OK (${r.result?.deliveredCount ?? 0}/${r.result?.tokenCount ?? 0} tokens)`
          : `KO: ${r.result?.error || r.message || 'Échec'}`
      } catch (e: any) {
        backendResult = `Erreur API: ${e?.message || e}`
      }

      Alert.alert(
        'Diagnostics notifications',
        `Permission: ${status.permission ? 'OK' : 'KO'}\n` +
        `Plateforme: ${status.platform}\n` +
        `Token: ${status.token ? status.token.slice(0, 30) + '...' : 'AUCUN'}\n` +
        `ProjectId: ${status.projectId || 'N/A'}\n` +
        `Erreur token: ${status.error || 'Aucune'}\n` +
        `Notification locale: ${localId ? 'OK programmée' : 'KO échec'}\n` +
        `Test backend: ${backendResult}`,
        [
          { text: 'Réenregistrer token', onPress: () => { void registerPushToken() } },
          { text: 'OK', style: 'cancel' },
        ]
      )
    } finally {
      setDiagRunning(false)
    }
  }

  useEffect(() => {
    let mounted = true
    loadBackendNotifications().then(initial => { if (mounted) setItems([...initial]) })
    const unsubscribe = subscribeNotifications(next => {
      if (mounted) setItems([...next])
    })
    // Refresh "il y a X" toutes les 60s
    const interval = setInterval(() => setTick(v => v + 1), 60_000)
    return () => { mounted = false; unsubscribe(); clearInterval(interval) }
  }, [])

  // Recharger depuis AsyncStorage + backend quand l'écran regagne le focus
  useFocusEffect(
    useCallback(() => {
      loadBackendNotifications().then(fresh => setItems([...fresh])).catch(() => {})
    }, [])
  )

  const handleOpen = async (n: Notification) => {
    if (!n.read) await markRead(n.id)
    if (n.link?.pathname) {
      if (n.link.params) {
        router.push({ pathname: n.link.pathname as any, params: n.link.params })
      } else {
        router.push(n.link.pathname as any)
      }
    }
  }

  const handleMarkAll = async () => {
    if (!items.some(it => !it.read)) return
    await markAllRead()
  }

  const handleClear = async () => {
    if (items.length === 0) return
    const ok = await confirm(t('notifications.clear'), t('notifications.clear'))
    if (!ok) return
    await clearNotifications()
  }

  const hasUnread = items.some(it => !it.read)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.menuBtn} accessibilityLabel="Menu">
            <Menu size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>{t('notifications.title')}</Text>
        </View>
        <View style={s.headerActions}>
          {__DEV__ && (
            <TouchableOpacity onPress={runDiagnostics} disabled={diagRunning} style={[s.headerBtn, s.headerBtnDebug]}>
              {diagRunning ? <ActivityIndicator size="small" color={colors.text} /> : <Text style={s.headerBtnText}>Tester</Text>}
            </TouchableOpacity>
          )}
          {hasUnread && (
            <TouchableOpacity onPress={handleMarkAll} style={s.headerBtn}>
              <Text style={s.headerBtnText}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          )}
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={[s.headerBtn, s.headerBtnDanger]}>
              <Text style={[s.headerBtnText, s.headerBtnTextDanger]}>{t('notifications.clear')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.textMuted} />}
            title={t('notifications.empty')}
          />
        ) : (
          items.map(n => {
            const meta = KIND_META[n.kind] ?? { tagKey: 'notifications.kind_info', color: '#475569', bg: colors.slate100 }
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleOpen(n)}
                style={[s.card, !n.read && s.cardUnread]}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  <View style={[s.tag, { backgroundColor: meta.bg }]}>
                    <Text style={[s.tagText, { color: meta.color }]}>{t(meta.tagKey)}</Text>
                  </View>
                  <Text style={s.time}>{formatRelative(n.createdAt, t)}</Text>
                </View>
                <Text style={s.cardTitle}>{n.title}</Text>
                <Text style={s.cardBody}>{n.body}</Text>
                {!n.read && <View style={s.unreadDot} />}
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.slate50 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, gap: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.slate100 },
  headerBtnDanger: { backgroundColor: '#FEF2F2' },
  headerBtnDebug: { backgroundColor: '#E0F2FE' },
  headerBtnText: { fontSize: 12, fontWeight: '700', color: colors.text },
  headerBtnTextDanger: { color: '#B91C1C' },
  body: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, position: 'relative' },
  cardUnread: { borderColor: '#BFDBFE', backgroundColor: '#F0F9FF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#475569', lineHeight: 18 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
})

export default withScreenBoundary(NotificationsScreen, 'Notifications')
