import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Image } from 'expo-image'
import { MessageCircle, ShieldCheck, ChevronRight, Menu } from 'lucide-react-native'
import { apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import TabBar from '../src/components/TabBar'
import SideMenu from '../src/components/SideMenu'
import EmptyState from '../src/components/EmptyState'
import Skeleton from '../src/components/Skeleton'
import { loadInbox, subscribeInbox, getInboxState, markConversationRead, bindInboxSocket, Conversation } from '../src/chat-inbox'
import { getCategoryIcon } from '../src/categoryIcons'
import { colors, spacing, radius, typography, fonts, getCategoryMeta } from '../src/design'
import { resolveMediaUrl } from '../src/media'
import { getMode } from '../src/mode'

function timeAgo(iso: string, t: TFunction): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return t('messages.now')
  if (min < 60) return t('messages.minAgo', { n: min })
  const h = Math.floor(min / 60)
  if (h < 24) return t('messages.hAgo', { n: h })
  const d = Math.floor(h / 24)
  if (d === 1) return t('common.yesterday')
  if (d < 7) return t('messages.dAgo', { n: d })
  return new Date(iso).toLocaleDateString()
}

function Messages() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [items, setItems] = useState<Conversation[]>(getInboxState().items)
  const [loading, setLoading] = useState(!getInboxState().loaded)
  const [refreshing, setRefreshing] = useState(false)
  const isProvider = getMode() === 'provider'

  useEffect(() => {
    bindInboxSocket()
    const unsub = subscribeInbox(() => {
      const st = getInboxState()
      setItems(st.items)
      setLoading(!st.loaded && st.items.length === 0)
    })
    loadInbox().finally(() => setLoading(false))
    return unsub
  }, [])

  useFocusEffect(useCallback(() => { loadInbox() }, []))

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadInbox(true)
    setRefreshing(false)
  }, [])

  const openConversation = (conv: Conversation) => {
    markConversationRead(conv.requestId)
    apiPost('/api/services/chat/read', { requestId: conv.requestId }).catch(() => {})
    const other = conv.otherParty
    router.push({
      pathname: '/mission-chat',
      params: isProvider
        ? { id: conv.requestId, clientName: other.name }
        : { id: conv.requestId, providerName: other.name },
    } as any)
  }

  const renderItem = ({ item }: { item: Conversation }) => {
    const cat = getCategoryMeta(item.category)
    const CatIcon = getCategoryIcon(item.category)
    const other = item.otherParty
    const initials = (other.name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    const unread = item.unreadCount > 0
    return (
      <TouchableOpacity style={s.row} activeOpacity={0.72} onPress={() => openConversation(item)}>
        <View style={s.avatarWrap}>
          {other.avatarUrl ? (
            <Image source={{ uri: resolveMediaUrl(other.avatarUrl) }} style={s.avatarImg} contentFit="cover" transition={150} />
          ) : (
            <View style={[s.avatarImg, s.avatarFallback]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          {other.verified && (
            <View style={s.verifiedDot}>
              <ShieldCheck size={9} color="#fff" strokeWidth={3} />
            </View>
          )}
        </View>

        <View style={s.rowBody}>
          <View style={s.rowTop}>
            <Text style={[s.name, unread && s.nameUnread]} numberOfLines={1}>{other.name}</Text>
            {item.lastMessage && <Text style={s.time}>{timeAgo(item.lastMessage.createdAt, t)}</Text>}
          </View>
          <View style={s.rowMeta}>
            <View style={[s.catChip, { backgroundColor: cat.bg }]}>
              <CatIcon size={10} color={cat.color} />
              <Text style={[s.catChipText, { color: cat.ink }]} numberOfLines={1}>{cat.label}</Text>
            </View>
          </View>
          <Text style={[s.preview, unread && s.previewUnread]} numberOfLines={1}>
            {item.lastMessage
              ? `${item.lastMessage.mine ? 'Vous : ' : ''}${item.lastMessage.text}`
              : item.description || '—'}
          </Text>
        </View>

        <View style={s.rowRight}>
          {unread ? (
            <View style={s.unreadBadge}>
              <Text style={s.unreadText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
            </View>
          ) : (
            <ChevronRight size={16} color={colors.textFaint} />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.6} accessibilityLabel="Menu">
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('messages.title', { defaultValue: 'Messages' })}</Text>
        <View style={s.headerBtn} />
      </View>

      {loading && items.length === 0 ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={76} radius={radius.lg} />
          <Skeleton height={76} radius={radius.lg} />
          <Skeleton height={76} radius={radius.lg} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={it => it.requestId}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? s.emptyWrap : s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          ListEmptyComponent={
            <EmptyState
              icon={<MessageCircle size={40} color={colors.textFaint} />}
              title={t('messages.empty', { defaultValue: 'Aucune conversation' })}
              subtitle={t('messages.emptyHint', { defaultValue: 'Vos échanges avec les prestataires apparaîtront ici dès qu\'une mission démarre.' })}
            />
          }
        />
      )}

      <TabBar active="messages" mode={isProvider ? 'provider' : 'client'} />
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typography.xl.fontSize, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.3 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  sep: { height: spacing.sm },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bgDeep },
  avatarFallback: { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: typography.weight.extrabold as any },
  verifiedDot: {
    position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.surface,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.text, flex: 1 },
  nameUnread: { fontWeight: typography.weight.extrabold as any },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: typography.weight.medium as any },
  rowMeta: { flexDirection: 'row', alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, maxWidth: 180 },
  catChipText: { fontSize: 10.5, fontWeight: typography.weight.bold as any },
  preview: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  previewUnread: { color: colors.text, fontWeight: typography.weight.semibold as any },
  rowRight: { alignItems: 'center', justifyContent: 'center', minWidth: 24 },
  unreadBadge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(Messages, 'Messages')
