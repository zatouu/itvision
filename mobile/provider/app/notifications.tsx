import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Swipeable } from 'react-native-gesture-handler'
import TabBar from '../src/components/TabBar'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import EmptyState from '../src/components/EmptyState'
import {
  Notification,
  clearNotifications,
  deleteNotification,
  loadNotifications,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../src/notifications'
import { confirm } from '../src/confirm'
import { apiPost } from '../src/api'
import { getPushTokenStatus, scheduleLocalNotification, registerPushToken } from '../src/push'

const KIND_META: Record<Notification['kind'], { icon: string; color: string; bg: string; labelKey: string }> = {
  'request-new':     { icon: 'N', color: '#3B82F6', bg: '#EFF6FF', labelKey: 'notifications.kind_request' },
  'offer-accepted':  { icon: 'A', color: '#10B981', bg: '#ECFDF5', labelKey: 'notifications.kind_offer' },
  'offer-rejected':  { icon: 'R', color: '#EF4444', bg: '#FEF2F2', labelKey: 'notifications.kind_offer' },
  'offer-counter':   { icon: 'C', color: '#F59E0B', bg: '#FFFBEB', labelKey: 'notifications.kind_negotiate' },
  'mission-update':  { icon: 'M', color: '#3B82F6', bg: '#EFF6FF', labelKey: 'notifications.kind_mission' },
}

const SHADOW = Platform.OS === 'ios'
  ? { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }
  : { elevation: 3 }

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatSectionTitle(ts: number, t: any): string {
  const d = new Date(ts)
  const now = new Date()
  if (isSameDay(d, now)) return t('notifications.today')
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(d, yesterday)) return t('notifications.yesterday')
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (d >= weekAgo) return t('notifications.thisWeek')
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatRelative(ts: number, t: any): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 60) return t('notifications.ago_seconds', { count: diffSec })
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return t('notifications.ago_minutes', { count: diffMin })
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return t('notifications.ago_hours', { count: diffH })
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function NotificationsScreen() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Notification[]>([])
  const [, setTick] = useState(0)
  const [diagRunning, setDiagRunning] = useState(false)
  const sectionListRef = useRef<SectionList>(null)
  const fadeAnims = useRef<Map<string, Animated.Value>>(new Map()).current
  const itemsRef = useRef<Notification[]>([])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const runDiagnostics = async () => {
    setDiagRunning(true)
    try {
      const status = await getPushTokenStatus()
      const localId = await scheduleLocalNotification('Test local Xeuy Bi Pro', 'Cette notification locale prouve que canal + permissions fonctionnent.', { type: 'test:local' })

      let backendResult = 'Non testé'
      try {
        const r = await apiPost('/api/notifications/test-push', { appType: 'provider' })
        backendResult = r.success
          ? `OK (${r.result?.deliveredCount ?? 0}/${r.result?.tokenCount ?? 0} tokens)`
          : `KO: ${r.result?.error || r.message || 'Échec'}`
      } catch (e: any) {
        backendResult = `Erreur API: ${e?.message || e}`
      }

      Alert.alert(
        t('notifications.diagnosticsTitle'),
        `${t('notifications.permission')}: ${status.permission ? 'OK' : 'KO'}\n` +
        `${t('notifications.platform')}: ${status.platform}\n` +
        `${t('notifications.token')}: ${status.token ? status.token.slice(0, 30) + '...' : t('notifications.none')}\n` +
        `${t('notifications.projectId')}: ${status.projectId || 'N/A'}\n` +
        `${t('notifications.tokenError')}: ${status.error || t('notifications.none')}\n` +
        `${t('notifications.localNotification')}: ${localId ? 'OK' : 'KO'}\n` +
        `${t('notifications.backendTest')}: ${backendResult}`,
        [
          { text: t('notifications.reregister'), onPress: () => { void registerPushToken() } },
          { text: t('common.ok'), style: 'cancel' },
        ]
      )
    } finally {
      setDiagRunning(false)
    }
  }

  useEffect(() => {
    let mounted = true
    loadNotifications().then(initial => {
      if (!mounted) return
      initial.forEach(n => { if (!fadeAnims.has(n.id)) fadeAnims.set(n.id, new Animated.Value(0)) })
      setItems([...initial])
      Animated.stagger(30, initial.map(n =>
        Animated.timing(fadeAnims.get(n.id)!, { toValue: 1, duration: 250, useNativeDriver: true })
      )).start()
    })
    const unsubscribe = subscribeNotifications(next => {
      if (!mounted) return
      const prevIds = itemsRef.current.map(n => n.id)
      const added = next.filter(n => !prevIds.includes(n.id))
      added.forEach(n => { if (!fadeAnims.has(n.id)) fadeAnims.set(n.id, new Animated.Value(0)) })
      setItems([...next])
      if (added.length > 0) {
        Animated.stagger(30, added.map(n =>
          Animated.timing(fadeAnims.get(n.id)!, { toValue: 1, duration: 250, useNativeDriver: true })
        )).start()
      }
    })
    const interval = setInterval(() => setTick(v => v + 1), 60_000)
    return () => { mounted = false; unsubscribe(); clearInterval(interval) }
  }, [])

  const sections = useCallback(() => {
    const groups = new Map<string, Notification[]>()
    for (const item of items) {
      const key = formatSectionTitle(item.createdAt, t)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }))
  }, [items, t])()

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
    const ok = await confirm(t('notifications.clearConfirm'), t('notifications.clear'))
    if (!ok) return
    await clearNotifications()
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  const unread = items.filter(it => !it.read).length
  const total = items.length

  const renderItem = ({ item }: { item: Notification }) => {
    const meta = KIND_META[item.kind] ?? { icon: 'I', color: '#64748B', bg: '#F1F5F9', labelKey: 'notifications.kind_info' }
    const fadeAnim = fadeAnims.get(item.id) ?? new Animated.Value(1)

    const renderRightActions = () => (
      <View style={s.swipeActions}>
        <TouchableOpacity
          style={[s.swipeBtn, { backgroundColor: '#10B981' }]}
          onPress={() => { item.read ? undefined : markRead(item.id) }}
        >
          <Text style={s.swipeBtnText}>Lu</Text>
          <Text style={s.swipeBtnText}>{t('notifications.markRead')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.swipeBtn, { backgroundColor: '#EF4444' }]}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={s.swipeBtnText}>Suppr</Text>
          <Text style={s.swipeBtnText}>{t('notifications.delete')}</Text>
        </TouchableOpacity>
      </View>
    )

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Swipeable renderRightActions={renderRightActions} friction={2} overshootRight={false}>
          <TouchableOpacity
            onPress={() => handleOpen(item)}
            style={[s.card, !item.read && s.cardUnread, SHADOW]}
            activeOpacity={0.85}
          >
            <View style={[s.unreadIndicator, { opacity: item.read ? 0 : 1 }]} />
            <View style={[s.iconCircle, { backgroundColor: meta.bg }]}>
              <Text style={s.icon}>{meta.icon}</Text>
            </View>
            <View style={s.cardContent}>
              <View style={s.cardTop}>
                <View style={[s.tag, { backgroundColor: meta.bg }]}>
                  <Text style={[s.tagText, { color: meta.color }]}>{t(meta.labelKey)}</Text>
                </View>
                <Text style={s.time}>{formatRelative(item.createdAt, t)}</Text>
              </View>
              <Text style={[s.cardTitle, !item.read && s.cardTitleUnread]}>{item.title}</Text>
              <Text style={s.cardBody}>{item.body}</Text>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerTitleBlock}>
          <Text style={s.title}>{t('notifications.title')}</Text>
          <Text style={s.subtitle}>
            {unread > 0
              ? t('notifications.unreadCount', { count: unread })
              : t('notifications.allCaughtUp')}
          </Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={runDiagnostics} disabled={diagRunning} style={[s.headerBtn, s.headerBtnDebug]}>
            {diagRunning ? <ActivityIndicator size="small" color="#0F172A" /> : <Text style={s.headerBtnIcon}>Diag</Text>}
          </TouchableOpacity>
          {unread > 0 && (
            <TouchableOpacity onPress={handleMarkAll} style={s.headerBtn}>
              <Text style={s.headerBtnIcon}>Lu</Text>
            </TouchableOpacity>
          )}
          {total > 0 && (
            <TouchableOpacity onPress={handleClear} style={[s.headerBtn, s.headerBtnDanger]}>
              <Text style={s.headerBtnIconDanger}>Suppr</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {total === 0 ? (
        <View style={s.emptyWrap}>
          <EmptyState icon="" title={t('notifications.empty')} subtitle={t('notifications.emptySubtitle')} />
        </View>
      ) : (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <View style={s.sectionLine} />
            </View>
          )}
          contentContainerStyle={s.body}
          stickySectionHeadersEnabled={false}
        />
      )}

      <TabBar active="notifications" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  headerTitleBlock: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnDanger: { backgroundColor: '#FEF2F2' },
  headerBtnDebug: { backgroundColor: '#E0F2FE' },
  headerBtnIcon: { fontSize: 18 },
  headerBtnIconDanger: { fontSize: 18, color: '#B91C1C' },
  body: { padding: 16, paddingBottom: 100 },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginRight: 10,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  cardUnread: {
    backgroundColor: '#F8FAFF',
    borderColor: '#BFDBFE',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginLeft: 8,
  },
  icon: { fontSize: 22 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  time: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 3, lineHeight: 20 },
  cardTitleUnread: { fontWeight: '800', color: '#0F172A' },
  cardBody: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  swipeActions: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 8 },
  swipeBtn: {
    width: 72,
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  swipeBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
})

export default withScreenBoundary(NotificationsScreen, 'Notifications')
