import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGetRetry, apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { getAuthUser } from '../src/auth'
import { ArrowLeft, Plus, Coins, TrendingUp, TrendingDown, Wallet as WalletIcon } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { hapticSelect, hapticSuccess } from '../src/haptics'

type WalletData = {
  points: number
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
const OPERATORS: Array<{ id: 'wave' | 'orange_money' | 'free_money'; label: string }> = [
  { id: 'wave', label: 'Wave' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'free_money', label: 'Free Money' },
]

const KIND_KEYS: Record<string, string> = {
  welcome: 'wallet.kind_welcome',
  topup: 'wallet.kind_topup',
  mission_spend: 'wallet.kind_mission_spend',
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
  const [selectedOp, setSelectedOp] = useState<'wave' | 'orange_money' | 'free_money'>('wave')
  const [topupLoading, setTopupLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await apiGetRetry('/api/wallet')
      setData(r)
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('wallet.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onTopup = async () => {
    const user = getAuthUser()
    const phone = user?.phone
    if (!phone) {
      Alert.alert(t('wallet.phoneRequired'), t('wallet.phoneRequiredMsg'))
      return
    }
    const amountFcfa = selectedPack * (data?.config.fcfaPerPoint || 100)
    Alert.alert(
      t('wallet.confirmTopup'),
      t('wallet.confirmTopupMsg', { pack: selectedPack, amount: amountFcfa.toLocaleString('fr-FR'), operator: OPERATORS.find(o => o.id === selectedOp)?.label }),
      [
        { text: t('wallet.cancelBtn'), style: 'cancel' },
        {
          text: t('wallet.pay'),
          onPress: async () => {
            setTopupLoading(true)
            try {
              const r: any = await apiPost('/api/wallet/topup', {
                points: selectedPack,
                provider: selectedOp,
                phone,
              })
              if (r?.confirmed) {
                Alert.alert(t('wallet.topupSuccess'), t('wallet.topupSuccessMsg', { pack: selectedPack, balance: r.balance }))
              } else if (r?.checkoutUrl) {
                const supported = await Linking.canOpenURL(r.checkoutUrl)
                if (supported) {
                  await Linking.openURL(r.checkoutUrl)
                } else {
                  Alert.alert(t('wallet.paymentLink'), r.checkoutUrl)
                }
              }
              await load()
            } catch (e: any) {
              Alert.alert(t('wallet.topupFailed'), e?.message || t('wallet.topupFailedMsg'))
            } finally {
              setTopupLoading(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  const isFree = !data?.config.pointsActive

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('wallet.title')}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>{t('wallet.balance')}</Text>
          <Text style={s.balanceValue}>{data?.points ?? 0}</Text>
          <Text style={s.balanceUnit}>{t('wallet.points')}</Text>
          {isFree ? (
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText}>{t('wallet.freeBadgeText')}</Text>
            </View>
          ) : (
            <View style={s.modeBadge}>
              <Text style={s.modeBadgeText}>1 XC = {data?.config.fcfaPerPoint} FCFA</Text>
            </View>
          )}
        </View>

        <View style={s.lifetimeRow}>
          <View style={s.lifetimeCard}>
            <Text style={s.lifetimeNum}>{data?.lifetimePointsEarned ?? 0}</Text>
            <Text style={s.lifetimeLabel}>{t('wallet.earned')}</Text>
          </View>
          <View style={s.lifetimeCard}>
            <Text style={s.lifetimeNum}>{data?.lifetimePointsSpent ?? 0}</Text>
            <Text style={s.lifetimeLabel}>{t('wallet.used')}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('wallet.buyXC')}</Text>
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
            {OPERATORS.map(op => (
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

          <TouchableOpacity style={s.payBtn} onPress={onTopup} disabled={topupLoading} activeOpacity={0.8}>
            {topupLoading
              ? <ActivityIndicator color={colors.surface} />
              : <Text style={s.payText}>{t('wallet.payBtn', { amount: (selectedPack * (data?.config.fcfaPerPoint || 100)).toLocaleString('fr-FR') })}</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('wallet.history')}</Text>
          {(!data?.history || data.history.length === 0) ? (
            <Text style={s.empty}>{t('wallet.noHistory')}</Text>
          ) : (
            data.history.map(txn => (
              <View key={txn.id} style={s.txn}>
                <View style={{ flex: 1 }}>
                  <Text style={s.txnKind}>{t(KIND_KEYS[txn.kind] || txn.kind)}</Text>
                  {!!txn.description && <Text style={s.txnDesc}>{txn.description}</Text>}
                  <Text style={s.txnDate}>{new Date(txn.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={s.txnPoints}>
                  {txn.points >= 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Plus size={14} color={colors.success} />
                      <Text style={[s.txnPointsText, s.txnPos]}>{txn.points}</Text>
                    </View>
                  ) : (
                    <Text style={[s.txnPointsText, s.txnNeg]}>{txn.points}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, ...shadows.sm },
  backIcon: { color: colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  body: { padding: spacing.xl, gap: 18 },
  balanceCard: { backgroundColor: colors.primaryDark, borderRadius: radius.xl, padding: spacing.xxl, alignItems: 'center', gap: 2, ...shadows.md },
  balanceLabel: { color: '#A7F3D0', fontSize: 13, fontWeight: typography.weight.semibold as any },
  balanceValue: { color: colors.surface, fontSize: 48, fontWeight: typography.weight.extrabold as any, letterSpacing: -1 },
  balanceUnit: { color: '#6EE7B7', fontSize: 14, fontWeight: typography.weight.semibold as any },
  freeBadge: { marginTop: spacing.md, backgroundColor: '#064E3B', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: spacing.sm },
  freeBadgeText: { color: '#6EE7B7', fontSize: 12, fontWeight: typography.weight.semibold as any, textAlign: 'center' },
  modeBadge: { marginTop: spacing.md, backgroundColor: '#064E3B', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: spacing.sm },
  modeBadgeText: { color: '#6EE7B7', fontSize: 12, fontWeight: typography.weight.bold as any },
  lifetimeRow: { flexDirection: 'row', gap: spacing.md },
  lifetimeCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  lifetimeNum: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text },
  lifetimeLabel: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, ...shadows.sm },
  sectionTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  packRow: { flexDirection: 'row', gap: 10 },
  pack: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  packActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  packNum: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text },
  packNumActive: { color: colors.success },
  packFcfa: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  packFcfaActive: { color: colors.success },
  opRow: { flexDirection: 'row', gap: spacing.sm },
  op: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border },
  opActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  opText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.textSecondary },
  opTextActive: { color: colors.surface },
  payBtn: { backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', ...shadows.sm },
  payText: { color: colors.surface, fontWeight: typography.weight.extrabold as any, fontSize: 15 },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },
  txn: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.bg },
  txnKind: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text },
  txnDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txnDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txnPoints: { },
  txnPointsText: { fontSize: 16, fontWeight: typography.weight.extrabold as any },
  txnPos: { color: colors.success },
  txnNeg: { color: colors.danger },
})

export default withScreenBoundary(Wallet, 'Wallet')
