import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image, RefreshControl, Linking } from 'react-native'
import { toast } from '../src/toast'
import { confirm } from '../src/confirm'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGetRetry, apiPost, getBaseUrl } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import EmptyState from '../src/components/EmptyState'
import { getAuthUser } from '../src/auth'
import { humanErrorMessage } from '../src/errorMessages'
import { ArrowLeft, TrendingUp, TrendingDown, Wallet as WalletIcon, Handshake } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { hapticSelect, hapticSuccess } from '../src/haptics'

type WalletData = {
  points: number
  reservedPoints: number
  cashBalance: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  config: {
    mode: 'free' | 'points' | 'commission'
    pointsActive: boolean
    pointsPerWonMission: number
    fcfaPerPoint: number
    freeUntil: string | null
    escrowEnabled?: boolean
    escrowMandatory?: boolean
    escrowCostPoints?: number
  }
  history: Array<{
    id: string
    kind: string
    points: number
    balanceAfter: number
    description: string | null
    createdAt: string
  }>
}

const PACKS = [25, 50, 100, 250]
const OPERATORS: Array<{ id: 'wave_qr' | 'wave' | 'orange_money' | 'free_money'; label: string }> = [
  { id: 'wave_qr', label: 'Wave QR' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'free_money', label: 'Free Money' },
]

const KIND_KEYS: Record<string, string> = {
  welcome: 'wallet.kind_welcome',
  topup: 'wallet.kind_topup',
  mission_spend: 'wallet.kind_mission_spend',
  mission_reserve: 'Réservation mission',
  mission_release: 'Libération réservation',
  referral_bonus: 'wallet.kind_referral_bonus',
  refund: 'wallet.kind_refund',
  escrow_charge: 'wallet.kind_escrow_charge',
  escrow_refund: 'wallet.kind_escrow_refund',
  admin_adjust: 'wallet.kind_admin_adjust',
}

function Wallet() {
  const { t } = useTranslation()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPack, setSelectedPack] = useState<number>(100)
  const [selectedOp, setSelectedOp] = useState<'wave_qr' | 'wave' | 'orange_money' | 'free_money'>('wave_qr')
  const [topupLoading, setTopupLoading] = useState(false)
  const [manualCfg, setManualCfg] = useState<{ waveQrEnabled: boolean; waveMerchantPhone: string; waveQrUrl: string; wavePayUrl: string } | null>(null)
  const [manualPending, setManualPending] = useState<{ reference: string; amount: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await apiGetRetry('/api/wallet')
      setData(r)
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    apiGetRetry('/api/payments/manual-config')
      .then(r => {
        if (r?.success) {
          const baseUrl = getBaseUrl()
          let qrUrl = r.waveQrUrl || ''
          if (qrUrl && !qrUrl.startsWith('http')) qrUrl = baseUrl + qrUrl
          let payUrl = r.wavePayUrl || ''
          if (!payUrl && r.waveMerchantPhone) {
            payUrl = `https://pay.wave.com/m/${r.waveMerchantPhone.replace(/\D/g, '')}`
          }
          setManualCfg({ waveQrEnabled: !!r.waveMerchantPhone, waveMerchantPhone: r.waveMerchantPhone || '', waveQrUrl: qrUrl, wavePayUrl: payUrl })
        }
      })
      .catch(() => {})
  }, [])

  const onTopup = async () => {
    const user = getAuthUser()
    const phone = user?.phone
    if (!phone) {
      toast.info(t('wallet.phoneRequired'), t('wallet.phoneRequiredMsg'))
      return
    }
    const amountFcfa = selectedPack * (data?.config.fcfaPerPoint || 100)
    const ok = await confirm(
      t('wallet.confirmTopup'),
      t('wallet.confirmTopupMsg', { pack: selectedPack, amount: amountFcfa.toLocaleString('fr-FR'), operator: OPERATORS.find(o => o.id === selectedOp)?.label })
    )
    if (!ok) return
    setTopupLoading(true)
    try {
      const r: any = await apiPost('/api/wallet/topup', {
        points: selectedPack,
        provider: selectedOp,
        phone,
      })
      if (r?.confirmed) {
        hapticSuccess()
        toast.success(t('wallet.topupSuccess'), t('wallet.topupSuccessMsg', { pack: selectedPack, balance: r.balance }))
      } else if (r?.manualConfirm && r?.reference) {
        setManualPending({ reference: r.reference, amount: amountFcfa })
      } else if (r?.checkoutUrl) {
        const supported = await Linking.canOpenURL(r.checkoutUrl)
        if (supported) {
          await Linking.openURL(r.checkoutUrl)
        } else {
          toast.info(t('wallet.paymentLink'), r.checkoutUrl)
        }
      }
      await load()
    } catch (e: any) {
      toast.error(t('wallet.topupFailed'), humanErrorMessage(e))
    } finally {
      setTopupLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  const isFree = !data?.config.pointsActive

  const points = data?.points ?? 0
  const fcfaEq = points * (data?.config.fcfaPerPoint || 100)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <ArrowLeft size={17} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('wallet.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        {/* Hero solde */}
        <View style={s.heroCard}>
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>{t('wallet.balance').toUpperCase()}</Text>
            <View style={s.heroPill}>
              <Handshake size={11} color="#fff" />
              <Text style={s.heroPillText}>{isFree ? t('wallet.freeBadgeText') : `1 XC = ${data?.config.fcfaPerPoint} FCFA`}</Text>
            </View>
          </View>
          <View style={s.heroAmountRow}>
            <Text style={s.heroAmount}>{points.toLocaleString('fr-FR')}</Text>
            <Text style={s.heroUnit}>XC</Text>
          </View>
          <Text style={s.heroSub}>
            {isFree ? t('wallet.points') : `≈ ${fcfaEq.toLocaleString('fr-FR')} FCFA`}
            {(data?.reservedPoints ?? 0) > 0 ? ` · ${data?.reservedPoints} ${t('wallet.reserved', { defaultValue: 'réservés' })}` : ''}
          </Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>{t('wallet.earned').toUpperCase()}</Text>
              <Text style={s.heroStatValue}>{data?.lifetimePointsEarned ?? 0} <Text style={s.heroStatUnit}>XC</Text></Text>
            </View>
            <View style={s.heroStat}>
              <Text style={s.heroStatLabel}>{t('wallet.used').toUpperCase()}</Text>
              <Text style={s.heroStatValue}>{data?.lifetimePointsSpent ?? 0} <Text style={s.heroStatUnit}>XC</Text></Text>
            </View>
          </View>
        </View>

        {/* Recharge */}
        <View style={{ marginTop: 20 }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>{t('wallet.buyXC')}</Text>
          </View>
          <View style={s.packRow}>
            {PACKS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.pack, selectedPack === p && s.packActive]}
                onPress={() => { hapticSelect(); setSelectedPack(p) }}
                activeOpacity={0.7}
              >
                <Text style={[s.packNum, selectedPack === p && s.packNumActive]}>{p}</Text>
                <Text style={[s.packFcfa, selectedPack === p && s.packFcfaActive]}>
                  {(p * (data?.config.fcfaPerPoint || 100)).toLocaleString('fr-FR')} F
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.opRow}>
            {OPERATORS.filter(op => op.id !== 'wave_qr' || manualCfg?.waveQrEnabled).map(op => (
              <TouchableOpacity
                key={op.id}
                style={[s.op, selectedOp === op.id && s.opActive]}
                onPress={() => { hapticSelect(); setSelectedOp(op.id) }}
                activeOpacity={0.7}
              >
                <Text style={[s.opText, selectedOp === op.id && s.opTextActive]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.payBtn} onPress={onTopup} disabled={topupLoading} activeOpacity={0.85}>
            {topupLoading
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={s.payText}>{t('wallet.payBtn', { amount: (selectedPack * (data?.config.fcfaPerPoint || 100)).toLocaleString('fr-FR') })}</Text>}
          </TouchableOpacity>

          {manualPending && (
            <View style={s.manualCard}>
              <Text style={s.manualTitle}>{t('wallet.waveQrTitle', { defaultValue: 'Payer par Wave' })}</Text>
              <Text style={s.manualHint}>{t('wallet.waveQrInstructions', { defaultValue: 'Scannez le QR boutique avec Wave (ou envoyez au numéro ci-dessous) en indiquant la référence, puis attendez la confirmation.' })}</Text>
              {manualCfg?.waveQrUrl ? (
                <Image source={{ uri: manualCfg.waveQrUrl }} style={{ width: 180, height: 180, borderRadius: 8, alignSelf: 'center' }} resizeMode="contain" />
              ) : null}
              {!!manualCfg?.waveMerchantPhone && <Text style={s.manualPhone}>{manualCfg.waveMerchantPhone}</Text>}
              <View style={s.refBox}>
                <Text style={s.refLabel}>{t('wallet.waveQrRef', { defaultValue: 'Référence à indiquer' })}</Text>
                <Text style={s.refValue}>{manualPending.reference}</Text>
              </View>
              <Text style={s.manualAmount}>{manualPending.amount.toLocaleString('fr-FR')} FCFA</Text>
              {manualCfg?.wavePayUrl ? (
                <TouchableOpacity
                  style={s.waveOpenBtn}
                  onPress={() => {
                    const sep = manualCfg.wavePayUrl.includes('?') ? '&' : '?'
                    Linking.openURL(`${manualCfg.wavePayUrl}${sep}amount=${manualPending.amount}`)
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={s.waveOpenBtnText}>{t('wallet.waveQrOpen', { defaultValue: `Ouvrir Wave — ${manualPending.amount.toLocaleString('fr-FR')} FCFA` })}</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={s.manualWaitingText}>{t('wallet.waveQrWaiting', { defaultValue: 'Vos crédits seront ajoutés après confirmation par la boutique.' })}</Text>
            </View>
          )}
        </View>

        {/* Historique */}
        <View style={{ marginTop: 22 }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>{t('wallet.history')}</Text>
          </View>
          {(!data?.history || data.history.length === 0) ? (
            <EmptyState icon={<WalletIcon size={32} color={colors.textMuted} />} title={t('wallet.noHistory')} />
          ) : (
            <View style={s.historyCard}>
              {data.history.map((txn, i) => {
                const isCredit = txn.points >= 0
                const KindIcon = isCredit ? TrendingUp : TrendingDown
                return (
                  <View key={txn.id} style={[s.txn, i < data!.history.length - 1 && s.txnBorder]}>
                    <View style={[s.txnIcon, { backgroundColor: isCredit ? colors.brandSoft : colors.slate100 }]}>
                      <KindIcon size={16} color={isCredit ? colors.primary : colors.textMuted} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.txnKind} numberOfLines={1}>{t(KIND_KEYS[txn.kind] || txn.kind)}</Text>
                      {!!txn.description && <Text style={s.txnDesc} numberOfLines={1}>{txn.description}</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.txnPointsText, isCredit ? s.txnPos : s.txnNeg]}>
                        {isCredit ? '+' : ''}{txn.points}
                      </Text>
                      <Text style={s.txnDate}>
                        {new Date(txn.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, textAlign: 'center' },
  body: { padding: 16, paddingBottom: 32 },
  // Hero
  heroCard: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, paddingBottom: 22, overflow: 'hidden', ...shadows.hero },
  heroCircle1: { position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroCircle2: { position: 'absolute', bottom: -50, right: 60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  heroPillText: { fontSize: 10.5, fontWeight: '800', color: '#fff' },
  heroAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  heroAmount: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  heroUnit: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '700', letterSpacing: 0.3 },
  heroStatValue: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 1 },
  heroStatUnit: { fontSize: 10, color: 'rgba(255,255,255,0.75)' },
  // Sections
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  packRow: { flexDirection: 'row', gap: 10 },
  pack: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.borderSoft },
  packActive: { backgroundColor: colors.brandSoft, borderColor: colors.primary },
  packNum: { fontSize: 20, fontWeight: '800', color: colors.ink },
  packNumActive: { color: colors.primary },
  packFcfa: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  packFcfaActive: { color: colors.primary },
  opRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  op: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: colors.borderSoft },
  opActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  opText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  opTextActive: { color: '#fff' },
  payBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 12, ...shadows.md },
  payText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  // Historique
  historyCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden' },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  txnBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  txnIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txnKind: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  txnDesc: { fontSize: 10.5, color: colors.textMuted, marginTop: 1 },
  txnDate: { fontSize: 10, color: colors.textDim, fontWeight: '600', marginTop: 2 },
  txnPointsText: { fontSize: 13, fontWeight: '800' },
  txnPos: { color: colors.primary },
  txnNeg: { color: colors.danger },
  // Paiement manuel
  manualCard: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center' },
  manualTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  manualHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  manualPhone: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: 1 },
  refBox: { backgroundColor: colors.warningLight, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
  refLabel: { fontSize: 11, color: '#92400E', fontWeight: '600' },
  refValue: { fontSize: 22, fontWeight: '800', color: '#92400E', letterSpacing: 2, marginTop: 2 },
  manualAmount: { fontSize: 18, fontWeight: '800', color: colors.primary },
  manualWaitingText: { fontSize: 12, color: colors.warning, fontWeight: '600', textAlign: 'center' },
  waveOpenBtn: { backgroundColor: '#1DC3F0', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, ...shadows.md },
  waveOpenBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})

export default withScreenBoundary(Wallet, 'Wallet')
