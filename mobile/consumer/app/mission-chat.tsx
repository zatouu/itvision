import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native'
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
  const url = `tel:${p}`
  Linking.canOpenURL(url).then(supported => {
    if (supported) return Linking.openURL(url)
    return Linking.openURL(url)
  }).catch(() => {
    toast.error('Appel impossible', `Impossible d'appeler ${p}`)
  })
}

function openWhatsApp(phone?: string) {
  if (!phone) return
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return
  const url = `https://wa.me/${digits}`
  Linking.canOpenURL(url).then(supported => {
    if (supported) return Linking.openURL(url)
    return Linking.openURL(url)
  }).catch(() => {})
}

function isSameDay(a: string, b: string) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function formatDay(dateStr: string, t: (k: string) => string) {
  const now = new Date()
  if (isSameDay(dateStr, now.toISOString())) return t('chat.today') || "Aujourd'hui"
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  if (isSameDay(dateStr, y.toISOString())) return t('chat.yesterday') || 'Hier'
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

  const sendMessage = async () => {
    const trimmed = text.trim()
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

  const otherName = providerName || t('chat.defaultProvider') || 'Prestataire'
  const hasPhone = !!providerPhone

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={st.avatar}>
          <Text style={st.avatarText}>{getInitials(otherName)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>{otherName}</Text>
          <Text style={st.headerSub}>{hasPhone ? providerPhone : t('chat.title')}</Text>
        </View>
        {hasPhone && (
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerAction} onPress={() => callPhone(providerPhone)}>
              <Phone size={20} color={colors.success} />
            </TouchableOpacity>
            <TouchableOpacity style={st.headerAction} onPress={() => openWhatsApp(providerPhone)}>
              <MessageCircle size={20} color={colors.success} />
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

        <View style={st.inputRow}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  headerTitle: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  headerSub: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerAction: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { fontSize: typography.base.fontSize, color: colors.textMuted, marginTop: spacing.md },
  dateRow: { alignItems: 'center', marginVertical: spacing.sm },
  dateChip: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.semibold as any, color: colors.textMuted, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  bubble: { maxWidth: '78%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.xs, ...shadows.sm },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: colors.navy, borderBottomRightRadius: radius.sm },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  bubblePending: { opacity: 0.6 },
  bubbleText: { fontSize: typography.base.fontSize, lineHeight: typography.base.lineHeight },
  bubbleTextMe: { color: colors.surface },
  bubbleTextThem: { color: colors.text },
  time: { fontSize: typography.xs.fontSize, marginTop: spacing.xs },
  timeMe: { color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  timeThem: { color: colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, fontSize: typography.base.fontSize, color: colors.text, maxHeight: 100, backgroundColor: colors.bg },
  sendBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
})

export default withScreenBoundary(MissionChat, 'MissionChat')
