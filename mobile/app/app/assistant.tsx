import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Menu, Sparkles, Send, PlusCircle, MapPin, Lightbulb, HelpCircle, Coins } from 'lucide-react-native'
import { apiGetRetry, apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import SideMenu from '../src/components/SideMenu'
import EmptyState from '../src/components/EmptyState'
import { colors, spacing, radius, typography, fonts, shadows } from '../src/design'
import { hapticSelect } from '../src/haptics'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { getMode } from '../src/mode'

type ChatMsg = { id: string; role: 'user' | 'assistant'; content: string }

type AiStatus = { available: boolean; features?: Record<string, { enabled: boolean }> }

let msgSeq = 0
const nextId = () => `m${++msgSeq}`

function Assistant() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList<ChatMsg>>(null)
  const isProvider = getMode() === 'provider'

  useEffect(() => {
    apiGetRetry('/api/ai/assist')
      .then((d: any) => setStatus({ available: !!d?.available, features: d?.features }))
      .catch(() => setStatus({ available: false }))
      .finally(() => setStatusLoading(false))
  }, [])

  const scrollToEnd = () => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60)

  const send = useCallback(async (raw?: string, type: 'general_chat' | 'daily_tips' = 'general_chat') => {
    const question = (raw ?? input).trim()
    if (!question || sending) return
    hapticSelect()
    const userMsg: ChatMsg = { id: nextId(), role: 'user', content: question }
    const history = [...messages, userMsg].slice(-8).map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setSending(true)
    scrollToEnd()
    try {
      const res: any = await apiPost('/api/ai/assist', { type, question, history })
      const text = (res?.text || '').trim() || t('assistant.noAnswer', { defaultValue: "Je n'ai pas de réponse — reformule ta question." })
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: text }])
      scrollToEnd()
    } catch (e: any) {
      const msg = humanErrorMessage(e)
      toast.error(t('common.error'), msg)
      setMessages(prev => [...prev, { id: nextId(), role: 'assistant', content: `⚠️ ${msg}` }])
    } finally {
      setSending(false)
    }
  }, [input, sending, messages, t])

  const suggestions: { icon: any; label: string; type?: 'general_chat' | 'daily_tips'; prompt: string }[] = isProvider
    ? [
        { icon: Lightbulb, label: t('assistant.sugTips', { defaultValue: 'Mes conseils du jour' }), type: 'daily_tips', prompt: t('assistant.sugTipsPrompt', { defaultValue: 'Donne-moi mes conseils du jour' }) },
        { icon: Coins, label: t('assistant.sugOffer', { defaultValue: 'Comment bien chiffrer une offre ?' }), prompt: t('assistant.sugOfferPrompt', { defaultValue: 'Comment bien chiffrer une offre sur Xeuy ?' }) },
        { icon: HelpCircle, label: t('assistant.sugHow', { defaultValue: 'Comment marche une mission ?' }), prompt: t('assistant.sugHowPrompt', { defaultValue: 'Comment se déroule une mission sur Xeuy ?' }) },
      ]
    : [
        { icon: PlusCircle, label: t('assistant.sugRequest', { defaultValue: 'Comment décrire mon besoin ?' }), prompt: t('assistant.sugRequestPrompt', { defaultValue: 'Comment bien décrire ma demande pour recevoir de bonnes offres ?' }) },
        { icon: Coins, label: t('assistant.sugPrice', { defaultValue: 'Combien coûte un artisan ?' }), prompt: t('assistant.sugPricePrompt', { defaultValue: 'Quels sont les prix habituels pour un artisan à Dakar ?' }) },
        { icon: HelpCircle, label: t('assistant.sugHow', { defaultValue: 'Comment marche le paiement ?' }), prompt: t('assistant.sugHowPrompt', { defaultValue: 'Comment fonctionne le paiement sécurisé (escrow) sur Xeuy ?' }) },
      ]

  const renderMsg = ({ item }: { item: ChatMsg }) => {
    const mine = item.role === 'user'
    return (
      <View style={[s.bubbleRow, mine && s.bubbleRowMine]}>
        {!mine && (
          <View style={s.aiAvatar}>
            <Sparkles size={13} color="#fff" />
          </View>
        )}
        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleAi]}>
          <Text style={[s.bubbleText, mine && s.bubbleTextMine]} selectable>{item.content}</Text>
        </View>
      </View>
    )
  }

  const aiReady = !!status?.available

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.6} accessibilityLabel="Menu">
          <Menu size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} color={colors.primary} />
            <Text style={s.title}>{t('assistant.title', { defaultValue: 'Assistant Xeuy' })}</Text>
          </View>
          <Text style={s.subtitle}>{t('assistant.subtitle', { defaultValue: 'Conseils & aide, en français simple' })}</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        {!statusLoading && !aiReady ? (
          <EmptyState
            icon={<Sparkles size={30} color={colors.textMuted} />}
            title={t('assistant.unavailable', { defaultValue: 'Assistant indisponible' })}
            subtitle={t('assistant.unavailableHint', { defaultValue: "L'assistant IA est temporairement désactivé. Réessaie plus tard." })}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMsg}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={{ gap: spacing.md }}>
                {/* Carte d'accueil + suggestions */}
                <View style={s.heroCard}>
                  <Text style={s.heroTitle}>{t('assistant.heroTitle', { defaultValue: 'Pose-moi ta question' })}</Text>
                  <Text style={s.heroText}>
                    {isProvider
                      ? t('assistant.heroPro', { defaultValue: 'Tarifs, offres, missions, visibilité — je t\'explique en langage simple.' })
                      : t('assistant.heroClient', { defaultValue: 'Décrire un besoin, comprendre les offres, payer en sécurité — je t\'explique en langage simple.' })}
                  </Text>
                  <View style={s.sugWrap}>
                    {suggestions.map((sug, i) => {
                      const SugIcon = sug.icon
                      return (
                        <TouchableOpacity
                          key={i}
                          style={s.sugChip}
                          activeOpacity={0.75}
                          disabled={sending || !aiReady}
                          onPress={() => send(sug.prompt, sug.type || 'general_chat')}
                        >
                          <SugIcon size={13} color={colors.brandInk} />
                          <Text style={s.sugText}>{sug.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>

                {/* Actions rapides */}
                <View style={s.quickRow}>
                  <TouchableOpacity style={s.quickBtn} activeOpacity={0.75} onPress={() => router.push('/create-request')}>
                    <PlusCircle size={14} color={colors.primary} />
                    <Text style={s.quickText}>{t('assistant.quickRequest', { defaultValue: 'Nouvelle demande' })}</Text>
                  </TouchableOpacity>
                  {isProvider && (
                    <TouchableOpacity style={s.quickBtn} activeOpacity={0.75} onPress={() => router.push('/nearby-requests')}>
                      <MapPin size={14} color={colors.primary} />
                      <Text style={s.quickText}>{t('assistant.quickNearby', { defaultValue: 'Demandes proches' })}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            }
            ListFooterComponent={
              sending ? (
                <View style={[s.bubbleRow]}>
                  <View style={s.aiAvatar}>
                    <Sparkles size={13} color="#fff" />
                  </View>
                  <View style={[s.bubble, s.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={s.bubbleText}>{t('assistant.thinking', { defaultValue: 'Je réfléchis…' })}</Text>
                  </View>
                </View>
              ) : null
            }
          />
        )}

        {/* Input */}
        {aiReady && (
          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              placeholder={t('assistant.placeholder', { defaultValue: 'Écris ta question…' })}
              placeholderTextColor={colors.textFaint}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
              disabled={!input.trim() || sending}
              onPress={() => send()}
              activeOpacity={0.8}
              accessibilityLabel={t('assistant.send', { defaultValue: 'Envoyer' })}
            >
              <Send size={17} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.text },
  subtitle: { fontSize: 10.5, color: colors.textMuted, fontWeight: typography.weight.semibold as any, marginTop: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  heroCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderSoft, ...shadows.sm,
  },
  heroTitle: { fontSize: 17, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  heroText: { fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginTop: 6 },
  sugWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md },
  sugChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.brandSoft, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  sugText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.brandInk },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  quickText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.primary },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  bubbleRowMine: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleAi: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderBottomLeftRadius: 4 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 13.5, lineHeight: 19, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 110,
    backgroundColor: colors.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  sendBtnDisabled: { opacity: 0.45 },
})

export default withScreenBoundary(Assistant, 'Assistant')
