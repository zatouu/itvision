import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPost } from '../src/api'
import { connectSocket, joinMissionChat, leaveMissionChat } from '../src/socket'
import { getAuthUser } from '../src/auth'

type Message = {
  _id: string
  senderId: string
  senderRole: 'client' | 'provider'
  text: string
  createdAt: string
}

export default function MissionChat() {
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
    try {
      await apiPost('/api/services/chat', { requestId: id, text: trimmed })
    } catch (e: any) {
      setText(trimmed)
      console.warn('[Chat] Erreur envoi:', e.message)
    } finally {
      setSending(false)
    }
  }

  const openWhatsApp = () => {
    if (!providerPhone) return
    const phone = providerPhone.replace(/[^0-9+]/g, '')
    const url = `https://wa.me/${phone.replace('+', '')}`
    Linking.openURL(url).catch(() => {})
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === myId || item.senderRole === 'client'
    return (
      <View style={[st.bubble, isMe ? st.bubbleMe : st.bubbleThem]}>
        <Text style={[st.bubbleText, isMe ? st.bubbleTextMe : st.bubbleTextThem]}>{item.text}</Text>
        <Text style={[st.time, isMe ? st.timeMe : st.timeThem]}>{formatTime(item.createdAt)}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={st.safe}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Text style={st.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={st.headerTitle}>{providerName || 'Prestataire'}</Text>
          <Text style={st.headerSub}>Chat mission</Text>
        </View>
        {providerPhone && (
          <TouchableOpacity onPress={openWhatsApp} style={st.waBtn}>
            <Text style={st.waText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {loading ? (
          <View style={st.center}><ActivityIndicator size="large" color="#2563EB" /></View>
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
                <Text style={st.emptyText}>Aucun message. Commencez la conversation !</Text>
              </View>
            }
          />
        )}

        {/* Input */}
        <View style={st.inputRow}>
          <TextInput
            style={st.input}
            placeholder="Votre message..."
            placeholderTextColor="#94A3B8"
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
            <Text style={st.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 16, color: '#0F172A' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSub: { fontSize: 12, color: '#64748B' },
  waBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#DCFCE7', borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0' },
  waText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 8, gap: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 2 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: '#0F172A', borderBottomRightRadius: 4 },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTextThem: { color: '#1E293B' },
  time: { fontSize: 10, marginTop: 4 },
  timeMe: { color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  timeThem: { color: '#94A3B8' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0F172A', maxHeight: 100, backgroundColor: '#F8FAFC' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { fontSize: 18, color: '#fff' },
})
