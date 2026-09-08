import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import * as ImagePicker from 'expo-image-picker'
import { Check, Camera, Send, X, Info, Wrench } from 'lucide-react-native'
import AppHeader from '../src/components/AppHeader'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { colors, radius, shadows, spacing, typography, getCategoryMeta } from '../src/design'
import { apiGetRetry, apiPatch, apiUpload } from '../src/api'
import { resolveMediaUrl } from '../src/media'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSelect, hapticSuccess } from '../src/haptics'

const REASON_KEYS = ['notFinished', 'priceNotRespected', 'providerAbsent', 'damage', 'other'] as const
const MAX_PHOTOS = 3

type DisputeMessage = { _id: string; senderRole: string; text: string; createdAt: string }
type DisputeEvidence = { _id: string; url: string; type: string }

function DisputeScreen() {
  const { t } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const [request, setRequest] = useState<any>(null)
  const [messages, setMessages] = useState<DisputeMessage[]>([])
  const [evidence, setEvidence] = useState<DisputeEvidence[]>([])
  const [loading, setLoading] = useState(true)

  // Compose state
  const [reason, setReason] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([]) // URIs locales en attente d'upload
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!requestId) return
    if (!silent) setLoading(true)
    try {
      const d: any = await apiGetRetry(`/api/services/requests/${requestId}`)
      const item = d.item || d
      setRequest(item)
      setMessages(Array.isArray(item.disputeMessages) ? item.disputeMessages : [])
      setEvidence(Array.isArray(item.disputeEvidence) ? item.disputeEvidence : [])
    } catch (e: any) {
      if (!silent) toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [requestId, t])

  useEffect(() => { load() }, [load])

  const isResolved = !!request?.disputeDecision || ['resolved', 'closed'].includes(request?.disputeStatus)
  const isOpen = !isResolved && (request?.status === 'dispute' || ['open', 'under_review'].includes(request?.disputeStatus))
  const state: 'compose' | 'inprogress' | 'resolved' = isResolved ? 'resolved' : isOpen ? 'inprogress' : 'compose'

  const requestRef = `#${(requestId || '').slice(-6).toUpperCase()}`
  const cat = getCategoryMeta(request?.category)

  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 })
    if (res.canceled || !res.assets?.[0]) return
    setPhotos(p => [...p, res.assets[0].uri])
  }

  const submit = async () => {
    if (!requestId || !reason || sending) return
    setSending(true)
    try {
      const reasonLabel = t(`dispute.reason_${reason}`)
      const desc = description.trim()
      await apiPatch(`/api/services/requests/${requestId}`, {
        action: 'dispute',
        reason: desc ? `${reasonLabel} — ${desc}` : reasonLabel,
      })
      if (desc) {
        await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-message', text: desc }).catch(() => {})
      }
      for (const uri of photos) {
        try {
          const up = await apiUpload(uri, `dispute-${Date.now()}.jpg`, 'image/jpeg', 'disputes')
          if (up?.url) {
            await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-evidence', url: up.url, type: 'image' })
          }
        } catch { /* une preuve en échec ne bloque pas le litige */ }
      }
      hapticSuccess()
      toast.success(t('dispute.sent'), t('dispute.sentBody'))
      setPhotos([])
      await load(true)
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const sendReply = async () => {
    const text = reply.trim()
    if (!text || !requestId) return
    setReply('')
    try {
      await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-message', text })
      await load(true)
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    }
  }

  const fmtTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''

  const decisionLabel = (d?: string) =>
    t(`dispute.decision_${d || 'other'}`, { defaultValue: t('dispute.decision_other') })

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader
        title={state === 'resolved' ? t('dispute.titleResolved') : t('dispute.title')}
        subtitle={`Mission ${requestRef}`}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24 }}>

            {/* Bannière résolu */}
            {state === 'resolved' && (
              <View style={s.resolvedBanner}>
                <View style={s.resolvedIcon}><Check size={18} color="#fff" strokeWidth={3} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resolvedTitle}>{t('dispute.decisionTitle', { decision: decisionLabel(request?.disputeDecision) })}</Text>
                  {request?.disputeAdminNote ? <Text style={s.resolvedBody}>{request.disputeAdminNote}</Text> : null}
                </View>
              </View>
            )}

            {/* Récap mission compact */}
            <View style={s.recapCard}>
              <View style={[s.recapIcon, { backgroundColor: cat.color }]}>
                <Wrench size={17} color="#fff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.recapTitle} numberOfLines={1}>{request?.title || cat.label}</Text>
                <Text style={s.recapSub} numberOfLines={1}>{requestRef}{request?.createdAt ? ` · ${new Date(request.createdAt).toLocaleDateString('fr-FR')}` : ''}</Text>
              </View>
              <View style={[s.pill, state === 'resolved' ? s.pillSuccess : state === 'inprogress' ? s.pillWarn : s.pillDanger]}>
                <Text style={[s.pillText, state === 'resolved' ? { color: colors.successInk } : state === 'inprogress' ? { color: colors.warnInk } : { color: colors.dangerInk }]}>
                  {t(`dispute.pill_${state}`)}
                </Text>
              </View>
            </View>

            {/* Timeline suivi */}
            {state !== 'compose' && (
              <View style={s.card}>
                <Text style={s.cardLabel}>{t('dispute.tracking')}</Text>
                {[
                  { label: t('dispute.stepOpened'), when: request?.disputeOpenedAt ? `${new Date(request.disputeOpenedAt).toLocaleDateString('fr-FR')} ${fmtTime(request.disputeOpenedAt)}` : '', done: true },
                  { label: t('dispute.stepReview'), when: state === 'resolved' ? t('dispute.stepReviewed') : t('dispute.reviewEta'), done: state === 'resolved' || request?.disputeStatus === 'under_review' },
                  { label: t('dispute.stepResolved'), when: state === 'resolved' ? t('dispute.decisionShared') : t('dispute.pending'), done: state === 'resolved' },
                ].map((st, i) => (
                  <View key={i} style={s.tlRow}>
                    <View style={[s.tlDot, st.done && s.tlDotDone]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.tlLabel, st.done && { color: colors.ink }]}>{st.label}</Text>
                      {!!st.when && <Text style={s.tlWhen}>{st.when}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ─── Compose ─── */}
            {state === 'compose' && (
              <>
                <Text style={s.sectionLabel}>{t('dispute.reasonLabel')}</Text>
                <View style={s.chipsWrap}>
                  {REASON_KEYS.map(k => {
                    const active = reason === k
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[s.reasonChip, active && s.reasonChipActive]}
                        onPress={() => { hapticSelect(); setReason(k) }}
                        activeOpacity={0.8}
                      >
                        {active && <Check size={12} color={colors.dangerInk} strokeWidth={3} />}
                        <Text style={[s.reasonChipText, active && s.reasonChipTextActive]}>{t(`dispute.reason_${k}`)}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t('dispute.describe')}</Text>
                <TextInput
                  style={s.textarea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('dispute.describePlaceholder')}
                  placeholderTextColor={colors.textDim}
                  multiline
                  numberOfLines={4}
                />
                <Text style={s.hint}>{t('dispute.hint')}</Text>

                {/* Photos de preuve */}
                <View style={s.photoHeader}>
                  <Text style={s.photoTitle}>{t('dispute.photos')} <Text style={{ color: colors.textDim, fontWeight: '500' }}>({photos.length}/{MAX_PHOTOS})</Text></Text>
                  <Text style={s.photoOpt}>{t('dispute.optional')}</Text>
                </View>
                <View style={s.photoRow}>
                  {photos.map((uri, i) => (
                    <View key={i} style={s.photoThumbWrap}>
                      <Image source={{ uri }} style={s.photoThumb} />
                      <TouchableOpacity style={s.photoRemove} onPress={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                        <X size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {Array.from({ length: MAX_PHOTOS - photos.length }).map((_, i) => (
                    <TouchableOpacity key={`add-${i}`} style={s.photoAdd} onPress={pickPhoto} activeOpacity={0.75}>
                      <Camera size={20} color={colors.textDim} />
                      <Text style={s.photoAddText}>{t('dispute.addPhoto')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Résolutions possibles */}
                <View style={[s.card, { marginTop: 20 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={s.infoIcon}><Info size={15} color={colors.info} /></View>
                    <Text style={s.cardTitleInline}>{t('dispute.possibleOutcomes')}</Text>
                  </View>
                  {(['outcomeCancel', 'outcomeWarn', 'outcomeCredit'] as const).map((k, i) => (
                    <View key={i} style={s.bulletRow}>
                      <View style={s.bullet} />
                      <Text style={s.bulletText}>{t(`dispute.${k}`)}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ─── Thread support (en examen) ─── */}
            {state === 'inprogress' && (
              <>
                <Text style={[s.sectionLabel, { marginTop: 18 }]}>{t('dispute.threadTitle')}</Text>
                {messages.length === 0 && (
                  <Text style={s.threadEmpty}>{request?.disputeReason || t('dispute.threadEmpty')}</Text>
                )}
                {messages.map(m => {
                  const mine = m.senderRole === 'client'
                  return (
                    <View key={m._id} style={[s.msgRow, mine && { justifyContent: 'flex-end' }]}>
                      {!mine && <View style={s.msgAvatar}><Text style={s.msgAvatarText}>XB</Text></View>}
                      <View style={[s.msgBubble, mine ? s.msgMine : s.msgTheirs]}>
                        {!mine && <Text style={s.msgAuthor}>{t('dispute.supportName')}</Text>}
                        <Text style={[s.msgText, mine && { color: '#fff' }]}>{m.text}</Text>
                        <Text style={[s.msgTime, mine && { color: 'rgba(255,255,255,0.6)' }]}>{fmtTime(m.createdAt)}</Text>
                      </View>
                    </View>
                  )
                })}
                {evidence.length > 0 && (
                  <View style={[s.photoRow, { marginTop: 10 }]}>
                    {evidence.filter(e => e.type === 'image').map(e => (
                      <Image key={e._id} source={{ uri: resolveMediaUrl(e.url) }} style={s.photoThumb} />
                    ))}
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Composer (en examen) */}
          {state === 'inprogress' && (
            <View style={s.composer}>
              <TextInput
                style={s.composerInput}
                value={reply}
                onChangeText={setReply}
                placeholder={t('dispute.replyPlaceholder')}
                placeholderTextColor={colors.textDim}
              />
              <TouchableOpacity style={s.composerSend} onPress={sendReply} activeOpacity={0.8}>
                <Send size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Sticky action */}
          <View style={s.footer}>
            {state === 'compose' && (
              <TouchableOpacity
                style={[s.cta, s.ctaDark, (!reason || sending) && { opacity: 0.5 }]}
                disabled={!reason || sending}
                onPress={submit}
                activeOpacity={0.85}
              >
                {sending ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Send size={16} color="#fff" />
                    <Text style={s.ctaText}>{t('dispute.submit')}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {state === 'inprogress' && (
              <TouchableOpacity style={[s.cta, s.ctaGhost]} onPress={() => router.back()} activeOpacity={0.8}>
                <Text style={[s.ctaText, { color: colors.text }]}>{t('dispute.back')}</Text>
              </TouchableOpacity>
            )}
            {state === 'resolved' && (
              <TouchableOpacity style={[s.cta, s.ctaPrimary]} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={s.ctaText}>{t('dispute.close')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  resolvedBanner: { flexDirection: 'row', gap: 12, backgroundColor: colors.successSoft, borderRadius: 16, padding: 14, marginTop: 4, marginBottom: 14, alignItems: 'flex-start' },
  resolvedIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  resolvedTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.successInk },
  resolvedBody: { fontSize: 11.5, color: colors.successInk, opacity: 0.9, marginTop: 3, lineHeight: 17 },
  recapCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.borderSoft },
  recapIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recapTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  recapSub: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillSuccess: { backgroundColor: colors.successSoft },
  pillWarn: { backgroundColor: colors.warnSoft },
  pillDanger: { backgroundColor: colors.dangerSoft },
  pillText: { fontSize: 10, fontWeight: typography.weight.extrabold as any },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.borderSoft, marginTop: 12 },
  cardLabel: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  cardTitleInline: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  tlRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  tlDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border, marginTop: 4 },
  tlDotDone: { backgroundColor: colors.primary },
  tlLabel: { fontSize: 12.5, fontWeight: typography.weight.semibold as any, color: colors.textMuted },
  tlWhen: { fontSize: 10.5, color: colors.textDim, marginTop: 1 },
  sectionLabel: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 10, marginLeft: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  reasonChipActive: { backgroundColor: colors.dangerSoft, borderColor: colors.danger, borderWidth: 1.5 },
  reasonChipText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.text },
  reasonChipTextActive: { color: colors.dangerInk },
  textarea: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, minHeight: 110, textAlignVertical: 'top', fontSize: 13, color: colors.text },
  hint: { fontSize: 11, color: colors.textDim, marginTop: 6, marginLeft: 4 },
  photoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  photoTitle: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  photoOpt: { fontSize: 11, color: colors.textMuted },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoThumbWrap: { flex: 1, aspectRatio: 1 },
  photoThumb: { flex: 1, borderRadius: 14, backgroundColor: colors.bgDeep },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { flex: 1, aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoAddText: { fontSize: 10, fontWeight: '600', color: colors.textDim },
  infoIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.infoLight, alignItems: 'center', justifyContent: 'center' },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textDim, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 11.5, color: colors.textMuted, lineHeight: 17 },
  threadEmpty: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  msgRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.warning, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  msgBubble: { maxWidth: '80%', padding: 10, borderRadius: 16 },
  msgMine: { backgroundColor: colors.ink, borderBottomRightRadius: 4 },
  msgTheirs: { backgroundColor: colors.warnSoft, borderBottomLeftRadius: 4 },
  msgAuthor: { fontSize: 10, fontWeight: '800', color: colors.warnInk, letterSpacing: 0.3, marginBottom: 3 },
  msgText: { fontSize: 12.5, color: colors.warnInk, lineHeight: 18 },
  msgTime: { fontSize: 9.5, color: colors.warnInk, opacity: 0.7, marginTop: 4, textAlign: 'right', fontWeight: '600' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginBottom: 8, padding: 8, backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  composerInput: { flex: 1, fontSize: 13, color: colors.text, paddingHorizontal: 8, paddingVertical: 4 },
  composerSend: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.lg, paddingVertical: 14 },
  ctaDark: { backgroundColor: colors.ink },
  ctaPrimary: { backgroundColor: colors.primary, ...shadows.md },
  ctaGhost: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  ctaText: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: '#fff' },
})

export default withScreenBoundary(DisputeScreen, 'Dispute')
