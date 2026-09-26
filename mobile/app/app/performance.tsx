import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { ArrowLeft, CheckCircle2, ThumbsUp, Star, XCircle, Lightbulb } from 'lucide-react-native'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

// Valeurs réelles uniquement (providerStats + avis) — « — » quand la donnée
// n'existe pas encore, jamais de chiffre inventé.
const PERF = (stats: any, reviews: any) => {
  const done = Number(stats.completedMissions || 0)
  const cancelled = Number(stats.cancelledByProvider || 0)
  const base = done + cancelled
  return [
    { icon: CheckCircle2, label: 'Missions terminées', value: String(done) },
    { icon: Star, label: 'Note moyenne', value: reviews?.average ? Number(reviews.average).toFixed(1) : '—' },
    { icon: XCircle, label: "Taux d'annulation", value: base > 0 ? `${Math.round((cancelled / base) * 100)}%` : '—' },
    { icon: ThumbsUp, label: 'Fiabilité', value: typeof stats.reliabilityScore === 'number' ? `${Math.round(stats.reliabilityScore)}%` : '—' },
  ]
}

function Performance() {
  const [data, setData] = useState<any>({ user: { providerStats: {} }, provider: {}, reviews: {} })
  const [earnings, setEarnings] = useState<any>({ chart: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [profile, earn] = await Promise.all([
          apiGet('/api/provider/profile'),
          apiGet('/api/provider/earnings'),
        ])
        setData(profile)
        setEarnings(earn || { chart: [] })
      } catch (e) {
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const stats = data.user?.providerStats || {}
  const score = data.provider?.scoreXeuy || 0
  const chart = earnings.chart || []

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Performances</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroTitle}>Score Xeuy</Text>
              <Text style={s.heroScore}>{score}/100</Text>
            </View>
            <View style={s.circle}>
              <Text style={s.circleText}>{score}%</Text>
            </View>
          </View>
          <Text style={s.heroUpdated}>Mis à jour en temps réel</Text>
        </View>

        <Text style={s.sectionTitle}>Mes indicateurs</Text>
        <View style={s.grid}>
          {PERF(stats, data.reviews).map((p) => {
            const Icon = p.icon
            return (
              <View key={p.label} style={s.box}>
                <Icon size={22} color={colors.primary} />
                <Text style={s.boxValue}>{p.value}</Text>
                <Text style={s.boxLabel}>{p.label}</Text>
              </View>
            )
          })}
        </View>

        <View style={s.revenueCard}>
          <View style={s.revenueTop}>
            <Text style={s.revenueTitle}>Revenus 7 derniers jours</Text>
            <Text style={s.revenueValue}>{(earnings.last7Days || 0).toLocaleString()} FCFA</Text>
          </View>
          <View style={s.barRow}>
            {chart.map((c: any, i: number) => {
              const max = Math.max(1, ...(chart.map((x: any) => x.amount) || []))
              const h = c.amount / max
              return (
                <View key={i} style={s.barTrack}>
                  <View style={[s.barFill, { height: `${h * 100}%` }]} />
                  <Text style={s.barLabel}>{c.date.slice(5)}</Text>
                </View>
              )
            })}
          </View>
          <Text style={s.revenueComp}>{earnings.count || 0} missions · {earnings.total ? earnings.total.toLocaleString() : 0} FCFA au total</Text>
        </View>

        <View style={s.tipCard}>
          <Lightbulb size={20} color={colors.warning} />
          <Text style={s.tipText}>Complétez votre bio et ajoutez des réalisations à votre portfolio pour améliorer votre Score Xeuy.</Text>
        </View>

        <TouchableOpacity style={s.cta} onPress={() => router.push('/profile-detail?section=business')}>
          <Text style={s.ctaText}>Améliorer mon profil</Text>
        </TouchableOpacity>
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
  hero: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  heroScore: { fontSize: 40, fontWeight: '700', color: '#fff', marginTop: spacing.xs },
  heroUpdated: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: spacing.md },
  circle: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  circleText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  box: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.sm },
  boxValue: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  boxLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs },
  revenueCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg, ...shadows.sm },
  revenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  revenueTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  revenueValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: spacing.sm },
  barTrack: { flex: 1, height: '100%', backgroundColor: colors.bgGlobal, borderRadius: radius.pill, marginHorizontal: 4, justifyContent: 'flex-end', overflow: 'hidden', alignItems: 'center' },
  barFill: { backgroundColor: colors.primary, borderRadius: radius.pill, width: '100%' },
  barLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  revenueComp: { fontSize: 13, color: colors.success, textAlign: 'right' },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  tipText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default withScreenBoundary(Performance, 'Performance')
