import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Image, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPatch, apiUpload } from '../../src/api'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { pickMedia, resolveMediaUrl } from '../../src/media'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'
import { ArrowLeft, Send, Paperclip, Image as ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../../src/design'

const decisionLabels: Record<string, string> = {
  release_escrow: 'Paiement libéré au prestataire',
  refund: 'Remboursement intégral',
  partial_refund: 'Remboursement partiel',
  reject: 'Litige rejeté',
  cancel: 'Litige annulé',
  other: 'Autre',
}

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function DisputeDetail() {
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
      toast.error('Erreur', humanErrorMessage(e))
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
      toast.error('Erreur', humanErrorMessage(e))
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
      if (!url) throw new Error('URL manquante')
      await apiPatch(`/api/services/requests/${requestId}`, { action: 'dispute-evidence', type: media.type, url })
      await load()
    } catch (e: any) {
      toast.error('Erreur', humanErrorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  if (loading && !item) return <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} /></SafeAreaView>
  if (!requestId) return <SafeAreaView style={s.safe}><Text style={s.err}>ID invalide</Text></SafeAreaView>

  const resolved = item?.disputeStatus === 'resolved' || item?.disputeStatus === 'closed'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Litige</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body}>
        <View style={[s.statusCard, { borderLeftColor: resolved ? colors.success : colors.danger }]}>
          <Text style={s.statusTitle}>{resolved ? 'Litige résolu' : 'Litige en cours'}</Text>
          <Text style={s.statusText}>Statut : {item?.disputeStatus || 'open'}</Text>
          {item?.disputeReason && <Text style={s.statusText}>Motif : {item.disputeReason}</Text>}
          {item?.disputeDecision && (
            <Text style={s.statusText}>Décision : {decisionLabels[item.disputeDecision] || item.disputeDecision}</Text>
          )}
          {item?.disputeRefundAmount > 0 && <Text style={s.statusText}>Remboursé : {item.disputeRefundAmount.toLocaleString('fr-FR')} FCFA</Text>}
          {item?.disputeAdminNote && <Text style={s.statusText}>Note : {item.disputeAdminNote}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Preuves ({(item?.disputeEvidence || []).length})</Text>
          {(item?.disputeEvidence || []).length === 0 && <Text style={s.empty}>{t('dispute.noEvidence', { defaultValue: 'Aucune preuve.' })}</Text>}
          <View style={s.evidenceGrid}>
            {(item?.disputeEvidence || []).map((e: any) => (
              <View key={e._id} style={s.evidenceItem}>
                {e.type === 'image' ? (
                  <Image source={{ uri: resolveMediaUrl(e.url) }} style={s.evidenceThumb} />
                ) : (
                  <View style={s.evidenceThumb}><ImageIcon size={24} color={colors.textSecondary} /></View>
                )}
                <Text style={s.evidenceLabel}>{e.type}</Text>
              </View>
            ))}
          </View>
          {!resolved && (
            <TouchableOpacity style={s.actionBtn} onPress={addEvidence} disabled={uploading} activeOpacity={0.8}>
              <Paperclip size={18} color={colors.primary} />
              <Text style={s.actionBtnText}>{uploading ? 'Envoi...' : 'Ajouter une preuve'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Messages</Text>
          {(item?.disputeMessages || []).length === 0 && <Text style={s.empty}>{t('dispute.noMessages', { defaultValue: 'Aucun message.' })}</Text>}
          {(item?.disputeMessages || []).map((m: any) => (
            <View key={m._id} style={[s.messageBubble, m.senderRole === 'provider' ? s.myBubble : s.theirBubble]}>
              <Text style={s.messageText}>{m.text}</Text>
              <Text style={s.messageMeta}>{m.senderRole === 'provider' ? 'Vous' : 'Client'} · {new Date(m.createdAt).toLocaleString('fr-FR')}</Text>
            </View>
          ))}
          {!resolved && (
            <View style={s.inputRow}>
              <TextInput value={message} onChangeText={setMessage} placeholder="Votre message..." style={s.input} multiline />
              <TouchableOpacity style={s.sendBtn} onPress={sendMessage} disabled={submitting || !message.trim()} activeOpacity={0.8}>
                <Send size={18} color={colors.surface} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item?.disputeAudit?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Historique</Text>
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
  actionBtnText: { color: colors.primary, fontWeight: typography.weight.extrabold as any, fontSize: typography.sm.fontSize },
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

export default withScreenBoundary(DisputeDetail, 'DisputeDetail')
