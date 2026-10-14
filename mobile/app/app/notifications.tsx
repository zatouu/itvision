import { createThemedStyles } from '../src/theme'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { type, touch, isIOS } from '../src/design'
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import EmptyState from '../src/components/EmptyState'
import SegmentedControl from '../src/components/SegmentedControl'
import {
  Notification,
  clearNotifications,
  loadBackendNotifications,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../src/notifications'
import { apiPost } from '../src/api'
import { confirm } from '../src/confirm'
import { onNotification } from '../src/socket'
import { humanErrorMessage } from '../src/errorMessages'
import { Bell, Coins, Truck, Info, Trash2, CheckCheck } from 'lucide-react-native'
import BackButton from '../src/components/BackButton'
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

// Les anciennes notifications stockées ont un emoji en tête : doublon visuel
// avec l'icône de la carte. On l'enlève à l'affichage.
const LEADING_EMOJI = /^(?:[\u2190-\u2BFF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD00-\uDFFF]|\uFE0F|\u200D|\s)+/
const stripLeadingEmoji = (title: string) => String(title || '').replace(LEADING_EMOJI, '') || title

function NotificationsScreen() {
  const { colors, GROUP_META, s } = useStyles()
  const { t } = useTranslation()
  const [items, setItems] = useState<Notification[]>([])
  const [, setTick] = useState(0)
  const [diagRunning, setDiagRunning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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
    const ok = await confirm(t('notifications.clear'), t('notifications.clearConfirm'))
    if (!ok) return
    await clearNotifications()
    setShowRead(false)
  }

  const hasUnread = items.some(it => !it.read)
  const unreadCount = items.filter(it => !it.read).length

  const unreadItems = useMemo(() => items.filter(it => !it.read), [items])
  // Tout est lu : on montre l'historique plutôt qu'un écran « Aucun résultat » trompeur
  const effectiveShowRead = showRead || unreadItems.length === 0

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: unreadItems.length, offer: 0, mission: 0, info: 0 }
    unreadItems.forEach(n => { c[KIND_GROUP[n.kind] || 'info']++ })
    return c
  }, [unreadItems])

  const grouped = useMemo(() => {
    const list = (filter === 'all' ? items : items.filter(n => (KIND_GROUP[n.kind] || 'info') === filter))
      .filter(n => effectiveShowRead || !n.read)
    const groups: { label: string; items: Notification[] }[] = []
    for (const n of list) {
      const label = dayLabel(n.createdAt, t)
      const g = groups.find(g => g.label === label)
      if (g) g.items.push(n)
      else groups.push({ label, items: [n] })
    }
    return groups
  }, [items, filter, effectiveShowRead, t])

  const FILTERS: { key: FilterKey; label: string; count?: number }[] = [
    { key: 'all', label: t('requests.filterAll'), count: counts.all },
    { key: 'offer', label: t('notifications.kind_offer'), count: counts.offer },
    { key: 'mission', label: t('notifications.kind_mission'), count: counts.mission },
    { key: 'info', label: t('notifications.kind_info'), count: counts.info },
  ]

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.navBar}>
        <BackButton />
        <View style={{ flex: 1 }} />
        {__DEV__ && (
          <TouchableOpacity onPress={runDiagnostics} disabled={diagRunning} style={s.navBtn} accessibilityLabel="Diagnostics">
            {diagRunning ? <ActivityIndicator size="small" color={colors.ink} /> : <Bell size={18} color={colors.textSecondary} />}
          </TouchableOpacity>
        )}
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAll} style={s.navBtn} hitSlop={touch.hitSlop}
            accessibilityRole="button" accessibilityLabel={t('notifications.markAllRead')}>
            <CheckCheck size={21} color={colors.primaryText} />
          </TouchableOpacity>
        )}
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={s.navBtn} hitSlop={touch.hitSlop}
            accessibilityRole="button" accessibilityLabel={t('notifications.clear')}>
            <Trash2 size={19} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.titleBlock}>
        <Text style={s.title} accessibilityRole="header">{t('notifications.title')}</Text>
        {items.length > 0 && (
          <Text style={s.subtitle}>
            {unreadCount > 0 ? t('notifications.subUnread', { count: unreadCount, defaultValue: `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` }) : t('notifications.subAllRead', { defaultValue: 'Tout est lu' })}
          </Text>
        )}
      </View>

      {items.length > 0 && (
        <View style={s.segmentWrap}>
          <SegmentedControl segments={FILTERS} value={filter} onChange={setFilter} />
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryText} />}>
        {items.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} color={colors.textSecondary} />}
            title={t('notifications.empty')}
          />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} color={colors.textSecondary} />}
            title={t('requests.noResult', { defaultValue: 'Aucun résultat' })}
          />
        ) : (
          grouped.map(g => (
            <View key={g.label} style={s.group}>
              <Text style={s.groupLabel} accessibilityRole="header">{g.label}</Text>
              <View style={s.groupCard}>
                {g.items.map((n, i) => {
                  const group = KIND_GROUP[n.kind] || 'info'
                  const meta = GROUP_META[group]
                  const IconC = meta.icon
                  const last = i === g.items.length - 1
                  return (
                    <Pressable
                      key={n.id}
                      onPress={() => handleOpen(n)}
                      android_ripple={touch.ripple}
                      style={({ pressed }) => [s.row, isIOS && pressed && { backgroundColor: colors.fill }]}
                      accessibilityRole="button"
                      accessibilityLabel={`${n.read ? '' : t('notifications.unreadA11y', { defaultValue: 'Non lue' }) + ', '}${stripLeadingEmoji(n.title)}`}
                    >
                      <View style={[s.rowIcon, { backgroundColor: meta.bg }]}>
                        <IconC size={17} color={meta.color} />
                      </View>
                      <View style={[s.rowMain, !last && s.rowSeparator]}>
                        <View style={s.rowTop}>
                          <Text style={[s.rowTitle, !n.read && s.rowTitleUnread]} numberOfLines={2}>{stripLeadingEmoji(n.title)}</Text>
                          <Text style={s.time}>{formatRelative(n.createdAt, t)}</Text>
                        </View>
                        {!!n.body && <Text style={s.rowBody} numberOfLines={3}>{n.body}</Text>}
                      </View>
                      {!n.read && <View style={s.unreadDot} />}
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ))
        )}
        {hasUnread && items.some(n => n.read) && (
          <TouchableOpacity onPress={() => setShowRead(v => !v)} style={s.showReadBtn} activeOpacity={0.6} accessibilityRole="button">
            <Text style={s.showReadText}>
              {showRead ? t('notifications.hideRead', { defaultValue: 'Masquer les notifications lues' }) : t('notifications.showRead', { defaultValue: 'Afficher les notifications lues' })}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(NotificationsScreen, 'Notifications')

const useStyles = createThemedStyles(colors => {
  const GROUP_META: Record<FilterKey, { icon: any; color: string; bg: string; tagKey: string }> = {
    all: { icon: Bell, color: colors.textMuted, bg: colors.bgDeep, tagKey: 'notifications.kind_info' },
    offer: { icon: Coins, color: '#D97706', bg: colors.warningLight, tagKey: 'notifications.kind_offer' },
    mission: { icon: Truck, color: colors.primaryText, bg: colors.brandSoft, tagKey: 'notifications.kind_mission' },
    info: { icon: Info, color: colors.textMuted, bg: colors.bgDeep, tagKey: 'notifications.kind_info' },
  }

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 48 },
    navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    titleBlock: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { ...type.largeTitle, color: colors.ink },
    subtitle: { ...type.subhead, color: colors.textSecondary, marginTop: 2 },
    segmentWrap: { paddingHorizontal: 16, paddingBottom: 8, flexShrink: 0 },
    body: { paddingTop: 4, paddingBottom: 40 },
    group: { marginTop: 16, marginHorizontal: 16 },
    groupLabel: { ...type.overline, color: colors.textSecondary, marginLeft: 16, marginBottom: 8 },
    groupCard: { backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 14 },
    rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginRight: 12 },
    rowMain: { flex: 1, minWidth: 0, paddingVertical: 12, paddingRight: 28 },
    rowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    rowTitle: { ...type.subhead, flex: 1, color: colors.ink, fontWeight: '500' },
    rowTitleUnread: { fontWeight: '700' },
    rowBody: { ...type.footnote, color: colors.textSecondary, marginTop: 2 },
    time: { ...type.caption, color: colors.textMuted },
    unreadDot: { position: 'absolute', right: 12, top: 34, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
    showReadBtn: { alignSelf: 'center', marginTop: 20, minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
    showReadText: { ...type.callout, color: colors.primaryText },
  })
  return { colors, GROUP_META, s }
})
