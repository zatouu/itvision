import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Image, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { ArrowLeft, Plus, Image as ImageIcon, Heart, ChevronRight } from 'lucide-react-native'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import EmptyState from '../src/components/EmptyState'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl } from '../src/media'

const TABS = [
  { id: 'realisation', label: 'Réalisations' },
  { id: 'certification', label: 'Certifications' },
  { id: 'diplome', label: 'Diplômes' },
]

function Portfolio() {
  const { t } = useTranslation()
  const [active, setActive] = useState('realisation')
  const [data, setData] = useState<any>({ featured: null, items: [], counts: {} })
  const [loading, setLoading] = useState(true)
  const width = Dimensions.get('window').width
  const itemW = (width - 72) / 2

  useEffect(() => {
    apiGet('/api/provider/portfolio')
      .then(setData)
      .catch(() => setData({ featured: null, items: [], counts: {} }))
      .finally(() => setLoading(false))
  }, [])

  const list = (data.items || []).filter((i: any) => i.type === active)
  const tabs = TABS.map((t) => ({ ...t, count: data.counts?.[t.id] || 0 }))
  const featured = data.featured

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Portfolio</Text>
        <TouchableOpacity style={s.editBtn}>
          <Text style={s.editText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.introCard}>
          <Text style={s.introTitle}>Vos réalisations, certifications et diplômes</Text>
          <Text style={s.introDesc}>Montrez vos travaux pour rassurer les clients et améliorer votre Score Xeuy.</Text>
        </View>

        <View style={s.tabs}>
          {tabs.map((t) => (
            <TouchableOpacity key={t.id} onPress={() => setActive(t.id)} style={[s.tab, active === t.id && s.tabActive]}>
              <Text style={[s.tabLabel, active === t.id && s.tabLabelActive]} numberOfLines={1} ellipsizeMode="tail">{t.label} ({t.count})</Text>
            </TouchableOpacity>
          ))}
        </View>

        {featured ? (
          <>
            <Text style={s.sectionLabel}>Mise en avant</Text>
            <TouchableOpacity style={[s.featured, { width: width - 48 }]}>
              {featured.images?.[0]?.url ? (
                <Image source={{ uri: resolveMediaUrl(featured.images[0].url) }} style={{ width: width - 48, height: 180 }} resizeMode="cover" />
              ) : (
                <View style={[s.featuredThumb, { width: width - 48, height: 180 }]}>
                  <ImageIcon size={40} color={colors.textMuted} />
                </View>
              )}
              <View style={s.featuredOverlay}>
                <View style={s.featuredTop}>
                  <View style={s.loveBadge}>
                    <Heart size={12} color={colors.danger} fill={colors.danger} />
                    <Text style={s.loveText}>Coup de cœur</Text>
                  </View>
                  <Text style={s.featuredDate}>{featured.category || 'Portfolio'}</Text>
                </View>
                <Text style={s.featuredTitle}>{featured.title}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : null}

        <View style={s.grid}>
          {list.length === 0 && !loading ? (
            <EmptyState icon={<ImageIcon size={32} color={colors.textMuted} />} title={t('portfolio.emptyCategory', { defaultValue: 'Aucun élément dans cette catégorie.' })} />
          ) : null}
          {list.map((item: any) => {
            const thumb = item.images?.[0]?.url
            const year = item.createdAt ? new Date(item.createdAt).getFullYear() : '—'
            return (
              <View key={item._id || item.id} style={[s.card, { width: itemW }]}>
                {thumb ? (
                  <Image source={{ uri: resolveMediaUrl(thumb) }} style={[s.thumb, { width: itemW - 24, height: itemW - 24 }]} resizeMode="cover" />
                ) : (
                  <View style={[s.thumb, { width: itemW - 24, height: itemW - 24 }]}>
                    <ImageIcon size={28} color={colors.textMuted} />
                  </View>
                )}
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardYear}>{year} · {item.images?.length || 0} photo(s)</Text>
              </View>
            )
          })}
          <TouchableOpacity style={[s.card, s.addCard, { width: itemW, height: itemW }]} onPress={() => router.push('/portfolio-add')}>
            <Plus size={28} color={colors.primary} />
            <Text style={s.addText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/portfolio-add')}>
          <Plus size={18} color={colors.surface} />
          <Text style={s.btnPrimaryText}>Ajouter une réalisation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  editBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.bg },
  editText: { color: colors.primary, fontWeight: '600' },
  body: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  introCard: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  introTitle: { fontSize: 18, fontWeight: '600', color: colors.surface, marginBottom: spacing.xs },
  introDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  tabs: { flexDirection: 'row', paddingBottom: spacing.md, gap: spacing.sm },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  tabLabelActive: { color: colors.surface },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  featured: { borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.lg, ...shadows.md },
  featuredThumb: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  featuredOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.45)' },
  featuredTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  loveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  loveText: { fontSize: 11, color: colors.danger, fontWeight: '600' },
  featuredDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  featuredTitle: { fontSize: 18, fontWeight: '600', color: colors.surface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadows.sm },
  thumb: { borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  cardYear: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  empty: { width: '100%', color: colors.textSecondary, fontSize: 14, marginBottom: spacing.md, textAlign: 'center' },
  addCard: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 13, color: colors.primary, marginTop: spacing.xs, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md },
  btnPrimaryText: { color: colors.surface, fontWeight: '600', fontSize: 16 },
})

export default withScreenBoundary(Portfolio, 'Portfolio')
