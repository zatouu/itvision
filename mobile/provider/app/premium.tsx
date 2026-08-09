import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '../src/design'
import { ArrowLeft, Crown, Check, Zap, Eye, TrendingUp, ShieldCheck, Star } from 'lucide-react-native'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const TIERS = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0 FCFA/mois',
    current: true,
    features: ['Profil public', '10 km de visibilité', '5 missions simultanées max'],
    color: colors.textMuted,
  },
  {
    id: 'plus',
    name: 'Xeuy Plus',
    price: '2 900 FCFA/mois',
    current: false,
    features: ['Badge Premium', 'Visibilité x2', 'Rayon 25 km', '12 missions simultanées', 'Support prioritaire'],
    color: colors.warning,
  },
  {
    id: 'pro',
    name: 'Xeuy Pro',
    price: '7 900 FCFA/mois',
    current: false,
    features: ['Badge Pro', 'Priorité absolue', 'Rayon 50 km', 'Missions illimitées', 'Analytics avancées', 'Commission réduite'],
    color: colors.primary,
  },
]

function Premium() {
  const [selected, setSelected] = useState<string>('plus')

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Premium</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Crown size={40} color={colors.warning} />
          <Text style={s.heroTitle}>Boostez votre profil</Text>
          <Text style={s.heroSub}>Gagnez en visibilité, recevez plus de missions et décrochez le badge Premium.</Text>
        </View>

        {TIERS.map((tier) => {
          const active = selected === tier.id
          return (
            <TouchableOpacity key={tier.id} style={[s.card, active && s.cardActive]} onPress={() => setSelected(tier.id)} activeOpacity={0.9}>
              <View style={s.cardTop}>
                <View style={s.cardLeft}>
                  <View style={[s.iconWrap, { backgroundColor: tier.color + '20' }]}>
                    <Crown size={20} color={tier.color} />
                  </View>
                  <View>
                    <Text style={s.cardName}>{tier.name}</Text>
                    <Text style={s.cardPrice}>{tier.price}</Text>
                  </View>
                </View>
                <Switch value={active} trackColor={{ false: colors.border, true: tier.color }} thumbColor="#fff" />
              </View>
              <View style={s.features}>
                {tier.features.map((f, i) => (
                  <View key={i} style={s.featureRow}>
                    <Check size={14} color={active ? tier.color : colors.textMuted} />
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
              {tier.current && <View style={s.currentBadge}><Text style={s.currentText}>Actuel</Text></View>}
            </TouchableOpacity>
          )
        })}

        <TouchableOpacity style={s.cta} onPress={() => {}}>
          <Text style={s.ctaText}>Activer {TIERS.find((t) => t.id === selected)?.name}</Text>
        </TouchableOpacity>
        <Text style={s.note}>Le paiement sera géré dans une prochaine mise à jour. Aucun prélèvement pour le moment.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: 100 },
  hero: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: spacing.md },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  cardActive: { borderWidth: 2, borderColor: colors.primary },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardPrice: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  features: { marginTop: spacing.md, gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontSize: 14, color: colors.text },
  currentBadge: { position: 'absolute', top: spacing.md, right: spacing.lg, backgroundColor: colors.successLight, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  currentText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
})

export default withScreenBoundary(Premium, 'Premium')
