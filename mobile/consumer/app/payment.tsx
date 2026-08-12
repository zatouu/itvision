import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert, ScrollView, Image } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGetRetry, apiPost, getBaseUrl } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { getAuthUser } from '../src/auth'
import { ArrowLeft, Check, Waves, Circle, Banknote, ShieldAlert, QrCode, Clock } from 'lucide-react-native'
import { hapticSuccess, hapticSelect } from '../src/haptics'
import { toast } from '../src/toast'
import { colors, radius, shadows, spacing, typography } from '../src/design'

type Provider = 'wave' | 'orange_money' | 'free_money' | 'cash' | 'wave_qr'

function getProviderLabel(t: any, id: Provider) {
  if (id === 'cash') return t('payment.cashOnPlace')
  if (id === 'orange_money') return 'Orange Money'
  if (id === 'free_money') return 'Free Money'
  if (id === 'wave_qr') return t('payment.waveQr', { defaultValue: 'Wave QR (scan boutique)' })
  return 'Wave'
}

const PROVIDERS: { id: Provider; icon: React.ReactNode; color: string; bg: string }[] = [
  { id: 'wave_qr', icon: <QrCode size={26} color="#1DC3F0" />, color: '#1DC3F0', bg: '#E0F7FE' },
  { id: 'wave', icon: <Waves size={26} color="#1DC3F0" />, color: '#1DC3F0', bg: '#E0F7FE' },
  { id: 'orange_money', icon: <Circle size={26} color="#FF6600" fill="#FF6600" />, color: '#FF6600', bg: '#FFF7ED' },
  { id: 'free_money', icon: <Circle size={26} color="#00A651" fill="#00A651" />, color: '#00A651', bg: '#ECFDF5' },
  { id: 'cash', icon: <Banknote size={26} color="#16A34A" />, color: '#16A34A', bg: '#DCFCE7' },
]

const DEPOSIT_RATE = 0.25
const MIN_DEPOSIT = 1000

type WalletData = {
  points: number
  config: {
    fcfaPerPoint: number
    escrowEnabled?: boolean
    escrowMandatory?: boolean
    escrowCostPoints?: number
  }
}

function PaymentScreen() {
  const { t } = useTranslation()
  const { offerId, amount, phase, requestId } = useLocalSearchParams<{ offerId: string; amount: string; requestId: string; phase?: string }>()
  const [selected, setSelected] = useState<Provider | null>(null)
  const [paymentMode, setPaymentMode] = useState<'deposit' | 'full'>(phase === 'balance' ? 'full' : phase === 'full' ? 'full' : 'deposit')
  const [loading, setLoading] = useState(false)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [useEscrow, setUseEscrow] = useState(true)
  const [polling, setPolling] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [manualCfg, setManualCfg] = useState<{ waveQrEnabled: boolean; waveMerchantPhone: string; waveQrUrl: string; wavePayUrl: string } | null>(null)
  const [manualPending, setManualPending] = useState<{ reference: string; amount: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollDoneRef = useRef(false)
  const user = getAuthUser()
  const escrowEnabled = !!wallet?.config?.escrowEnabled
  const escrowMandatory = !!wallet?.config?.escrowMandatory
  const escrowSelected = escrowEnabled && (escrowMandatory || useEscrow)
  const escrowCost = escrowSelected ? (wallet?.config?.escrowCostPoints || 0) : 0
  const hasEnoughEscrowPoints = !escrowCost || (wallet?.points || 0) >= escrowCost

  useEffect(() => {
    apiGetRetry('/api/wallet')
      .then(setWallet)
      .catch(() => setWallet(null))
      .finally(() => setWalletLoading(false))
    apiGetRetry('/api/payments/manual-config')
      .then(r => {
        if (r?.success) {
          const baseUrl = getBaseUrl()
          let qrUrl = r.waveQrUrl || ''
          if (qrUrl && !qrUrl.startsWith('http')) qrUrl = baseUrl + qrUrl
          // Ne pas construire d'URL depuis le numéro : pay.wave.com/m/<code> attend un code
          // marchand Wave Business, pas un numéro de téléphone. Sans URL configurée,
          // le client paie via le QR image ou le numéro affiché.
          const payUrl = typeof r.wavePayUrl === 'string' && r.wavePayUrl.startsWith('https://pay.wave.com/')
            ? r.wavePayUrl
            : ''
          setManualCfg({ waveQrEnabled: !!r.waveMerchantPhone, waveMerchantPhone: r.waveMerchantPhone || '', waveQrUrl: qrUrl, wavePayUrl: payUrl })
        }
      })
      .catch(() => {})
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null }
    setPolling(false)
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const totalAmount = Number(amount || 0)
  const isBalance = phase === 'balance'
  const isCash = selected === 'cash'
  const depositAmount = isCash || isBalance
    ? 0
    : (paymentMode === 'deposit'
        ? Math.max(Math.round(totalAmount * DEPOSIT_RATE), MIN_DEPOSIT)
        : totalAmount)
  const balanceAmount = isBalance ? totalAmount : totalAmount - depositAmount
  const payNowAmount = isCash || isBalance ? totalAmount : depositAmount

  const initiate = async () => {
    if (!selected || !offerId) return
    if (!hasEnoughEscrowPoints && !isCash && !isBalance) {
      toast.error(
        t('payment.insufficientPoints'),
        `${escrowCost} XC requis. ${wallet?.points || 0} XC disponibles.`
      )
      setTimeout(() => router.push('/wallet'), 800)
      return
    }
    setLoading(true)
    try {
      const requestPhase = isCash ? 'full' : (phase === 'balance' ? 'balance' : paymentMode)
      const res = await apiPost('/api/payments/initiate', {
        offerId,
        provider: selected,
        clientPhone: user?.phone || '',
        useEscrow: escrowSelected && !isCash && !isBalance,
        phase: requestPhase,
      })
      if (res.checkoutUrl) {
        setCheckoutUrl(res.checkoutUrl)
        const supported = await Linking.canOpenURL(res.checkoutUrl)
        if (supported) {
          await Linking.openURL(res.checkoutUrl)
        }
      }
      if (res.manualConfirm && res.reference) {
        // Paiement QR statique : afficher les instructions + polling de validation admin
        setManualPending({ reference: res.reference, amount: payNowAmount })
        setPolling(true)
        pollDoneRef.current = false
        pollRef.current = setInterval(async () => {
          if (pollDoneRef.current) return
          try {
            const r = await apiGetRetry(`/api/services/requests/${res.payment.requestId}`)
            if (['accepted','assigned','on_the_way','provider_arriving','arrived','in_progress','paused','awaiting_validation'].includes(r.item?.status)) {
              pollDoneRef.current = true
              stopPolling()
              setManualPending(null)
              hapticSuccess()
              toast.success(t('payment.initiated'), t('payment.manualConfirmed', { defaultValue: 'Paiement confirmé. La mission démarre.' }))
              if (requestId) {
                router.replace(`/mission/${requestId}`)
              } else {
                router.back()
              }
            }
          } catch { /* keep polling */ }
        }, 5000)
        pollTimeoutRef.current = setTimeout(() => stopPolling(), 600000)
        setLoading(false)
        return
      }
      if (res.payment?.status === 'held') {
        hapticSuccess()
        toast.success(
          t('payment.initiated'),
          isCash
            ? t('payment.cashInitiated', { amount: totalAmount.toLocaleString('fr-FR') })
            : paymentMode === 'deposit'
              ? t('payment.depositInitiated', { deposit: depositAmount.toLocaleString('fr-FR'), balance: balanceAmount.toLocaleString('fr-FR') })
              : t('payment.escrowHeld', { amount: totalAmount.toLocaleString('fr-FR') })
        )
        if (requestId && phase !== 'balance') {
          router.replace(`/mission/${requestId}`)
        } else {
          router.back()
        }
      } else if (res.payment?.status === 'pending') {
        setPolling(true)
        pollDoneRef.current = false
        pollRef.current = setInterval(async () => {
          if (pollDoneRef.current) return
          try {
            const r = await apiGetRetry(`/api/services/requests/${res.payment.requestId}`)
            if (['accepted','assigned','on_the_way','provider_arriving','arrived','in_progress','paused','awaiting_validation'].includes(r.item?.status)) {
              pollDoneRef.current = true
              stopPolling()
              toast.success(
                t('payment.initiated'),
                paymentMode === 'deposit'
                  ? t('payment.depositInitiated', { deposit: depositAmount.toLocaleString('fr-FR'), balance: balanceAmount.toLocaleString('fr-FR') })
                  : t('payment.escrowHeld', { amount: totalAmount.toLocaleString('fr-FR') })
              )
              if (requestId) {
                router.replace(`/mission/${requestId}`)
              } else {
                router.back()
              }
            }
          } catch { /* keep polling */ }
        }, 5000)
        pollTimeoutRef.current = setTimeout(() => stopPolling(), 120000)
      }
    } catch (e: any) {
      const msg = e.message || t('payment.initError')
      toast.error(t('common.error'), msg)
      if (msg.toLowerCase().includes('solde points insuffisant')) {
        setTimeout(() => router.push('/wallet'), 800)
      }
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('payment.escrow')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg }}
      >
        {/* Amount card */}
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>{t('payment.amount')}</Text>
          <Text style={s.amountValue}>{payNowAmount.toLocaleString('fr-FR')} FCFA</Text>

          {selected !== 'cash' && !isBalance && paymentMode === 'deposit' && (
            <View style={s.depositBox}>
              <Text style={s.depositLabel}>{t('payment.depositLabel')}</Text>
              <Text style={s.depositValue}>{depositAmount.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={s.depositHint}>{t('payment.depositHint', { amount: balanceAmount.toLocaleString('fr-FR') })}</Text>
            </View>
          )}

          {selected !== 'cash' && !isBalance && paymentMode === 'full' && (
            <Text style={s.escrowHint}>{t('payment.escrowSub')}</Text>
          )}

          {selected !== 'cash' && isBalance && (
            <Text style={s.escrowHint}>Paiement du solde restant</Text>
          )}

          {selected === 'cash' && (
            <View style={s.cashBox}>
              <Text style={s.escrowHint}>{t('payment.cashOnPlace')}</Text>
              <View style={s.cashWarning}>
                <ShieldAlert size={16} color="#B45309" />
                <Text style={s.cashWarningText}>{t('payment.cashNotGuaranteed')}</Text>
              </View>
            </View>
          )}

          {/* Escrow toggle */}
          {!walletLoading && escrowEnabled && !escrowMandatory && (
            <TouchableOpacity
              onPress={() => setUseEscrow(v => !v)}
              style={[s.escrowChoice, escrowSelected && s.escrowChoiceActive]}
              activeOpacity={0.85}
            >
              <View style={[s.checkCircle, escrowSelected && s.checkCircleActive]}>
                {escrowSelected && <Check size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.escrowChoiceTitle}>{t('payment.secureWithEscrow')}</Text>
                <Text style={s.escrowChoiceSub}>{t('payment.optionalFee', { n: wallet?.config?.escrowCostPoints || 0 })}</Text>
              </View>
            </TouchableOpacity>
          )}
          {!walletLoading && escrowEnabled && escrowMandatory && (
            <View style={[s.escrowChoice, s.escrowChoiceActive]}>
              <View style={[s.checkCircle, s.checkCircleActive]}>
                <Check size={14} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.escrowChoiceTitle}>{t('payment.escrowMandatory')}</Text>
                <Text style={s.escrowChoiceSub}>{t('payment.fee', { n: wallet?.config?.escrowCostPoints || 0 })}</Text>
              </View>
            </View>
          )}

          {/* Escrow cost row */}
          <View style={s.escrowRow}>
            {walletLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
                <Text style={s.escrowCost}>
                  {escrowCost > 0
                    ? t('payment.escrowFeeBalance', { fee: escrowCost, balance: wallet?.points || 0 })
                    : escrowEnabled ? t('payment.escrowNotSelected') : t('payment.escrowUnavailable')}
                </Text>
                {!hasEnoughEscrowPoints && (
                  <TouchableOpacity onPress={() => router.push('/wallet')} style={s.topupBtn}>
                    <Text style={s.topupText}>{t('payment.recharge')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Payment mode selector */}
        {selected !== 'cash' && !isBalance && (
          <View style={s.modeSelector}>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'deposit' && s.modeBtnActive]}
              onPress={() => { hapticSelect(); setPaymentMode('deposit'); setUseEscrow(true) }}
              activeOpacity={0.7}
            >
              <Text style={[s.modeText, paymentMode === 'deposit' && s.modeTextActive]}>{t('payment.depositMode')}</Text>
              <Text style={s.modeSub}>{t('payment.depositModeSub')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'full' && s.modeBtnActive]}
              onPress={() => { hapticSelect(); setPaymentMode('full') }}
              activeOpacity={0.7}
            >
              <Text style={[s.modeText, paymentMode === 'full' && s.modeTextActive]}>{t('payment.fullMode')}</Text>
              <Text style={s.modeSub}>{t('payment.fullModeSub')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment methods */}
        <Text style={s.sectionTitle}>{t('payment.chooseMethod')}</Text>

        {PROVIDERS.filter(p => p.id !== 'wave_qr' || manualCfg?.waveQrEnabled).map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.providerCard, selected === p.id && { borderColor: p.color, backgroundColor: p.bg }]}
            onPress={() => { hapticSelect(); setSelected(p.id) }}
            activeOpacity={0.7}
          >
            <View style={[s.providerIcon, { backgroundColor: p.bg }]}>{p.icon}</View>
            <Text style={s.providerLabel}>{getProviderLabel(t, p.id)}</Text>
            {selected === p.id && <Check size={22} color={p.color} />}
          </TouchableOpacity>
        ))}

        {/* QR code Wave : scanner depuis l'appli Wave (autre téléphone ou après retour) */}
        {polling && checkoutUrl && selected === 'wave' && (
          <View style={s.qrCard}>
            <Text style={s.qrTitle}>{t('payment.scanQr', { defaultValue: 'Scanner pour payer' })}</Text>
            <View style={s.qrBox}>
              <QRCode value={checkoutUrl} size={180} backgroundColor="white" />
            </View>
            <Text style={s.qrHint}>{t('payment.scanQrHint', { defaultValue: 'Ouvrez Wave et scannez ce code, ou appuyez ci-dessous' })}</Text>
            <TouchableOpacity style={s.qrOpenBtn} onPress={() => Linking.openURL(checkoutUrl)} activeOpacity={0.8}>
              <Text style={s.qrOpenBtnText}>{t('payment.openWave', { defaultValue: 'Ouvrir Wave' })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wave QR statique : QR marchand affiché immédiatement (avant paiement) */}
        {selected === 'wave_qr' && manualCfg?.waveQrEnabled && !polling && !manualPending && (
          <View style={s.qrCard}>
            <Text style={s.qrTitle}>{t('payment.waveQrTitle', { defaultValue: 'Payer par Wave' })}</Text>
            <Text style={s.qrHint}>
              {t('payment.waveQrInstructions', { defaultValue: 'Scannez le QR ci-dessous avec Wave ou envoyez au numéro marchand, puis appuyez sur Payer.' })}
            </Text>
            {manualCfg?.waveQrUrl ? (
              <View style={s.qrBox}>
                <Image source={{ uri: manualCfg.waveQrUrl }} style={{ width: 200, height: 200, borderRadius: 8 }} resizeMode="contain" />
              </View>
            ) : manualCfg?.wavePayUrl ? (
              <View style={s.qrBox}>
                <QRCode value={`${manualCfg.wavePayUrl}?amount=${payNowAmount}`} size={180} backgroundColor="white" />
              </View>
            ) : null}
            {!!manualCfg?.waveMerchantPhone && (
              <Text style={s.manualPhone}>{manualCfg.waveMerchantPhone}</Text>
            )}
            <Text style={s.manualAmount}>{payNowAmount.toLocaleString('fr-FR')} FCFA</Text>
            {manualCfg?.wavePayUrl ? (
              <TouchableOpacity
                style={s.qrOpenBtn}
                onPress={() => {
                  const sep = manualCfg.wavePayUrl.includes('?') ? '&' : '?'
                  Linking.openURL(`${manualCfg.wavePayUrl}${sep}amount=${payNowAmount}`)
                }}
                activeOpacity={0.8}
              >
                <Text style={s.qrOpenBtnText}>{t('payment.waveQrOpen', { defaultValue: `Ouvrir Wave — ${payNowAmount.toLocaleString('fr-FR')} FCFA` })}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Paiement manuel Wave QR : instructions + référence + attente confirmation */}
        {manualPending && (
          <View style={s.qrCard}>
            <Text style={s.qrTitle}>{t('payment.waveQrTitle', { defaultValue: 'Payer par Wave' })}</Text>
            <Text style={s.qrHint}>
              {t('payment.waveQrInstructions', { defaultValue: 'Scannez le QR boutique avec Wave (ou envoyez au numéro ci-dessous), puis appuyez sur le bouton ci-dessous.' })}
            </Text>
            {manualCfg?.waveQrUrl ? (
              <View style={s.qrBox}>
                <Image source={{ uri: manualCfg.waveQrUrl }} style={{ width: 200, height: 200, borderRadius: 8 }} resizeMode="contain" />
              </View>
            ) : manualCfg?.wavePayUrl ? (
              <View style={s.qrBox}>
                <QRCode value={`${manualCfg.wavePayUrl}?amount=${manualPending.amount}`} size={180} backgroundColor="white" />
              </View>
            ) : null}
            {!!manualCfg?.waveMerchantPhone && (
              <Text style={s.manualPhone}>{manualCfg.waveMerchantPhone}</Text>
            )}
            <View style={s.refBox}>
              <Text style={s.refLabel}>{t('payment.waveQrRef', { defaultValue: 'Référence à indiquer' })}</Text>
              <Text style={s.refValue}>{manualPending.reference}</Text>
            </View>
            <Text style={s.manualAmount}>{manualPending.amount.toLocaleString('fr-FR')} FCFA</Text>
            {manualCfg?.wavePayUrl ? (
              <TouchableOpacity
                style={s.qrOpenBtn}
                onPress={() => {
                  const sep = manualCfg.wavePayUrl.includes('?') ? '&' : '?'
                  Linking.openURL(`${manualCfg.wavePayUrl}${sep}amount=${manualPending.amount}`)
                }}
                activeOpacity={0.8}
              >
                <Text style={s.qrOpenBtnText}>{t('payment.waveQrOpen', { defaultValue: `Ouvrir Wave — ${manualPending.amount.toLocaleString('fr-FR')} FCFA` })}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={s.manualWaiting}>
              <Clock size={16} color={colors.warning} />
              <Text style={s.manualWaitingText}>{t('payment.waveQrWaiting', { defaultValue: 'En attente de confirmation par la boutique…' })}</Text>
            </View>
            <TouchableOpacity
              style={s.ipaidBtn}
              onPress={() => {
                hapticSelect()
                stopPolling()
                setManualPending(null)
                initiate()
              }}
              activeOpacity={0.8}
            >
              <Text style={s.ipaidBtnText}>{t('payment.ipaidVerify', { defaultValue: "J'ai payé — vérifier" })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pay button */}
        <TouchableOpacity
          style={[s.payBtn, (!selected || loading || walletLoading || polling) && s.payBtnDisabled]}
          disabled={!selected || loading || walletLoading || polling}
          onPress={initiate}
          activeOpacity={0.8}
        >
          {loading || polling ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="#fff" />
              <Text style={[s.payBtnText, { fontSize: 13 }]}>{polling ? t('payment.polling') : t('common.loading')}</Text>
            </View>
          ) : (
            <Text style={s.payBtnText}>
              {selected === 'cash'
                ? `${t('payment.cashOnPlace')} ${totalAmount.toLocaleString('fr-FR')} FCFA`
                : `${t('payment.payNow')} ${payNowAmount.toLocaleString('fr-FR')} FCFA`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text },
  amountCard: {
    backgroundColor: colors.infoLight, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: 6, ...shadows.sm,
  },
  amountLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  amountValue: { fontSize: 30, fontWeight: typography.weight.extrabold as any, color: colors.info },
  escrowHint: { fontSize: 12, color: colors.info, textAlign: 'center', marginTop: 4, fontWeight: typography.weight.semibold as any },
  cashBox: { width: '100%', alignItems: 'center', marginTop: 4 },
  cashWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningLight, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  cashWarningText: { fontSize: 11, color: '#B45309', fontWeight: typography.weight.semibold as any, flex: 1 },
  depositBox: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm, width: '100%' },
  depositLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  depositValue: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.primary, marginTop: 2 },
  depositHint: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  escrowChoice: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, marginTop: 10 },
  escrowChoiceActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: colors.success, borderColor: colors.success },
  escrowChoiceTitle: { fontSize: 13, color: colors.text, fontWeight: typography.weight.extrabold as any },
  escrowChoiceSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  escrowRow: { marginTop: 8, alignItems: 'center', gap: 8 },
  escrowCost: { fontSize: 12, color: colors.text, fontWeight: typography.weight.bold as any, textAlign: 'center' },
  topupBtn: { backgroundColor: colors.infoLight, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7 },
  topupText: { color: colors.info, fontSize: 12, fontWeight: typography.weight.extrabold as any },
  modeSelector: { flexDirection: 'row', gap: spacing.sm },
  modeBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', ...shadows.sm },
  modeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modeText: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.textSecondary },
  modeTextActive: { color: colors.primary },
  modeSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  qrCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  qrTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  qrBox: { backgroundColor: '#fff', padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  qrHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  qrOpenBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4, ...shadows.md },
  qrOpenBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 2, borderColor: colors.border, ...shadows.sm,
  },
  providerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  providerLabel: { fontSize: 16, fontWeight: typography.weight.semibold as any, color: colors.text, flex: 1 },
  payBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.lg,
    alignItems: 'center', marginTop: spacing.sm, ...shadows.md,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
  manualPhone: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: 1 },
  refBox: { backgroundColor: colors.warningLight, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
  refLabel: { fontSize: 11, color: '#92400E', fontWeight: typography.weight.semibold as any },
  refValue: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: '#92400E', letterSpacing: 2, marginTop: 2 },
  manualAmount: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  manualWaiting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  manualWaitingText: { fontSize: 12, color: colors.warning, fontWeight: typography.weight.semibold as any },
  ipaidBtn: { backgroundColor: colors.success, borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, marginTop: spacing.sm, ...shadows.md },
  ipaidBtnText: { color: colors.surface, fontSize: 14, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(PaymentScreen, 'Payment')
