import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { connectSocket, joinMissionChat, leaveMissionChat } from '../src/socket'
import { getAuthUser } from '../src/auth'
import { toast } from '../src/toast'
import { ArrowLeft, Send, Phone, MessageCircle } from 'lucide-react-native'
import { colors, spacing, radius, typography, shadows } from '../src/design'

type Message = {
  _id: string
  senderId: string
  senderRole: 'client' | 'provider'
  text: string
  createdAt: string
  pending?: boolean
}

function getInitials(name?: string) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function normalizePhone(raw?: string) {
  if (!raw) return ''
  return raw.replace(/[\s\-\(\)\.]/g, '')
}

function callPhone(phone?: string) {
  if (!phone) return
  const p = normalizePhone(phone)
  if (!p) return
  Linking.openURL(`tel:${p}`).catch(() => {
    toast.error('Appel impossible', `Impossible d'appeler ${p}`)
  })
}

function openWhatsApp(phone?: string) {
  if (!phone) return
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return
  Linking.openURL(`https://wa.me/${digits}`).catch(() => {})
}

function isSameDay(a: string, b: string) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function formatDay(dateStr: string, t: (k: string) => string) {
  const now = new Date()
  if (isSameDay(dateStr, now.toISOString())) return t('common.today') || "Aujourd'hui"
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (isSameDay(dateStr, y.toISOString())) return t('common.yesterday') || 'Hier'
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function MissionChat() {
  const { t } = useTranslation()
  const { id, providerName, providerPhone } = useLocalSearchParams<{ id: string; providerName?: string; providerPhone?: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)
  const currentUser = getAuthUser()
  const myId = currentUser?._id || ''

  const loadMessages = useCallback(async () => {
    if (!id) return
    try {
      const res = await apiGet(`/api/services/chat?requestId=${id}`)
      setMessages(res.messages || [])
    } catch (e) {
      console.warn('[Chat] Erreur chargement:', e)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadMessages() }, [loadMessages])

  // WebSocket temps réel
  useEffect(() => {
    if (!id) return
    const socket = connectSocket()
    joinMissionChat(id)

    const handleMessage = (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === msg._id)) return prev
        const optimisticIdx = prev.findIndex(m => m.pending && m.text === msg.text && m.senderRole === msg.senderRole)
        if (optimisticIdx >= 0) {
          const next = [...prev]
          next[optimisticIdx] = msg
          return next
        }
        return [...prev, msg]
      })
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    }

    socket.on('chat:message', handleMessage)
    return () => {
      leaveMissionChat(id)
      socket.off('chat:message', handleMessage)
    }
  }, [id])

  const sendText = async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || sending || !id) return
    setSending(true)
    setText('')
    const optimistic: Message = {
      _id: `local-${Date.now()}`,
      senderId: myId,
      senderRole: 'client',
      text: trimmed,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50)
    try {
      await apiPost('/api/services/chat', { requestId: id, text: trimmed })
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id))
      setText(trimmed)
      console.warn('[Chat] Erreur envoi:', e.message)
    } finally {
      setSending(false)
    }
  }

  const sendMessage = () => sendText(text)

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === myId || item.senderRole === 'client'
    const showDate = index === 0 || !isSameDay(item.createdAt, messages[index - 1].createdAt)
    return (
      <View>
        {showDate && (
          <View style={st.dateRow}>
            <Text style={st.dateChip}>{formatDay(item.createdAt, t)}</Text>
          </View>
        )}
        <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleThem, item.pending && st.bubblePending]}>
          <Text style={[st.bubbleText, isMe ? st.bubbleTextMe : st.bubbleTextThem]}>{item.text}</Text>
          <Text style={[st.time, isMe ? st.timeMe : st.timeThem]}>{item.pending ? '⏳' : formatTime(item.createdAt)}</Text>
        </View>
      </View>
    )
  }

  const otherName = providerName || t('mission.defaultProvider') || 'Prestataire'
  const hasPhone = !!providerPhone

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={18} color={colors.ink} />
        </TouchableOpacity>
        <View style={st.avatar}>
          <Text style={st.avatarText}>{getInitials(otherName)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={st.headerTitle} numberOfLines={1}>{otherName}</Text>
          <Text style={st.headerSub} numberOfLines={1}>{hasPhone ? providerPhone : t('chat.title')}</Text>
        </View>
        {hasPhone && (
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerAction} onPress={() => callPhone(providerPhone)} activeOpacity={0.7}>
              <Phone size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={st.headerAction} onPress={() => openWhatsApp(providerPhone)} activeOpacity={0.7}>
              <MessageCircle size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={st.center}><ActivityIndicator size="large" color={colors.navy} /></View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={st.list}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={st.empty}>
                <MessageCircle size={48} color={colors.textMuted} />
                <Text style={st.emptyText}>{t('chat.empty')}</Text>
              </View>
            }
          />
        )}

        {/* Réponses rapides */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.quickReplies}>
          {['chat.qr_ok', 'chat.qr_thanks', 'chat.qr_seeYou', 'chat.qr_callMe'].map(k => {
            const label = t(k)
            return (
              <TouchableOpacity key={k} style={st.quickReply} onPress={() => sendText(label)} activeOpacity={0.7}>
                <Text style={st.quickReplyText}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={st.inputRow}>
          <View style={st.inputWrap}>
            <TextInput
              style={st.input}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              maxLength={1000}
              multiline
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            style={[st.sendBtn, (!text.trim() || sending) && st.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() || sending}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  headerTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  headerSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAction: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14, paddingBottom: 8, gap: 8 },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { fontSize: typography.base.fontSize, color: colors.textMuted, marginTop: spacing.md },
  dateRow: { alignItems: 'center', marginVertical: spacing.sm },
  dateChip: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.textMuted, backgroundColor: colors.bgDeep, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2, ...shadows.xs },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4, shadowColor: '#0F7B4F', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubblePending: { opacity: 0.6 },
  bubbleText: { fontSize: 13.5, lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: colors.text },
  time: { fontSize: 9.5, marginTop: 4, fontWeight: '600' },
  timeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeThem: { color: colors.textDim },
  quickReplies: { gap: 6, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  quickReply: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickReplyText: { fontSize: 12, fontWeight: '600', color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  inputWrap: { flex: 1, minHeight: 42, backgroundColor: colors.bg, borderRadius: 999, justifyContent: 'center', paddingHorizontal: 14 },
  input: { fontSize: 13.5, color: colors.text, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
})

export default withScreenBoundary(MissionChat, 'MissionChat')
