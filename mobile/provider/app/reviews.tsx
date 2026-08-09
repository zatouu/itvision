import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '../src/design'
import { ArrowLeft, Star, User, MessageSquare } from 'lucide-react-native'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import EmptyState from '../src/components/EmptyState'
import { useTranslation } from 'react-i18next'

function Reviews() {
  const { t } = useTranslation()
  const [data, setData] = useState<any>({ reviews: [], stats: { average: 0, count: 0 } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const profile: any = await apiGet('/api/provider/profile')
        const providerId = profile.user?._id
        const rev = providerId ? await apiGet(`/api/services/reviews?providerId=${providerId}`) : { reviews: [], stats: { average: 0, count: 0 } }
        setData(rev)
      } catch (e) {
        setData({ reviews: [], stats: { average: 0, count: 0 } })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const rev = data.stats || { average: 0, count: 0 }
  const list = data.reviews || []

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Avis clients</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.summary}>
        <Text style={s.avg}>{rev.average ? rev.average.toFixed(1) : '4.9'}</Text>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={18} color={colors.warning} fill={rev.average && i <= Math.round(rev.average) ? colors.warning : 'transparent'} />)}
        </View>
        <Text style={s.count}>{rev.count || list.length} avis</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {list.length === 0 && !loading ? (
          <EmptyState icon={<MessageSquare size={32} color="#94A3B8" />} title={t('reviews.empty', { defaultValue: 'Aucun avis pour le moment.' })} />
        ) : null}
        {list.map((r: any) => (
          <View key={r._id || r.id} style={s.card}>
            <View style={s.top}>
              <View style={s.avatar}><User size={16} color={colors.textMuted} /></View>
              <View style={s.meta}>
                <Text style={s.client}>Client</Text>
                <Text style={s.mission}>{(r.tags || []).join(' · ') || 'Mission'}</Text>
              </View>
              <View style={s.starsRow}>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={s.rating}>{r.rating}</Text>
              </View>
            </View>
            <Text style={s.comment}>{r.comment || 'Pas de commentaire'}</Text>
            <Text style={s.date}>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</Text>
            <TouchableOpacity style={s.reply}>
              <MessageSquare size={14} color={colors.primary} />
              <Text style={s.replyText}>Répondre</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  summary: { alignItems: 'center', marginBottom: spacing.md },
  avg: { fontSize: 48, fontWeight: '700', color: colors.text },
  stars: { flexDirection: 'row', gap: 2, marginVertical: spacing.xs },
  count: { fontSize: 14, color: colors.textSecondary },
  body: { padding: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgGlobal, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  meta: { flex: 1 },
  client: { fontSize: 16, fontWeight: '600', color: colors.text },
  mission: { fontSize: 13, color: colors.textSecondary },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rating: { fontSize: 14, fontWeight: '600', color: colors.text },
  comment: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.sm },
  date: { fontSize: 12, color: colors.textMuted },
  reply: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, alignSelf: 'flex-start' },
  replyText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40, fontSize: 15 },
})

export default withScreenBoundary(Reviews, 'Reviews')
