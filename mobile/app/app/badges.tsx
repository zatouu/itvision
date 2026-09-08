import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '../src/design'
import { ArrowLeft, Award, ShieldCheck, Star, Zap, Crown, TrendingUp, Clock, CheckCircle2, Lock } from 'lucide-react-native'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const BADGES: any[] = [
  { id: 'kyc', icon: ShieldCheck, label: 'Identité vérifiée', desc: 'KYC approuvé par l\'équipe', color: colors.primary },
  { id: 'first', icon: CheckCircle2, label: 'Première mission', desc: 'Vous avez complété une mission', color: colors.success },
  { id: 'rating', icon: Star, label: '5 étoiles', desc: 'Moyenne d\'au moins 4.8 sur 5 avis', color: colors.warning },
  { id: 'fast', icon: Zap, label: 'Réactif', desc: 'Temps de réponse moyen < 15 min', color: colors.info },
  { id: 'top', icon: Crown, label: 'Top 5%', desc: 'Score Xeuy supérieur à 85', color: colors.platinum },
  { id: 'missions', icon: TrendingUp, label: '100 missions', desc: '100 missions terminées', color: colors.painting },
]

function Badges() {
  const [profile, setProfile] = useState<any>({})
  const [earnings, setEarnings] = useState<any>({})
  const [reviews, setReviews] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const p = await apiGet('/api/provider/profile')
        setProfile(p || {})
        const providerId = p?.user?._id
        const [e, r] = await Promise.all([
          apiGet('/api/provider/earnings'),
          providerId ? apiGet(`/api/services/reviews?providerId=${providerId}`).catch(() => ({ stats: {} })) : { stats: {} },
        ])
        setEarnings(e || {})
        setReviews(r || {})
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  const provider = profile.provider || {}
  const user = profile.user || {}
  const score = provider.scoreXeuy || 0
  const kyc = user.kycVerified || provider.kycVerified
  const count = earnings.count || 0
  const avg = reviews.stats?.average || 0
  const ratingCount = reviews.stats?.count || 0
  const resp = user.providerStats?.responseTimeMinutes || 30

  const unlocked: Record<string, boolean> = {
    kyc: Boolean(kyc),
    first: count >= 1,
    rating: avg >= 4.8 && ratingCount >= 5,
    fast: resp < 15,
    top: score >= 85,
    missions: count >= 100,
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Badges</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.hero}>
        <Award size={32} color={colors.warning} />
        <Text style={s.heroScore}>{Object.values(unlocked).filter(Boolean).length}/{BADGES.length}</Text>
        <Text style={s.heroSub}>badges débloqués</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.grid}>
          {BADGES.map((b) => {
            const Icon = b.icon
            const active = unlocked[b.id]
            return (
              <View key={b.id} style={[s.card, active ? s.cardActive : s.cardLocked]}>
                <View style={[s.iconWrap, { backgroundColor: active ? b.color + '20' : colors.border }]}>
                  <Icon size={24} color={active ? b.color : colors.textMuted} />
                </View>
                <Text style={[s.label, active ? s.labelActive : s.labelLocked]}>{b.label}</Text>
                <Text style={s.desc}>{b.desc}</Text>
                {active ? <CheckCircle2 size={16} color={colors.success} /> : <Lock size={16} color={colors.textMuted} />}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  hero: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, margin: spacing.lg, marginTop: 0, alignItems: 'center', ...shadows.sm },
  heroScore: { fontSize: 40, fontWeight: '700', color: '#fff', marginTop: spacing.sm },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  body: { padding: spacing.lg, paddingTop: 0, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', ...shadows.sm },
  cardActive: { borderWidth: 2, borderColor: colors.success },
  cardLocked: { opacity: 0.7 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  labelActive: { color: colors.text },
  labelLocked: { color: colors.textSecondary },
  desc: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
})

export default withScreenBoundary(Badges, 'Badges')
