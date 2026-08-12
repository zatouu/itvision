import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Dimensions } from 'react-native'
import { X, Send } from 'lucide-react-native'
import { colors, spacing, radius, shadows, typography } from '../../design'
import { hapticLight, hapticSuccess, hapticError } from '../../haptics'
import VoiceRecorder, { VoiceRecording } from '../VoiceRecorder'
import { apiPost, apiUpload } from '../../api'
import { toast } from '../../toast'
import { useTranslation } from 'react-i18next'

type Props = {
  visible: boolean
  onClose: () => void
  offerId: string
  offerPrice: number
  providerName?: string
  onSent?: () => void
}

const { height: SCREEN_H } = Dimensions.get('window')

export default function NegotiateSheet({ visible, onClose, offerId, offerPrice, providerName, onSent }: Props) {
  const { t } = useTranslation()
  const [counterPrice, setCounterPrice] = useState('')
  const [sending, setSending] = useState(false)
  const [voiceNote, setVoiceNote] = useState<VoiceRecording | null>(null)

  const handleSend = async () => {
    const price = Number(counterPrice)
    if (!price || price <= 0) {
      hapticError()
      toast.error(t('common.error'), t('clientOffers.counterPriceRequired', { defaultValue: 'Entrez un prix' }))
      return
    }
    setSending(true)
    hapticLight()
    try {
      let audioUrl: string | undefined
      if (voiceNote) {
        const uploadRes = await apiUpload(voiceNote.uri, `counter-${offerId}.m4a`, 'audio/mp4', 'offers')
        audioUrl = uploadRes?.url
      }
      await apiPost(`/api/services/offers/${offerId}/counter`, {
        price,
        audioUrl,
      })
      hapticSuccess()
      toast.success(
        t('clientOffers.counterSent', { defaultValue: 'Contre-offre envoyée' }),
        t('clientOffers.counterSentMsg', { defaultValue: 'Le prestataire va répondre.' })
      )
      setCounterPrice('')
      setVoiceNote(null)
      onSent?.()
      onClose()
    } catch (e: any) {
      hapticError()
      toast.error(t('common.error'), e?.message || t('clientOffers.counterError', { defaultValue: 'Erreur' }))
    }
    setSending(false)
  }

  const handleClose = () => {
    setCounterPrice('')
    setVoiceNote(null)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={handleClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>{t('clientOffers.negotiateTitle', { defaultValue: 'Négocier' })}</Text>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn} activeOpacity={0.7}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {providerName && (
          <Text style={s.subtitle}>
            {t('clientOffers.negotiateWith', { defaultValue: 'Avec' })} <Text style={s.providerBold}>{providerName}</Text>
          </Text>
        )}

        <Text style={s.label}>{t('clientOffers.yourPrice', { defaultValue: 'Votre prix (FCFA)' })}</Text>
        <TextInput
          style={s.priceInput}
          value={counterPrice}
          onChangeText={txt => setCounterPrice(txt.replace(/\D/g, '').slice(0, 8))}
          placeholder={String(offerPrice)}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />
        {counterPrice && Number(counterPrice) < offerPrice && (
          <Text style={s.savingsHint}>
            {t('clientOffers.savings', { defaultValue: 'Économie' })}: {(offerPrice - Number(counterPrice)).toLocaleString('fr-FR')} FCFA
          </Text>
        )}

        <Text style={s.label}>{t('clientOffers.voiceMessage', { defaultValue: 'Message vocal (optionnel)' })}</Text>
        <VoiceRecorder onRecorded={(rec) => setVoiceNote(rec)} maxDurationSec={60} />
        {voiceNote && (
          <Text style={s.voiceRecorded}>
            ✅ {t('clientOffers.voiceRecorded', { defaultValue: 'Vocal enregistré' })} ({Math.round(voiceNote.durationMs / 1000)}s)
          </Text>
        )}

        <TouchableOpacity
          style={[s.sendBtn, sending && { opacity: 0.6 }]}
          onPress={handleSend}
          disabled={sending}
          activeOpacity={0.85}
        >
          <Send size={18} color={colors.surface} />
          <Text style={s.sendBtnText}>
            {sending
              ? t('common.sending', { defaultValue: 'Envoi…' })
              : t('clientOffers.sendCounter', { defaultValue: 'Envoyer la contre-offre' })}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    maxHeight: SCREEN_H * 0.75,
    ...shadows.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  providerBold: {
    fontWeight: typography.weight.bold as any,
    color: colors.text,
  },
  label: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.semibold as any,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  priceInput: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    fontSize: 28,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.surface,
    letterSpacing: 2,
  },
  savingsHint: {
    fontSize: 12,
    color: colors.success,
    fontWeight: typography.weight.semibold as any,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  voiceRecorded: {
    fontSize: 13,
    color: colors.success,
    fontWeight: typography.weight.semibold as any,
    marginTop: spacing.xs,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xl,
    ...shadows.md,
  },
  sendBtnText: {
    color: colors.surface,
    fontSize: typography.base.fontSize,
    fontWeight: typography.weight.extrabold as any,
  },
})
