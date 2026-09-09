import { useEffect, useState, useCallback, useMemo } from 'react'
import { colors } from '../src/design'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import SideMenu from '../src/components/SideMenu'
import EmptyState from '../src/components/EmptyState'
import {
  Notification,
  clearNotifications,
  loadBackendNotifications,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../src/notifications'
import { confirm } from '../src/confirm'
import { apiPost } from '../src/api'
import { onNotification } from '../src/socket'
import { humanErrorMessage } from '../src/errorMessages'
import { Menu, Bell, Coins, Truck, Info, Trash2 } from 'lucide-react-native'
import { getPushTokenStatus, scheduleLocalNotification, registerPushToken, clearSystemNotifications } from '../src/push'

type FilterKey = 'all' | 'offer' | 'mission' | 'info'

const KIND_GROUP: Record<Notification['kind'], FilterKey> = {
  'offer-received': 'offer',
  'offer-accepted': 'offer',
  'offer-rejected': 'offer',
  'offer-counter': 'offer',
  'request-assigned': 'mission',
  'request-new': 'mission',
  'request-status-changed': 'mission',
  'mission-update': 'mission',
  'info': 'info',
}

const GROUP_META: Record<FilterKey, { icon: any; color: string; bg: string; tagKey: string }> = {
  all: { icon: Bell, color: colors.textMuted, bg: colors.bgDeep, tagKey: 'notifications.kind_info' },
  offer: { icon: Coins, color: '#D97706', bg: colors.warningLight, tagKey: 'notifications.kind_offer' },
  mission: { icon: Truck, color: colors.primary, bg: colors.brandSoft, tagKey: 'notifications.kind_mission' },
  info: { icon: Info, color: colors.textMuted, bg: colors.bgDeep, tagKey: 'notifications.kind_info' },
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

function dayLabel(ts: number, t: any): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (same(d, today)) return t('common.today', { defaultValue: 'Aujourd\'hui' })
  if (same(d, yesterday)) return t('common.yesterday', { defaultValue: 'Hier' })
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })
}

function NotificationsScreen() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Notification[]>([])
  const [, setTick] = useState(0)
  const [diagRunning, setDiagRunning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showRead, setShowRead] = useState(false)

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
        backendResult = `Erreur API: ${humanErrorMessage(e)}`
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
    // Temps réel : le serveur émet 'notification:new' à chaque push envoyé
    const unsubSocket = onNotification(() => {
      loadBackendNotifications().then(fresh => { if (mounted) setItems([...fresh]) }).catch(() => {})
    })
    // Refresh "il y a X" toutes les 60s
    const interval = setInterval(() => setTick(v => v + 1), 60_000)
    return () => { mounted = false; unsubscribe(); unsubSocket(); clearInterval(interval) }
  }, [])

  // Recharger depuis le backend quand l'écran regagne le focus
  // + effacer les notifications affichées dans la barre système
  useFocusEffect(
    useCallback(() => {
      loadBackendNotifications().then(fresh => setItems([...fresh])).catch(() => {})
      clearSystemNotifications().catch(() => {})
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
    setShowRead(false)
  }

  const handleClear = async () => {
    if (items.length === 0) return
    const ok = await confirm(t('notifications.clear'), t('notifications.clear'))
    if (!ok) return
    await clearNotifications()
    setShowRead(false)
  }

  const hasUnread = items.some(it => !it.read)
  const unreadCount = items.filter(it => !it.read).length

  const unreadItems = useMemo(() => items.filter(it => !it.read), [items])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: unreadItems.length, offer: 0, mission: 0, info: 0 }
    unreadItems.forEach(n => { c[KIND_GROUP[n.kind] || 'info']++ })
    return c
  }, [unreadItems])

  const grouped = useMemo(() => {
    const list = (filter === 'all' ? items : items.filter(n => (KIND_GROUP[n.kind] || 'info') === filter))
      .filter(n => showRead || !n.read)
    const groups: { label: string; items: Notification[] }[] = []
    for (const n of list) {
      const label = dayLabel(n.createdAt, t)
      const g = groups.find(g => g.label === label)
      if (g) g.items.push(n)
      else groups.push({ label, items: [n] })
    }
    return groups
  }, [items, filter, showRead, t])

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('requests.filterAll') },
    { key: 'offer', label: t('notifications.kind_offer') },
    { key: 'mission', label: t('notifications.kind_mission') },
    { key: 'info', label: t('notifications.kind_info') },
  ]

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.iconBtn} accessibilityLabel="Menu">
          <Menu size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('notifications.title')}</Text>
          {items.length > 0 && (
            <Text style={s.subtitle}>
              {unreadCount > 0 ? t('notifications.subUnread', { count: unreadCount, defaultValue: `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` }) : t('notifications.subAllRead', { defaultValue: 'Tout est lu' })}
            </Text>
          )}
        </View>
        {__DEV__ && (
          <TouchableOpacity onPress={runDiagnostics} disabled={diagRunning} style={s.iconBtn} accessibilityLabel="Diagnostics">
            {diagRunning ? <ActivityIndicator size="small" color={colors.ink} /> : <Bell size={16} color={colors.ink} />}
          </TouchableOpacity>
        )}
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={s.iconBtn} accessibilityLabel={t('notifications.clear')}>
            <Trash2 size={16} color={colors.danger} />
          </TouchableOpacity>
        )}
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAll} style={s.markAllBtn}>
            <Text style={s.markAllText}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      {items.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map(f => {
            const active = filter === f.key
            return (
              <TouchableOpacity key={f.key} style={[s.chip, active && s.chipActive]} onPress={() => setFilter(f.key)}>
                <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
                {counts[f.key] > 0 && (
                  <View style={[s.chipCount, active && s.chipCountActive]}>
                    <Text style={[s.chipCountText, active && { color: colors.primary }]}>{counts[f.key]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
        {items.some(n => n.read) && (
          <TouchableOpacity onPress={() => setShowRead(v => !v)} style={s.showReadBtn} activeOpacity={0.8}>
            <Text style={s.showReadText}>
              {showRead ? t('notifications.hideRead', { defaultValue: 'Masquer les notifications lues' }) : t('notifications.showRead', { defaultValue: 'Afficher les notifications lues' })}
            </Text>
          </TouchableOpacity>
        )}
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.textMuted} />}
            title={t('notifications.empty')}
          />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<Bell size={32} color={colors.textMuted} />}
            title={t('requests.noResult', { defaultValue: 'Aucun résultat' })}
          />
        ) : (
          grouped.map((g, gi) => (
            <View key={gi} style={{ marginBottom: 18 }}>
              <Text style={s.groupLabel}>{g.label}</Text>
              <View style={{ gap: 8 }}>
                {g.items.map(n => {
                  const group = KIND_GROUP[n.kind] || 'info'
                  const meta = GROUP_META[group]
                  const IconC = meta.icon
                  return (
                    <TouchableOpacity
                      key={n.id}
                      onPress={() => handleOpen(n)}
                      style={[s.card, !n.read && s.cardUnread]}
                      activeOpacity={0.85}
                    >
                      <View style={[s.cardIcon, { backgroundColor: meta.bg }]}>
                        <IconC size={18} color={meta.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.cardTitle, n.read && { fontWeight: '700' }]}>{n.title}</Text>
                        {!!n.body && <Text style={s.cardBody}>{n.body}</Text>}
                        <Text style={s.time}>{formatRelative(n.createdAt, t)}</Text>
                      </View>
                      {!n.read && <View style={s.unreadDot} />}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  filters: { gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  chipCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.slate100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  chipCountActive: { backgroundColor: '#fff' },
  chipCountText: { fontSize: 10, fontWeight: '800', color: colors.textMuted },
  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  showReadBtn: { alignSelf: 'center', marginVertical: 10, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  showReadText: { fontSize: 12, fontWeight: '700' as any, color: colors.textSecondary },
  groupLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 8 },
  card: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  cardUnread: { backgroundColor: colors.surface, borderColor: colors.border },
  cardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, lineHeight: 18 },
  cardBody: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  time: { fontSize: 10.5, color: colors.textDim, marginTop: 5, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6, flexShrink: 0 },
})

export default withScreenBoundary(NotificationsScreen, 'Notifications')
