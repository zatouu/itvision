import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGetRetry, apiPost } from '../src/api'
import { getAuthUser } from '../src/auth'

type Provider = 'wave' | 'orange_money' | 'free_money'

const PROVIDERS: { id: Provider; label: string; icon: string; color: string }[] = [
  { id: 'wave', label: 'Wave', icon: '🌊', color: '#1DC3F0' },
  { id: 'orange_money', label: 'Orange Money', icon: '🟠', color: '#FF6600' },
  { id: 'free_money', label: 'Free Money', icon: '🟢', color: '#00A651' },
]

type WalletData = {
  points: number
  config: {
    fcfaPerPoint: number
    escrowEnabled?: boolean
    escrowMandatory?: boolean
    escrowCostPoints?: number
  }
}

export default function PaymentScreen() {
  const { offerId, amount } = useLocalSearchParams<{ offerId: string; amount: string; requestId: string }>()
  const [selected, setSelected] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(false)
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [useEscrow, setUseEscrow] = useState(true)
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

  const initiate = async () => {
    if (!selected || !offerId) return
    if (!hasEnoughEscrowPoints) {
      Alert.alert(
        'XC insuffisants',
        `${escrowCost} XC sont requis pour sécuriser ce paiement. Votre solde actuel est de ${wallet?.points || 0} XC.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Recharger', onPress: () => router.push('/wallet') },
        ]
      )
      return
    }
    setLoading(true)
    try {
      const res = await apiPost('/api/payments/initiate', {
        offerId,
        provider: selected,
        clientPhone: user?.phone || '',
        useEscrow: escrowSelected,
      })
      if (res.checkoutUrl) {
        // Open Wave/OM payment page
        const supported = await Linking.canOpenURL(res.checkoutUrl)
        if (supported) {
          await Linking.openURL(res.checkoutUrl)
        } else {
          Alert.alert('Lien de paiement', res.checkoutUrl)
        }
      }
      // In dev mode, payment is instant
      if (res.payment?.status === 'held' || res.payment?.status === 'pending') {
        Alert.alert(
          '✅ Paiement initié',
          escrowSelected
            ? `${Number(amount).toLocaleString('fr-FR')} FCFA en escrow.\nLe prestataire est notifié.`
            : `${Number(amount).toLocaleString('fr-FR')} FCFA payé.\nLe prestataire est notifié.`,
          [{ text: 'OK', onPress: () => router.back() }]
        )
      }
    } catch (e: any) {
      Alert.alert(
        'Erreur',
        e.message || 'Impossible d\'initier le paiement',
        e?.message?.toLowerCase?.().includes('solde points insuffisant')
          ? [{ text: 'Recharger', onPress: () => router.push('/wallet') }, { text: 'OK' }]
          : undefined
      )
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Paiement sécurisé</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={s.body}>
        <View style={s.amountBox}>
          <Text style={s.amountLabel}>Montant</Text>
          <Text style={s.amountValue}>{Number(amount || 0).toLocaleString('fr-FR')} FCFA</Text>
          <Text style={s.escrowHint}>
            {escrowSelected
              ? 'Escrow : l’argent est sécurisé jusqu’à la fin de la mission'
              : 'Paiement direct : pas de frais escrow XC'}
          </Text>
          {!walletLoading && escrowEnabled && !escrowMandatory && (
            <TouchableOpacity
              onPress={() => setUseEscrow(v => !v)}
              style={[s.escrowChoice, escrowSelected && s.escrowChoiceActive]}
              activeOpacity={0.85}
            >
              <View style={[s.checkCircle, escrowSelected && s.checkCircleActive]}>
                {escrowSelected && <Text style={s.checkCircleText}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.escrowChoiceTitle}>Sécuriser avec escrow</Text>
                <Text style={s.escrowChoiceSub}>Optionnel • frais {wallet?.config?.escrowCostPoints || 0} XC</Text>
              </View>
            </TouchableOpacity>
          )}
          {!walletLoading && escrowEnabled && escrowMandatory && (
            <View style={[s.escrowChoice, s.escrowChoiceActive]}>
              <View style={[s.checkCircle, s.checkCircleActive]}>
                <Text style={s.checkCircleText}>✓</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.escrowChoiceTitle}>Escrow obligatoire</Text>
                <Text style={s.escrowChoiceSub}>Frais {wallet?.config?.escrowCostPoints || 0} XC</Text>
              </View>
            </View>
          )}
          <View style={s.escrowRow}>
            <Text style={s.escrowCost}>
              {walletLoading
                ? 'Vérification du wallet...'
                : escrowCost > 0
                  ? `Frais escrow : ${escrowCost} XC • Solde : ${wallet?.points || 0} XC`
                  : escrowEnabled ? 'Escrow non sélectionné' : 'Escrow indisponible'}
            </Text>
            {!walletLoading && !hasEnoughEscrowPoints && (
              <TouchableOpacity onPress={() => router.push('/wallet')} style={s.topupBtn}>
                <Text style={s.topupText}>Recharger</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Text style={s.sectionTitle}>Choisissez votre moyen de paiement</Text>

        {PROVIDERS.map(p => (
          <TouchableOpacity
            key={p.id}
            style={[s.providerCard, selected === p.id && { borderColor: p.color }]}
            onPress={() => setSelected(p.id)}
            activeOpacity={0.8}
          >
            <Text style={s.providerIcon}>{p.icon}</Text>
            <Text style={s.providerLabel}>{p.label}</Text>
            {selected === p.id && <Text style={[s.checkMark, { color: p.color }]}>✓</Text>}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[s.payBtn, (!selected || loading || walletLoading) && s.payBtnDisabled]}
          disabled={!selected || loading || walletLoading}
          onPress={initiate}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.payBtnText}>Payer {Number(amount || 0).toLocaleString('fr-FR')} FCFA</Text>
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
  backIcon: { fontSize: 22, color: '#0F172A' },
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
  checkCircleText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  escrowChoiceTitle: { fontSize: 13, color: '#0F172A', fontWeight: '800' },
  escrowChoiceSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  escrowRow: { marginTop: 8, alignItems: 'center', gap: 8 },
  escrowCost: { fontSize: 12, color: '#0F172A', fontWeight: '700', textAlign: 'center' },
  topupBtn: { backgroundColor: '#DBEAFE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  topupText: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E2E8F0',
  },
  providerIcon: { fontSize: 26 },
  providerLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', flex: 1 },
  checkMark: { fontSize: 22, fontWeight: '700' },
  payBtn: {
    backgroundColor: '#059669', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 'auto',
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
