import { useEffect, useState, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadCategories, getCategoryLabel, getSubCategoryLabel, ServiceCategory, SubCategory } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { ArrowLeft, Search, ChevronRight, HelpCircle } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../src/design'

function AllCategories() {
  const { t, i18n } = useTranslation()
  const [cats, setCats] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadCategories().then(loaded => {
      setCats(loaded)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return cats
    const q = query.toLowerCase()
    return cats.filter(c => {
      const label = getCategoryLabel(c, i18n.language).toLowerCase()
      const fr = (c.label_fr || '').toLowerCase()
      const en = (c.label_en || '').toLowerCase()
      const wo = (c.label_wo || '').toLowerCase()
      return label.includes(q) || fr.includes(q) || en.includes(q) || wo.includes(q) || c.slug.includes(q)
    })
  }, [cats, query, i18n.language])

  const handleSelect = (slug: string) => {
    router.push({ pathname: '/create-request', params: { category: slug } })
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('allCategoriesScreen.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.searchBox}>
        <Search size={18} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('allCategoriesScreen.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {filtered.map(cat => {
            const Icon = getCategoryIcon(cat.slug)
            const label = getCategoryLabel(cat, i18n.language)
            const isOther = cat.slug === 'autre'
            return (
              <View key={cat.slug} style={s.catSection}>
                <TouchableOpacity
                  style={[s.catRow, isOther && s.catRowOther]}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(cat.slug)}
                >
                  <View style={[s.catIcon, { backgroundColor: cat.color }]}>
                    <Icon size={22} color={colors.surface} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.catName}>{label}</Text>
                    {cat.subCategories.length > 0 && (
                      <Text style={s.catSubCount}>{cat.subCategories.length} {t('allCategoriesScreen.subServices')}</Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {cat.subCategories.length > 0 && (
                  <View style={s.subList}>
                    {cat.subCategories.map(sub => (
                      <TouchableOpacity
                        key={sub.slug}
                        style={s.subChip}
                        activeOpacity={0.6}
                        onPress={() => router.push({ pathname: '/create-request', params: { category: cat.slug, subcategory: sub.slug } })}
                      >
                        <Text style={s.subChipText}>{getSubCategoryLabel(sub, i18n.language)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )
          })}
          {filtered.length === 0 && (
            <View style={s.emptyBox}>
              <HelpCircle size={40} color={colors.textMuted} />
              <Text style={s.emptyText}>{t('allCategoriesScreen.noResult')}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, ...shadows.sm },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  catSection: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadows.sm, overflow: 'hidden' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  catRowOther: { borderLeftWidth: 3, borderLeftColor: colors.textMuted },
  catIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text },
  catSubCount: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  subList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  subChip: { backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  subChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
})

export default withScreenBoundary(AllCategories, 'AllCategories')
