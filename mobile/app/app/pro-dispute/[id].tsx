import { createThemedStyles } from '../../src/theme'
import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPatch, apiUpload, authHeaders } from '../../src/api'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { pickMedia, resolveMediaUrl } from '../../src/media'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { Send, Paperclip, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react-native'
import { BackIcon } from '../../src/components/BackButton'
import { radius, spacing, typography, shadows } from '../../src/design'

const decisionLabels: Record<string, string> = {
  release_escrow: 'proDisputeScreen.decisions.release_escrow',
  refund: 'proDisputeScreen.decisions.refund',
  partial_refund: 'proDisputeScreen.decisions.partial_refund',
  reject: 'proDisputeScreen.decisions.reject',
  cancel: 'proDisputeScreen.decisions.cancel',
  other: 'proDisputeScreen.decisions.other',
}

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function DisputeDetail() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!requestId) return
    setLoading(true)
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setItem(r.item)
    } catch (e: any) {
      toast.error(t('proDisputeScreen.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  const sendMessage = async () => {
    if (!requestId || !message.trim()) return
    setSubmitting(true)
    try {
      await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-message', text: message })
      setMessage('')
      await load()
    } catch (e: any) {
      toast.error(t('proDisputeScreen.error'), humanErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const addEvidence = async () => {
    if (!requestId) return
    try {
      const picked = await pickMedia({ maxFiles: 1 })
      if (!picked.length) return
      const media = picked[0]
      setUploading(true)
      const uploadRes: any = await apiUpload(media.uri, media.name, media.type === 'video' ? 'video/mp4' : 'image/jpeg', 'disputes')
      const url = uploadRes?.url || uploadRes?.staticUrl
      if (!url) throw new Error(t('proDisputeScreen.missingUrl'))
      await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-evidence', type: media.type, url })
      await load()
    } catch (e: any) {
      toast.error(t('proDisputeScreen.error'), humanErrorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  if (loading && !item) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color={colors.primaryText} /></SafeAreaView>
  if (!requestId) return <SafeAreaView style={s.safe}><Text style={s.err}>{t('proDisputeScreen.invalidId')}</Text></SafeAreaView>

  const resolved = item?.disputeStatus === 'resolved' || item?.disputeStatus === 'closed'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <BackIcon size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('proDisputeScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.statusCard, { borderLeftColor: resolved ? colors.success : colors.danger }]}>
          <Text style={s.statusTitle}>{resolved ? t('proDisputeScreen.resolved') : t('proDisputeScreen.inProgress')}</Text>
          <Text style={s.statusText}>{t('proDisputeScreen.statusLine', { status: item?.disputeStatus || 'open' })}</Text>
          {item?.disputeReason && <Text style={s.statusText}>{t('proDisputeScreen.reasonLine', { reason: item.disputeReason })}</Text>}
          {item?.disputeDecision && (
            <Text style={s.statusText}>{t('proDisputeScreen.decisionLine', { decision: decisionLabels[item.disputeDecision] ? t(decisionLabels[item.disputeDecision]) : item.disputeDecision })}</Text>
          )}
          {item?.disputeRefundAmount > 0 && <Text style={s.statusText}>{t('proDisputeScreen.refundedLine', { amount: item.disputeRefundAmount.toLocaleString('fr-FR') })}</Text>}
          {item?.disputeAdminNote && <Text style={s.statusText}>{t('proDisputeScreen.noteLine', { note: item.disputeAdminNote })}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('proDisputeScreen.evidence', { n: (item?.disputeEvidence || []).length })}</Text>
          {(item?.disputeEvidence || []).length === 0 && <Text style={s.empty}>{t('proDisputeScreen.noEvidence')}</Text>}
          <View style={s.evidenceGrid}>
            {(item?.disputeEvidence || []).map((e: any) => (
              <View key={e._id} style={s.evidenceItem}>
                {e.type === 'image' ? (
                  <Image source={{ uri: resolveMediaUrl(e.url), headers: authHeaders() }} style={s.evidenceThumb} />
                ) : (
                  <View style={s.evidenceThumb}><ImageIcon size={24} color={colors.textSecondary} /></View>
                )}
                <Text style={s.evidenceLabel}>{e.type}</Text>
              </View>
            ))}
          </View>
          {!resolved && (
            <TouchableOpacity style={s.actionBtn} onPress={addEvidence} disabled={uploading} activeOpacity={0.8}>
              <Paperclip size={18} color={colors.primaryText} />
              <Text style={s.actionBtnText}>{uploading ? t('proDisputeScreen.sending') : t('proDisputeScreen.addEvidence')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('proDisputeScreen.messages')}</Text>
          {(item?.disputeMessages || []).length === 0 && <Text style={s.empty}>{t('proDisputeScreen.noMessages')}</Text>}
          {(item?.disputeMessages || []).map((m: any) => (
            <View key={m._id} style={[s.messageBubble, m.senderRole === 'provider' ? s.myBubble : s.theirBubble]}>
              <Text style={s.messageText}>{m.text}</Text>
              <Text style={s.messageMeta}>{m.senderRole === 'provider' ? t('proDisputeScreen.you') : t('proDisputeScreen.client')} · {new Date(m.createdAt).toLocaleString('fr-FR')}</Text>
            </View>
          ))}
          {!resolved && (
            <View style={s.inputRow}>
              <TextInput value={message} onChangeText={setMessage} placeholder={t('proDisputeScreen.messagePlaceholder')} style={s.input} multiline />
              <TouchableOpacity style={s.sendBtn} onPress={sendMessage} disabled={submitting || !message.trim()} activeOpacity={0.8}>
                <Send size={18} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item?.disputeAudit?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('proDisputeScreen.history')}</Text>
            {item.disputeAudit.map((log: any) => (
              <View key={log._id} style={s.auditRow}>
                <Text style={s.auditAction}>{log.action}</Text>
                <Text style={s.auditDate}>{new Date(log.createdAt).toLocaleString('fr-FR')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(DisputeDetail, 'DisputeDetail')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
    err: { color: colors.danger, textAlign: 'center', marginTop: 40 },
    body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
    statusCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: colors.danger, ...shadows.sm },
    statusTitle: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: spacing.sm },
    statusText: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginBottom: spacing.xs },
    section: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
    sectionTitle: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
    empty: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
    evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    evidenceItem: { width: 80, alignItems: 'center' },
    evidenceThumb: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
    evidenceLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, marginTop: spacing.md },
    actionBtnText: { color: colors.primaryText, fontWeight: typography.weight.extrabold as any, fontSize: typography.sm.fontSize },
    messageBubble: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
    myBubble: { backgroundColor: colors.primaryLight, alignSelf: 'flex-end' },
    theirBubble: { backgroundColor: colors.bg, alignSelf: 'flex-start' },
    messageText: { fontSize: typography.base.fontSize, color: colors.text },
    messageMeta: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
    inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-end' },
    input: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, fontSize: typography.base.fontSize, color: colors.text, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    auditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    auditAction: { fontSize: typography.sm.fontSize, color: colors.text },
    auditDate: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  })
  return { colors, s }
})
