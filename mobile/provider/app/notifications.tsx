import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import TabBar from '../src/components/TabBar'
import EmptyState from '../src/components/EmptyState'
import {
  Notification,
  clearNotifications,
  loadNotifications,
  markAllRead,
  markRead,
  subscribeNotifications,
} from '../src/notifications'
import { confirm } from '../src/confirm'

const KIND_META: Record<Notification['kind'], { tag: string; color: string; bg: string }> = {
  'request-new':     { tag: 'Demande',  color: '#1D4ED8', bg: '#EFF6FF' },
  'offer-accepted':  { tag: 'Offre',    color: '#065F46', bg: '#ECFDF5' },
  'offer-rejected':  { tag: 'Offre',    color: '#991B1B', bg: '#FEF2F2' },
  'mission-update':  { tag: 'Mission',  color: '#1E293B', bg: '#F1F5F9' },
}

function formatRelative(ts: number): string {
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (diffSec < 60) return `Il y a ${diffSec}s`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH} h`
  const d = new Date(ts)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([])
  const [, setTick] = useState(0)

  useEffect(() => {
    let mounted = true
    loadNotifications().then(initial => { if (mounted) setItems([...initial]) })
    const unsubscribe = subscribeNotifications(next => {
      if (mounted) setItems([...next])
    })
    const interval = setInterval(() => setTick(v => v + 1), 60_000)
    return () => { mounted = false; unsubscribe(); clearInterval(interval) }
  }, [])

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
    const ok = await confirm('Vider les notifications', 'Effacer toutes les notifications ?')
    if (!ok) return
    await clearNotifications()
  }

  const hasUnread = items.some(it => !it.read)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        <View style={s.headerActions}>
          {hasUnread && (
            <TouchableOpacity onPress={handleMarkAll} style={s.headerBtn}>
              <Text style={s.headerBtnText}>Tout lu</Text>
            </TouchableOpacity>
          )}
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={[s.headerBtn, s.headerBtnDanger]}>
              <Text style={[s.headerBtnText, s.headerBtnTextDanger]}>Vider</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Aucune notification"
            subtitle="Vos alertes (nouvelles demandes, offres acceptées, mises à jour mission) apparaîtront ici."
          />
        ) : (
          items.map(n => {
            const meta = KIND_META[n.kind] ?? { tag: 'Info', color: '#475569', bg: '#F1F5F9' }
            return (
              <TouchableOpacity
                key={n.id}
                onPress={() => handleOpen(n)}
                style={[s.card, !n.read && s.cardUnread]}
                activeOpacity={0.85}
              >
                <View style={s.cardTop}>
                  <View style={[s.tag, { backgroundColor: meta.bg }]}>
                    <Text style={[s.tagText, { color: meta.color }]}>{meta.tag}</Text>
                  </View>
                  <Text style={s.time}>{formatRelative(n.createdAt)}</Text>
                </View>
                <Text style={s.cardTitle}>{n.title}</Text>
                <Text style={s.cardBody}>{n.body}</Text>
                {!n.read && <View style={s.unreadDot} />}
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      <TabBar active="notifications" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F1F5F9' },
  headerBtnDanger: { backgroundColor: '#FEF2F2' },
  headerBtnText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  headerBtnTextDanger: { color: '#B91C1C' },
  body: { padding: 16, gap: 10, paddingBottom: 32 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', position: 'relative' },
  cardUnread: { borderColor: '#BFDBFE', backgroundColor: '#F0F9FF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  time: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#475569', lineHeight: 18 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
})
