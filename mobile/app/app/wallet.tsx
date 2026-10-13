import { createThemedStyles } from '../src/theme'
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
import { TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { radius, spacing, typography, shadows, isIOS } from '../src/design'
import { hapticSelect, hapticSuccess } from '../src/haptics'
import { useAppFlags } from '../src/app-flags'

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
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const { onlinePayments } = useAppFlags()
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
  }, [t])

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
        <ActivityIndicator size="large" color={colors.primaryText} />
      </SafeAreaView>
    )
  }

  if (!data) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <BackIcon size={17} color={colors.ink} />
          </TouchableOpacity>
          <Text style={s.title}>{t('wallet.title')}</Text>
        </View>
        <View style={s.body}>
          <Text accessibilityRole="alert" style={s.notice}>{t('wallet.loadError')}</Text>
          <TouchableOpacity style={s.payBtn} accessibilityRole="button" onPress={() => { setLoading(true); load() }}>
            <Text style={s.payText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const points = data.points

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <BackIcon size={17} color={colors.ink} />
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
          <View style={s.heroTop}>
            <Text style={s.heroLabel}>{t('wallet.creditBalance')}</Text>
          </View>
          <View style={s.heroAmountRow}>
            <Text style={s.heroAmount} adjustsFontSizeToFit numberOfLines={1}>{points.toLocaleString('fr-FR')}</Text>
            <Text style={s.heroUnit}>XC</Text>
          </View>
          <Text style={s.heroSub}>{t('wallet.creditNotice')}</Text>
          {data.reservedPoints > 0 && <Text style={s.heroSub}>{t('wallet.reservedCredits', { amount: data.reservedPoints })}</Text>}
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

        <View style={s.cashSection}>
          <Text style={s.sectionLabel}>{t('wallet.cashBalance')}</Text>
          <Text testID="wallet-cash-balance" style={s.cashAmount}>{data.cashBalance.toLocaleString('fr-FR')} FCFA</Text>
          <Text style={s.notice}>{t('wallet.cashNotice')}</Text>
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
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPack === p }}
                aria-selected={selectedPack === p}
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
                accessibilityRole="button"
                accessibilityState={{ selected: selectedOp === op.id }}
                aria-selected={selectedOp === op.id}
              >
                <Text style={[s.opText, selectedOp === op.id && s.opTextActive]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[s.payBtn, !onlinePayments && { opacity: 0.5 }]} onPress={onTopup} disabled={topupLoading || !onlinePayments} activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: topupLoading || !onlinePayments }}>
            {topupLoading
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={s.payText}>{onlinePayments
                  ? t('wallet.payBtn', { amount: (selectedPack * (data?.config.fcfaPerPoint || 100)).toLocaleString('fr-FR') })
                  : `${t('wallet.topupSoon')} · ${t('common.soon')}`}</Text>}
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
                  accessibilityRole="button"
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
                      <KindIcon size={16} color={isCredit ? colors.primaryText : colors.textMuted} />
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



export default withScreenBoundary(Wallet, 'Wallet')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    body: { padding: 16, paddingBottom: 32 },
    // Hero
    heroCard: { backgroundColor: colors.primary, borderRadius: 22, padding: 20, paddingBottom: 22, overflow: 'hidden', ...shadows.hero },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 0, color: colors.onPrimary, flexShrink: 1 },
    heroAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
    heroAmount: { fontSize: 36, fontWeight: '800', color: colors.onPrimary, letterSpacing: 0, flexShrink: 1 },
    heroUnit: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    heroStats: { flexDirection: 'row', gap: 8, marginTop: 16 },
    heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
    heroStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    heroStatValue: { fontSize: 16, fontWeight: '700', color: colors.onPrimary, marginTop: 1 },
    heroStatUnit: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
    cashSection: { marginTop: 20, gap: 8 },
    cashAmount: { fontSize: 24, fontWeight: '700', color: colors.ink },
    notice: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
    // Sections
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 4, marginBottom: 10 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase' },
    packRow: { flexDirection: 'row', gap: 10 },
    pack: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
    packActive: { backgroundColor: colors.brandSoft, borderColor: colors.primary },
    packNum: { fontSize: 20, fontWeight: '800', color: colors.ink },
    packNumActive: { color: colors.primaryText },
    packFcfa: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    packFcfaActive: { color: colors.primaryText },
    opRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    op: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    opActive: { backgroundColor: colors.navy },
    opText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    opTextActive: { color: colors.onPrimary },
    payBtn: { backgroundColor: colors.primary, borderRadius: isIOS ? 14 : 999, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    payText: { color: colors.onPrimary, fontWeight: '700', fontSize: 17 },
    // Historique
    historyCard: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    txn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 60 },
    txnBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    txnIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    txnKind: { fontSize: 15, fontWeight: '600', color: colors.ink },
    txnDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
    txnDate: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    txnPointsText: { fontSize: 15, fontWeight: '700' },
    txnPos: { color: colors.primaryText },
    txnNeg: { color: colors.danger },
    // Paiement manuel
    manualCard: { marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
    manualTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
    manualHint: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    manualPhone: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: 1 },
    refBox: { backgroundColor: colors.warningLight, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
    refLabel: { fontSize: 11, color: '#92400E', fontWeight: '600' },
    refValue: { fontSize: 22, fontWeight: '800', color: '#92400E', letterSpacing: 2, marginTop: 2 },
    manualAmount: { fontSize: 18, fontWeight: '800', color: colors.primaryText },
    manualWaitingText: { fontSize: 12, color: colors.warning, fontWeight: '600', textAlign: 'center' },
    waveOpenBtn: { backgroundColor: '#1DC3F0', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, ...shadows.md },
    waveOpenBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
  })
  return { colors, s }
})
