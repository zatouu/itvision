import { createThemedStyles } from '../src/theme'
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { spacing, radius, typography, shadows, getCategoryMeta } from '../src/design'
import { CheckCircle2, ThumbsUp, Star, XCircle, Lightbulb, ChevronRight } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { useTranslation } from 'react-i18next'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

// Valeurs réelles uniquement (providerStats + avis) — « — » quand la donnée
// n'existe pas encore, jamais de chiffre inventé.
const PERF = (stats: any, reviews: any) => {
  const done = Number(stats.completedMissions || 0)
  const cancelled = Number(stats.cancelledByProvider || 0)
  const base = done + cancelled
  return [
    { icon: CheckCircle2, labelKey: 'performanceScreen.completedMissions', value: String(done) },
    { icon: Star, labelKey: 'performanceScreen.averageRating', value: reviews?.average ? Number(reviews.average).toFixed(1) : '—' },
    { icon: XCircle, labelKey: 'performanceScreen.cancellationRate', value: base > 0 ? `${Math.round((cancelled / base) * 100)}%` : '—' },
    { icon: ThumbsUp, labelKey: 'performanceScreen.reliability', value: typeof stats.reliabilityScore === 'number' ? `${Math.round(stats.reliabilityScore)}%` : '—' },
  ]
}

function Performance() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
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

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primaryText} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <BackIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('performanceScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroTitle}>{t('performanceScreen.scoreXeuy')}</Text>
              <Text style={s.heroScore}>{score}/100</Text>
            </View>
            <View style={s.circle}>
              <Text style={s.circleText}>{score}%</Text>
            </View>
          </View>
          <Text style={s.heroUpdated}>{t('performanceScreen.realtimeUpdate')}</Text>
        </View>

        <Text style={s.sectionTitle}>{t('performanceScreen.myIndicators')}</Text>
        <View style={s.grid}>
          {PERF(stats, data.reviews).map((p) => {
            const Icon = p.icon
            return (
              <View key={p.labelKey} style={s.box}>
                <Icon size={22} color={colors.primaryText} />
                <Text style={s.boxValue}>{p.value}</Text>
                <Text style={s.boxLabel}>{t(p.labelKey)}</Text>
              </View>
            )
          })}
        </View>

        <View style={s.revenueCard}>
          <View style={s.revenueTop}>
            <Text style={s.revenueTitle}>{t('performanceScreen.last7DaysRevenue')}</Text>
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
          <Text style={s.revenueComp}>{t('performanceScreen.missionCount', { count: earnings.count || 0 })} · {t('performanceScreen.totalAmount', { amount: earnings.total ? earnings.total.toLocaleString() : 0 })}</Text>
        </View>

        <View style={s.revenueCard}>
          <Text style={[s.revenueTitle, { marginBottom: spacing.sm }]}>{t('providerWallet.latestMissions')}</Text>
          {(earnings.latest || []).length === 0 ? (
            <Text style={s.boxLabel}>{t('providerWallet.noLatestMissions')}</Text>
          ) : (earnings.latest as Array<{ requestId: string; category: string; amount: number; completedAt: string }>).map(m => (
            <TouchableOpacity
              key={m.requestId}
              style={s.latestRow}
              onPress={() => router.push(`/mission-completed/${m.requestId}`)}
              accessibilityRole="button"
            >
              <View style={{ flex: 1 }}>
                <Text style={s.latestCat}>{getCategoryMeta(m.category).label}</Text>
                <Text style={s.barLabel}>{new Date(m.completedAt).toLocaleDateString('fr-FR')}</Text>
              </View>
              <Text style={s.latestAmount}>{Number(m.amount).toLocaleString('fr-FR')} F</Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.tipCard}>
          <Lightbulb size={20} color={colors.warning} />
          <Text style={s.tipText}>{t('performanceScreen.tip')}</Text>
        </View>

        <TouchableOpacity style={s.cta} onPress={() => router.push('/profile-detail?section=business')}>
          <Text style={s.ctaText}>{t('performanceScreen.improveProfile')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(Performance, 'Performance')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
    back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '600', color: colors.text },
    body: { padding: spacing.lg, paddingBottom: 100 },
    hero: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heroTitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
    heroScore: { fontSize: 40, fontWeight: '700', color: colors.onPrimary, marginTop: spacing.xs },
    heroUpdated: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: spacing.md },
    circle: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: colors.success, alignItems: 'center', justifyContent: 'center' },
    circleText: { fontSize: 20, fontWeight: '700', color: colors.onPrimary },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    box: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...shadows.sm },
    boxValue: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
    boxLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.xs },
    revenueCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginTop: spacing.lg, ...shadows.sm },
    revenueTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    revenueTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    revenueValue: { fontSize: 20, fontWeight: '700', color: colors.primaryText },
    barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100, marginBottom: spacing.sm },
    barTrack: { flex: 1, height: '100%', backgroundColor: colors.bgGlobal, borderRadius: radius.pill, marginHorizontal: 4, justifyContent: 'flex-end', overflow: 'hidden', alignItems: 'center' },
    barFill: { backgroundColor: colors.primary, borderRadius: radius.pill, width: '100%' },
    barLabel: { fontSize: 9, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    revenueComp: { fontSize: 13, color: colors.success, textAlign: 'right' },
    latestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.bgGlobal },
    latestCat: { fontSize: 14, fontWeight: '600', color: colors.text },
    latestAmount: { fontSize: 14, fontWeight: '700', color: colors.primaryText },
    tipCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
    tipText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
    cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
    ctaText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  })
  return { colors, s }
})
