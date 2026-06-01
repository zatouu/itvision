import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl, Linking } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGetRetry, apiPost } from '../src/api'
import { getAuthUser } from '../src/auth'

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

const KIND_LABEL: Record<string, string> = {
  welcome: 'Bienvenue',
  topup: 'Recharge',
  mission_spend: 'Mission',
  referral_bonus: 'Parrainage',
  refund: 'Remboursement',
  escrow_charge: 'Frais escrow',
  escrow_refund: 'Remboursement escrow',
  admin_adjust: 'Ajustement',
}

export default function Wallet() {
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
      Alert.alert('Erreur', e?.message || 'Impossible de charger le wallet')
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
      Alert.alert('Numéro requis', 'Aucun numéro associé à votre compte.')
      return
    }
    const amountFcfa = selectedPack * (data?.config.fcfaPerPoint || 100)
    Alert.alert(
      'Confirmer la recharge',
      `${selectedPack} XC pour ${amountFcfa.toLocaleString('fr-FR')} FCFA via ${OPERATORS.find(o => o.id === selectedOp)?.label}.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: async () => {
            setTopupLoading(true)
            try {
              const r: any = await apiPost('/api/wallet/topup', {
                points: selectedPack,
                provider: selectedOp,
                phone,
              })
              if (r?.confirmed) {
                Alert.alert('Recharge réussie', `${selectedPack} XC crédités. Nouveau solde : ${r.balance} XC.`)
              } else if (r?.checkoutUrl) {
                const supported = await Linking.canOpenURL(r.checkoutUrl)
                if (supported) {
                  await Linking.openURL(r.checkoutUrl)
                } else {
                  Alert.alert('Lien de paiement', r.checkoutUrl)
                }
              }
              await load()
            } catch (e: any) {
              Alert.alert('Échec', e?.message || 'La recharge a échoué')
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
        <ActivityIndicator size="large" color="#0F172A" />
      </SafeAreaView>
    )
  }

  const isFree = !data?.config.pointsActive

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mon portefeuille</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
      >
        <View style={s.balanceCard}>
          <Text style={s.balanceLabel}>Solde XC</Text>
          <Text style={s.balanceValue}>{data?.points ?? 0}</Text>
          <Text style={s.balanceUnit}>Xeuy Coins</Text>
          {isFree ? (
            <View style={s.freeBadge}>
              <Text style={s.freeBadgeText}>Cumulez des XC et gagnez des récompenses</Text>
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
            <Text style={s.lifetimeLabel}>Gagnés</Text>
          </View>
          <View style={s.lifetimeCard}>
            <Text style={s.lifetimeNum}>{data?.lifetimePointsSpent ?? 0}</Text>
            <Text style={s.lifetimeLabel}>Utilisés</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Acheter des XC</Text>
          <View style={s.packRow}>
            {PACKS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.pack, selectedPack === p && s.packActive]}
                onPress={() => setSelectedPack(p)}
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
                onPress={() => setSelectedOp(op.id)}
              >
                <Text style={[s.opText, selectedOp === op.id && s.opTextActive]}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.payBtn} onPress={onTopup} disabled={topupLoading}>
            {topupLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.payText}>Payer {(selectedPack * (data?.config.fcfaPerPoint || 100)).toLocaleString('fr-FR')} FCFA</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Historique</Text>
          {(!data?.history || data.history.length === 0) ? (
            <Text style={s.empty}>Aucun mouvement pour le moment.</Text>
          ) : (
            data.history.map(t => (
              <View key={t.id} style={s.txn}>
                <View style={{ flex: 1 }}>
                  <Text style={s.txnKind}>{KIND_LABEL[t.kind] || t.kind}</Text>
                  {!!t.description && <Text style={s.txnDesc}>{t.description}</Text>}
                  <Text style={s.txnDate}>{new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={[s.txnPoints, t.points >= 0 ? s.txnPos : s.txnNeg]}>
                  {t.points >= 0 ? '+' : ''}{t.points}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { fontSize: 18, color: '#111827' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  body: { padding: 20, gap: 18 },
  balanceCard: { backgroundColor: '#065F46', borderRadius: 18, padding: 24, alignItems: 'center', gap: 2 },
  balanceLabel: { color: '#A7F3D0', fontSize: 13, fontWeight: '600' },
  balanceValue: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: -1 },
  balanceUnit: { color: '#6EE7B7', fontSize: 14, fontWeight: '600' },
  freeBadge: { marginTop: 12, backgroundColor: '#064E3B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  freeBadgeText: { color: '#6EE7B7', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  modeBadge: { marginTop: 12, backgroundColor: '#064E3B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  modeBadgeText: { color: '#6EE7B7', fontSize: 12, fontWeight: '700' },
  lifetimeRow: { flexDirection: 'row', gap: 12 },
  lifetimeCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  lifetimeNum: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  lifetimeLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  packRow: { flexDirection: 'row', gap: 10 },
  pack: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  packActive: { backgroundColor: '#ECFDF5', borderColor: '#059669' },
  packNum: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  packNumActive: { color: '#059669' },
  packFcfa: { fontSize: 11, color: '#64748B', marginTop: 2 },
  packFcfaActive: { color: '#059669' },
  opRow: { flexDirection: 'row', gap: 8 },
  op: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  opActive: { backgroundColor: '#065F46', borderColor: '#065F46' },
  opText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  opTextActive: { color: '#fff' },
  payBtn: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  payText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  empty: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  txn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  txnKind: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txnDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
  txnDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txnPoints: { fontSize: 16, fontWeight: '800' },
  txnPos: { color: '#059669' },
  txnNeg: { color: '#DC2626' },
})
