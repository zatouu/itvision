import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGetRetry, apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { getAuthUser } from '../src/auth'
import { ArrowLeft, Check, Waves, Circle, Banknote } from 'lucide-react-native'

type Provider = 'wave' | 'orange_money' | 'free_money' | 'cash'

function getProviderLabel(t: any, id: Provider) {
  if (id === 'cash') return t('payment.cashOnPlace')
  if (id === 'orange_money') return 'Orange Money'
  if (id === 'free_money') return 'Free Money'
  return 'Wave'
}

const PROVIDERS: { id: Provider; icon: React.ReactNode; color: string }[] = [
  { id: 'wave', icon: <Waves size={26} color="#1DC3F0" />, color: '#1DC3F0' },
  { id: 'orange_money', icon: <Circle size={26} color="#FF6600" fill="#FF6600" />, color: '#FF6600' },
  { id: 'free_money', icon: <Circle size={26} color="#00A651" fill="#00A651" />, color: '#00A651' },
  { id: 'cash', icon: <Banknote size={26} color="#16A34A" />, color: '#16A34A' },
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
  const { offerId, amount, phase } = useLocalSearchParams<{ offerId: string; amount: string; requestId: string; phase?: string }>()
  const [selected, setSelected] = useState<Provider | null>(null)
  const [paymentMode, setPaymentMode] = useState<'deposit' | 'full'>(phase === 'balance' ? 'full' : phase === 'full' ? 'full' : 'deposit')
  const [loading, setLoading] = useState(false)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [useEscrow, setUseEscrow] = useState(true)
  const [polling, setPolling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setPolling(false)
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const totalAmount = Number(amount || 0)
  const depositAmount = selected === 'cash'
    ? 0
    : (paymentMode === 'deposit'
        ? Math.max(Math.round(totalAmount * DEPOSIT_RATE), MIN_DEPOSIT)
        : totalAmount)
  const balanceAmount = totalAmount - depositAmount
  const payNowAmount = selected === 'cash' ? totalAmount : depositAmount
  const isCash = selected === 'cash'

  const initiate = async () => {
    if (!selected || !offerId) return
    if (!hasEnoughEscrowPoints && !isCash) {
      Alert.alert(
        t('payment.insufficientPoints'),
        `${escrowCost} XC ${t('payment.insufficientPoints').toLowerCase()}. ${wallet?.points || 0} XC.`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('payment.recharge'), onPress: () => router.push('/wallet') },
        ]
      )
      return
    }
    setLoading(true)
    try {
      const requestPhase = isCash ? 'full' : (phase === 'balance' ? 'balance' : paymentMode)
      const res = await apiPost('/api/payments/initiate', {
        offerId,
        provider: selected,
        clientPhone: user?.phone || '',
        useEscrow: escrowSelected && !isCash,
        phase: requestPhase,
      })
      if (res.checkoutUrl) {
        const supported = await Linking.canOpenURL(res.checkoutUrl)
        if (supported) {
          await Linking.openURL(res.checkoutUrl)
        } else {
          Alert.alert(t('payment.paymentLink'), res.checkoutUrl)
        }
      }
      if (res.payment?.status === 'held') {
        Alert.alert(
          t('payment.initiated'),
          isCash
            ? t('payment.cashInitiated', { amount: totalAmount.toLocaleString('fr-FR') })
            : paymentMode === 'deposit'
              ? t('payment.depositInitiated', { deposit: depositAmount.toLocaleString('fr-FR'), balance: balanceAmount.toLocaleString('fr-FR') })
              : t('payment.escrowHeld', { amount: totalAmount.toLocaleString('fr-FR') }),
          [{ text: t('common.ok'), onPress: () => router.back() }]
        )
      } else if (res.payment?.status === 'pending') {
        setPolling(true)
        pollRef.current = setInterval(async () => {
          try {
            const r = await apiGetRetry(`/api/services/requests/${res.payment.requestId}`)
            if (r.item?.status === 'assigned' || r.item?.status === 'provider_arriving') {
              stopPolling()
              Alert.alert(
                t('payment.initiated'),
                paymentMode === 'deposit'
                  ? t('payment.depositInitiated', { deposit: depositAmount.toLocaleString('fr-FR'), balance: balanceAmount.toLocaleString('fr-FR') })
                  : t('payment.escrowHeld', { amount: totalAmount.toLocaleString('fr-FR') }),
                [{ text: t('common.ok'), onPress: () => router.back() }]
              )
            }
          } catch { /* keep polling */ }
        }, 5000)
        setTimeout(() => stopPolling(), 120000)
      }
    } catch (e: any) {
      Alert.alert(
        t('common.error'),
        e.message || t('payment.initError'),
        e?.message?.toLowerCase?.().includes('solde points insuffisant')
          ? [{ text: t('payment.recharge'), onPress: () => router.push('/wallet') }, { text: t('common.ok') }]
          : undefined
      )
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('payment.escrow')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={s.body}>
        <View style={s.amountBox}>
          <Text style={s.amountLabel}>{t('payment.amount')}</Text>
          <Text style={s.amountValue}>{totalAmount.toLocaleString('fr-FR')} FCFA</Text>
          {selected !== 'cash' && paymentMode === 'deposit' && (
            <View style={s.depositRow}>
              <Text style={s.depositLabel}>{t('payment.depositLabel')}</Text>
              <Text style={s.depositValue}>{depositAmount.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={s.depositHint}>{t('payment.depositHint', { amount: balanceAmount.toLocaleString('fr-FR') })}</Text>
            </View>
          )}
          {selected !== 'cash' && paymentMode === 'full' && (
            <Text style={s.escrowHint}>{t('payment.escrowSub')}</Text>
          )}
          {selected === 'cash' && (
            <Text style={s.escrowHint}>{t('payment.cashOnPlace')}</Text>
          )}
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
          <View style={s.escrowRow}>
            <Text style={s.escrowCost}>
              {walletLoading
                ? t('payment.checkingWallet')
                : escrowCost > 0
                  ? t('payment.escrowFeeBalance', { fee: escrowCost, balance: wallet?.points || 0 })
                  : escrowEnabled ? t('payment.escrowNotSelected') : t('payment.escrowUnavailable')}
            </Text>
            {!walletLoading && !hasEnoughEscrowPoints && (
              <TouchableOpacity onPress={() => router.push('/wallet')} style={s.topupBtn}>
                <Text style={s.topupText}>{t('payment.recharge')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {selected !== 'cash' && (
          <View style={s.modeSelector}>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'deposit' && s.modeBtnActive]}
              onPress={() => setPaymentMode('deposit')}
            >
              <Text style={[s.modeText, paymentMode === 'deposit' && s.modeTextActive]}>{t('payment.depositMode')}</Text>
              <Text style={s.modeSub}>{t('payment.depositModeSub')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, paymentMode === 'full' && s.modeBtnActive]}
              onPress={() => setPaymentMode('full')}
            >
              <Text style={[s.modeText, paymentMode === 'full' && s.modeTextActive]}>{t('payment.fullMode')}</Text>
              <Text style={s.modeSub}>{t('payment.fullModeSub')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={s.sectionTitle}>{t('payment.chooseMethod')}</Text>

        {PROVIDERS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.providerCard, selected === p.id && { borderColor: p.color }]}
            onPress={() => setSelected(p.id)}
            activeOpacity={0.8}
          >
            {p.icon}
            <Text style={s.providerLabel}>{getProviderLabel(t, p.id)}</Text>
            {selected === p.id && <Check size={22} color={p.color} />}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.payBtn, (!selected || loading || walletLoading) && s.payBtnDisabled]}
          disabled={!selected || loading || walletLoading}
          onPress={initiate}
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
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backIcon: { color: '#0F172A' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  body: { flex: 1, padding: 20, gap: 20 },
  amountBox: {
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 20, alignItems: 'center', gap: 6,
  },
  amountLabel: { fontSize: 13, color: '#64748B' },
  amountValue: { fontSize: 28, fontWeight: '800', color: '#1D4ED8' },
  escrowHint: { fontSize: 11, color: '#3B82F6', textAlign: 'center', marginTop: 4 },
  escrowChoice: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', padding: 12, marginTop: 10 },
  escrowChoiceActive: { backgroundColor: '#ECFDF5', borderColor: '#059669' },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#94A3B8', alignItems: 'center', justifyContent: 'center' },
  checkCircleActive: { backgroundColor: '#059669', borderColor: '#059669' },
  checkCircleText: { color: '#fff' },
  escrowChoiceTitle: { fontSize: 13, color: '#0F172A', fontWeight: '800' },
  escrowChoiceSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  escrowRow: { marginTop: 8, alignItems: 'center', gap: 8 },
  escrowCost: { fontSize: 12, color: '#0F172A', fontWeight: '700', textAlign: 'center' },
  topupBtn: { backgroundColor: '#DBEAFE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  topupText: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  depositRow: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 10, width: '100%' },
  depositLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  depositValue: { fontSize: 20, fontWeight: '800', color: '#059669', marginTop: 2 },
  depositHint: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 },
  modeSelector: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center' },
  modeBtnActive: { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  modeText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  modeTextActive: { color: '#059669' },
  modeSub: { fontSize: 11, color: '#64748B', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  providerIcon: { },
  providerLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', flex: 1 },
  checkMark: { },
  payBtn: {
    backgroundColor: '#059669', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 'auto',
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

export default withScreenBoundary(PaymentScreen, 'Payment')
