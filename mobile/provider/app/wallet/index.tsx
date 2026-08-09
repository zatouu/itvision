import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, RefreshControl, KeyboardAvoidingView, Platform, Image, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StatusChip from '../../src/components/StatusChip'
import { Wallet as WalletIcon, ArrowUpRight, Zap, Minus, Banknote, Check, Info, X, Coins, Clock } from 'lucide-react-native'
import { colors, spacing, radius, shadows, typography } from '../../src/design'
import { apiGet, apiPost, getCreditPacks } from '../../src/api'
import { toast } from '../../src/toast'
import { getAuthUser } from '../../src/auth'

const OPERATORS: Array<{ id: 'wave_qr' | 'wave' | 'orange_money' | 'free_money'; label: string }> = [
  { id: 'wave_qr', label: 'Wave QR' },
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'free_money', label: 'Free Money' },
]

const KIND_META: Record<string, { labelKey: string; icon: any; positive?: boolean }> = {
  topup: { labelKey: 'providerWallet.kindTopup', icon: Zap, positive: true },
  mission_spend: { labelKey: 'providerWallet.kindMission', icon: Minus, positive: false },
  mission_reserve: { labelKey: 'Réservation mission', icon: Minus, positive: false },
  mission_release: { labelKey: 'Libération réservation', icon: Banknote, positive: true },
  unlock_spend: { labelKey: 'providerWallet.kindUnlock', icon: Minus, positive: false },
  unlock_refund: { labelKey: 'providerWallet.kindUnlockRefund', icon: Banknote, positive: true },
  promo: { labelKey: 'providerWallet.kindPromo', icon: Zap, positive: true },
  admin_adjust: { labelKey: 'providerWallet.kindAdjust', icon: Banknote, positive: true },
  refund: { labelKey: 'providerWallet.kindRefund', icon: Banknote, positive: true },
  escrow_refund: { labelKey: 'providerWallet.kindEscrowRefund', icon: Banknote, positive: true },
  escrow_charge: { labelKey: 'providerWallet.kindEscrowCharge', icon: Minus, positive: false },
  withdrawal: { labelKey: 'providerWallet.kindWithdrawal', icon: ArrowUpRight, positive: false },
  welcome: { labelKey: 'Crédits de bienvenue', icon: Zap, positive: true },
  referral_bonus: { labelKey: 'Bonus parrainage', icon: Zap, positive: true },
}

const CASH_KIND_META: Record<string, { label: string; icon: any; positive: boolean }> = {
  escrow_release: { label: 'Paiement mission reçu', icon: Banknote, positive: true },
  payout: { label: 'Retrait', icon: ArrowUpRight, positive: false },
  refund: { label: 'Remboursement', icon: Banknote, positive: true },
  topup: { label: 'Rechargement', icon: Zap, positive: true },
  escrow_hold: { label: 'Fonds bloqués (escrow)', icon: Minus, positive: false },
}

type WalletData = {
  points: number
  reservedPoints: number
  cashBalance: number
  escrow: number
  lifetimePointsEarned: number
  lifetimePointsSpent: number
  history: Array<{
    id: string
    kind: string
    points: number
    balanceAfter: number
    description: string | null
    createdAt: string
  }>
  cashHistory?: Array<{
    id: string
    type: string
    amount: number
    ref: string | null
    createdAt: string
  }>
  config?: {
    credits: {
      unlockEnabled: boolean
      packs: Array<{ id: string; credits: number; bonusCredits: number; priceFcfa: number; popular?: boolean }>
      refundWindowMinutes: number
    }
  }
  profile?: {
    loyaltyTier?: string
    referralBalance?: number
  }
}

export default function Wallet() {
  const { t } = useTranslation()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [operator, setOperator] = useState<'wave_qr' | 'wave' | 'orange_money' | 'free_money'>('wave_qr')
  const [phone, setPhone] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)
  const [packs, setPacks] = useState<Array<{ id: string; credits: number; bonusCredits: number; priceFcfa: number; popular?: boolean }>>([])
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [topupLoading, setTopupLoading] = useState(false)
  const [manualCfg, setManualCfg] = useState<{ waveQrEnabled: boolean; waveMerchantPhone: string; waveQrUrl: string; wavePayUrl: string } | null>(null)
  const [manualPending, setManualPending] = useState<{ reference: string; amount: number } | null>(null)
  const format = (n: number) => n.toLocaleString('fr-FR').replace(/\s/g, ' ')

  const load = useCallback(async () => {
    try {
      const r = await apiGet('/api/wallet')
      setData(r)
    } catch (e: any) {
      toast.error(t('common.error'), e?.message || t('providerWallet.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    load()
    apiGet('/api/payments/manual-config')
      .then(r => { if (r?.success) setManualCfg({ waveQrEnabled: !!r.waveQrEnabled, waveMerchantPhone: r.waveMerchantPhone || '', waveQrUrl: r.waveQrUrl || '', wavePayUrl: r.wavePayUrl || '' }) })
      .catch(() => {})
  }, [load])

  const openTopup = async () => {
    setTopupOpen(true)
    try {
      const r = await getCreditPacks()
      setPacks(r.packs || [])
      if (r.packs?.length && !selectedPackId) setSelectedPackId(r.packs[0].id)
    } catch {}
  }

  const buyPack = async () => {
    if (!selectedPackId) return
    setTopupLoading(true)
    try {
      const user = getAuthUser()
      const r: any = await apiPost('/api/wallet/topup', {
        packId: selectedPackId,
        provider: operator,
        phone: phone.trim() || user?.phone || '',
      })
      if (r?.confirmed) {
        toast.success(t('providerWallet.topupSuccess'), t('providerWallet.topupSuccessMsg', { pack: r.totalCredits || r.points, balance: r.balance }))
        setTopupOpen(false)
        setSelectedPackId(null)
        await load()
      } else if (r?.manualConfirm && r?.reference) {
        setManualPending({ reference: r.reference, amount: r.amountFcfa })
      } else if (r?.checkoutUrl) {
        toast.info(t('providerWallet.paymentLink'), r.checkoutUrl)
      } else {
        toast.error(t('providerWallet.topupFailed'), r?.error || t('providerWallet.topupFailedMsg'))
      }
    } catch (e: any) {
      toast.error(t('providerWallet.topupFailed'), e?.message || t('providerWallet.topupFailedMsg'))
    } finally {
      setTopupLoading(false)
    }
  }

  const onWithdraw = async () => {
    const user = getAuthUser()
    const userPhone = user?.phone
    const numeric = Number(amount.replace(/\s/g, ''))
    if (!Number.isFinite(numeric) || numeric < 1000) {
      toast.info(t('providerWallet.invalidAmount'), t('providerWallet.minAmount'))
      return
    }
    if (!phone.trim() || phone.trim().length < 8) {
      toast.info(t('providerWallet.invalidPhone'), t('providerWallet.phoneRequired'))
      return
    }
    setWithdrawLoading(true)
    try {
      const r: any = await apiPost('/api/wallet/withdraw', {
        amount: numeric,
        method: operator,
        phone: phone.trim() || userPhone,
      })
      if (r?.success) {
        toast.success(t('providerWallet.withdrawSuccess'), t('providerWallet.withdrawSuccessMsg', { amount: format(numeric) }))
        setWithdrawOpen(false)
        setAmount('')
        setPhone('')
        await load()
      } else {
        toast.error(t('providerWallet.withdrawFailed'), r?.error || t('providerWallet.withdrawFailedMsg'))
      }
    } catch (e: any) {
      toast.error(t('providerWallet.withdrawFailed'), e?.message || t('providerWallet.withdrawFailedMsg'))
    } finally {
      setWithdrawLoading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  const balance = data?.cashBalance ?? 0
  const escrow = data?.escrow ?? 0
  const credits = data?.points ?? 0
  const reserved = data?.reservedPoints ?? 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('providerWallet.title')} showBell onBell={() => {}} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        <View style={s.balanceCard}>
          <View style={s.balanceHeader}>
            <View>
              <Text style={s.balanceLabel}>{t('providerWallet.available')}</Text>
              <Text style={s.balanceValue}>{format(balance)} <Text style={s.currency}>FCFA</Text></Text>
              <Text style={s.balanceSub}>{t('providerWallet.escrow', { amount: format(escrow) })}</Text>
            </View>
            <View style={s.walletIcon}>
              <WalletIcon size={28} color={colors.surface} />
            </View>
          </View>
          <View style={s.statusPill}>
            <Check size={14} color={colors.surface} />
            <Text style={s.statusPillText}>{t('providerWallet.activeAccount')}</Text>
          </View>
        </View>

        <View style={s.creditsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={s.creditsIconWrap}>
              <Coins size={24} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.creditsLabel}>{t('providerWallet.creditsBalance')}</Text>
              <Text style={s.creditsValue}>{credits} <Text style={s.creditsUnit}>crédits</Text></Text>
              {reserved > 0 && <Text style={s.creditsReserved}>{reserved} crédits réservés</Text>}
              <Text style={s.creditsSub}>{t('providerWallet.creditsSub')}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.buyCreditsBtn} activeOpacity={0.85} onPress={openTopup}>
            <Text style={s.buyCreditsText}>{t('providerWallet.buyCredits')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.withdrawBtn} activeOpacity={0.85} onPress={() => setWithdrawOpen(true)}>
          <ArrowUpRight size={18} color={colors.surface} />
          <Text style={s.withdrawText}>{t('providerWallet.withdraw')}</Text>
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>{t('providerWallet.recentHistory')}</Text>
        </View>

        <View style={s.historyList}>
          {(() => {
            const cashRows = (data?.cashHistory || []).map(txn => {
              const meta = CASH_KIND_META[txn.type] || { label: txn.type, icon: Banknote, positive: txn.amount >= 0 }
              return {
                id: `cash-${txn.id}`,
                label: meta.label,
                description: txn.ref ? `Réf. ${txn.ref}` : null,
                amountText: `${meta.positive ? '+' : '-'}${format(Math.abs(txn.amount))} FCFA`,
                positive: meta.positive,
                icon: meta.icon,
                createdAt: txn.createdAt,
              }
            })
            const creditRows = (data?.history || []).map(item => {
              const meta = KIND_META[item.kind] || { labelKey: item.kind, icon: Banknote }
              const positive = meta.positive ?? item.points >= 0
              return {
                id: `credit-${item.id}`,
                label: t(meta.labelKey),
                description: item.description || null,
                amountText: `${positive ? '+' : ''}${format(item.points)} crédits`,
                positive,
                icon: meta.icon,
                createdAt: item.createdAt,
              }
            })
            const rows = [...cashRows, ...creditRows]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 50)
            if (rows.length === 0) {
              return (
                <View style={s.emptyRow}>
                  <Text style={s.emptyText}>{t('providerWallet.noHistory')}</Text>
                </View>
              )
            }
            return rows.map((row) => {
              const Icon = row.icon
              return (
                <View key={row.id} style={s.historyRow}>
                  <View style={[s.historyIcon, !row.positive && s.historyIconRed]}>
                    <Icon size={18} color={row.positive ? colors.success : colors.danger} />
                  </View>
                  <View style={s.historyText}>
                    <Text style={s.historyLabel}>{row.label}</Text>
                    {!!row.description && <Text style={s.historyDesc}>{row.description}</Text>}
                    <Text style={s.historyDate}>{new Date(row.createdAt).toLocaleDateString('fr-FR')}</Text>
                  </View>
                  <View style={s.historyRight}>
                    <Text style={[s.historyAmount, !row.positive && s.historyAmountRed]}>
                      {row.amountText}
                    </Text>
                    <StatusChip
                      label={row.positive ? t('providerWallet.credit') : t('providerWallet.debit')}
                      variant={row.positive ? 'success' : 'danger'}
                      small
                    />
                  </View>
                </View>
              )
            })
          })()}
        </View>

        <View style={s.infoCard}>
          <Info size={18} color={colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>{t('providerWallet.transferInfo')}</Text>
            <Text style={s.infoText}>{t('providerWallet.transferInfoSub')}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={topupOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('providerWallet.buyCredits')}</Text>
              <TouchableOpacity onPress={() => { setTopupOpen(false); setManualPending(null) }}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {!manualPending && <>
            <Text style={s.modalLabel}>{t('providerWallet.choosePack')}</Text>
            <View style={s.packsGrid}>
              {packs.length === 0 && <ActivityIndicator color={colors.primary} />}
              {packs.map(pack => {
                const selected = selectedPackId === pack.id
                const total = pack.credits + (pack.bonusCredits || 0)
                return (
                  <TouchableOpacity key={pack.id} style={[s.packCard, selected && s.packCardActive]} onPress={() => setSelectedPackId(pack.id)}>
                    {pack.popular && <View style={s.popularBadge}><Text style={s.popularText}>{t('providerWallet.popular')}</Text></View>}
                    <Text style={s.packCredits}>{total} <Text style={s.packCreditsUnit}>crédits</Text></Text>
                    {pack.bonusCredits ? <Text style={s.packBonus}>+{pack.bonusCredits} bonus</Text> : null}
                    <Text style={s.packPrice}>{format(pack.priceFcfa)} FCFA</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <Text style={s.modalLabel}>{t('providerWallet.operator')}</Text>
            <View style={s.opRow}>
              {OPERATORS.filter(op => op.id !== 'wave_qr' || manualCfg?.waveQrEnabled).map(op => (
                <TouchableOpacity key={op.id} style={[s.op, operator === op.id && s.opActive]} onPress={() => setOperator(op.id)}>
                  <Text style={[s.opText, operator === op.id && s.opTextActive]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.modalLabel}>{t('providerWallet.phone')}</Text>
            <TextInput
              style={s.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('providerWallet.phonePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            </>}
            {manualPending && (
              <View style={s.manualCard}>
                <Text style={s.manualTitle}>{t('providerWallet.waveQrTitle', { defaultValue: 'Payer par Wave' })}</Text>
                <Text style={s.manualHint}>{t('providerWallet.waveQrInstructions', { defaultValue: 'Scannez le QR boutique avec Wave (ou envoyez au numéro ci-dessous) en indiquant la référence, puis attendez la confirmation.' })}</Text>
                {manualCfg?.waveQrUrl ? (
                  <Image source={{ uri: manualCfg.waveQrUrl }} style={{ width: 180, height: 180, borderRadius: 8, alignSelf: 'center' }} resizeMode="contain" />
                ) : null}
                {!!manualCfg?.waveMerchantPhone && <Text style={s.manualPhone}>{manualCfg.waveMerchantPhone}</Text>}
                <View style={s.refBox}>
                  <Text style={s.refLabel}>{t('providerWallet.waveQrRef', { defaultValue: 'Référence à indiquer' })}</Text>
                  <Text style={s.refValue}>{manualPending.reference}</Text>
                </View>
                <Text style={s.manualAmount}>{format(manualPending.amount)} FCFA</Text>
                {manualCfg?.wavePayUrl ? (
                  <TouchableOpacity
                    style={s.waveOpenBtn}
                    onPress={() => {
                      const sep = manualCfg.wavePayUrl.includes('?') ? '&' : '?'
                      Linking.openURL(`${manualCfg.wavePayUrl}${sep}amount=${manualPending.amount}`)
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={s.waveOpenBtnText}>{t('providerWallet.waveQrOpen', { defaultValue: `Ouvrir Wave — ${format(manualPending.amount)} FCFA` })}</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={s.manualWaiting}>
                  <Clock size={16} color={colors.warning} />
                  <Text style={s.manualWaitingText}>{t('providerWallet.waveQrWaiting', { defaultValue: 'Vos crédits seront ajoutés après confirmation par la boutique.' })}</Text>
                </View>
              </View>
            )}
            {!manualPending && (
              <TouchableOpacity style={[s.modalBtn, !selectedPackId && s.modalBtnDisabled]} onPress={buyPack} disabled={!selectedPackId || topupLoading}>
                {topupLoading ? <ActivityIndicator color={colors.surface} /> : <Text style={s.modalBtnText}>{t('providerWallet.pay')}</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={withdrawOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('providerWallet.withdraw')}</Text>
              <TouchableOpacity onPress={() => setWithdrawOpen(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={s.modalLabel}>{t('providerWallet.amount')}</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder={t('providerWallet.amountPlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={s.modalLabel}>{t('providerWallet.operator')}</Text>
            <View style={s.opRow}>
              {OPERATORS.map(op => (
                <TouchableOpacity
                  key={op.id}
                  style={[s.op, operator === op.id && s.opActive]}
                  onPress={() => setOperator(op.id)}
                >
                  <Text style={[s.opText, operator === op.id && s.opTextActive]}>{op.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.modalLabel}>{t('providerWallet.phone')}</Text>
            <TextInput
              style={s.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('providerWallet.phonePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={s.modalBtn} onPress={onWithdraw} disabled={withdrawLoading}>
              {withdrawLoading
                ? <ActivityIndicator color={colors.surface} />
                : <Text style={s.modalBtnText}>{t('providerWallet.confirmWithdraw')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: { fontSize: typography.sm.fontSize, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.xs },
  balanceValue: { fontSize: 40, fontWeight: typography.weight.extrabold as any, color: colors.surface, letterSpacing: -1 },
  currency: { fontSize: typography.md.fontSize, fontWeight: typography.weight.bold as any },
  balanceSub: { fontSize: typography.sm.fontSize, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  walletIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statusPillText: { fontSize: typography.sm.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  withdrawBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  withdrawText: { fontSize: typography.md.fontSize, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  creditsCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  creditsIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E6F4EC', alignItems: 'center', justifyContent: 'center' },
  creditsLabel: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginBottom: 2 },
  creditsValue: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.text },
  creditsUnit: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.bold as any, color: colors.textSecondary },
  creditsSub: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginTop: 2 },
  creditsReserved: { fontSize: typography.xs.fontSize, color: colors.warning, marginTop: 2, fontWeight: typography.weight.bold as any },
  buyCreditsBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 10, alignItems: 'center', marginTop: spacing.md },
  buyCreditsText: { color: '#fff', fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  historyList: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconRed: { backgroundColor: colors.dangerLight },
  historyText: { flex: 1, gap: 2 },
  historyLabel: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  historyDesc: { fontSize: typography.xs.fontSize, color: colors.textSecondary, marginTop: 2 },
  historyDate: { fontSize: typography.xs.fontSize, color: colors.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.success },
  historyAmountRed: { color: colors.danger },
  emptyRow: { padding: spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: typography.sm.fontSize, color: colors.textMuted },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.infoLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoTitle: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.info },
  infoText: { fontSize: typography.sm.fontSize, color: colors.info, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalLabel: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.base.fontSize,
    color: colors.text,
  },
  opRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  op: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  opActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  opText: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.bold as any, color: colors.text },
  opTextActive: { color: colors.surface },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalBtnText: { color: colors.surface, fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any },
  modalBtnDisabled: { backgroundColor: '#CBD5E1' },
  packsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  packCard: { width: '47%', backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center' },
  packCardActive: { borderColor: colors.primary, backgroundColor: '#EFF6FF' },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  popularText: { color: colors.surface, fontSize: 10, fontWeight: typography.weight.extrabold as any },
  packCredits: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text },
  packCreditsUnit: { fontSize: 12, color: colors.textSecondary },
  packBonus: { fontSize: 11, color: colors.success, fontWeight: typography.weight.extrabold as any, marginTop: 2 },
  packPrice: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.primary, marginTop: 6 },
  manualCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  manualTitle: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  manualHint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  manualPhone: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: 1 },
  refBox: { backgroundColor: colors.warningLight, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.warning },
  refLabel: { fontSize: 11, color: '#92400E', fontWeight: typography.weight.semibold as any },
  refValue: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: '#92400E', letterSpacing: 2, marginTop: 2 },
  manualAmount: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  manualWaiting: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manualWaitingText: { fontSize: 12, color: colors.warning, fontWeight: typography.weight.semibold as any, flex: 1 },
  waveOpenBtn: { backgroundColor: '#1DC3F0', borderRadius: radius.lg, paddingHorizontal: 24, paddingVertical: 12, ...shadows.md },
  waveOpenBtnText: { color: '#fff', fontSize: 14, fontWeight: typography.weight.extrabold as any },
})
