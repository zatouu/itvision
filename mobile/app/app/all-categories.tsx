import { useEffect, useState, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { loadCategories, getCategoryLabel, getSubCategoryLabel, ServiceCategory, SubCategory } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { ArrowLeft, Search, HelpCircle } from 'lucide-react-native'
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
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={18} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('allCategoriesScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchBox}>
        <Search size={17} color={colors.textMuted} />
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
          <Text style={s.groupLabel}>{t('allCategoriesScreen.services', { defaultValue: 'Services' })}</Text>
          <View style={s.grid}>
            {filtered.map(cat => {
              const Icon = getCategoryIcon(cat.slug)
              const label = getCategoryLabel(cat, i18n.language)
              return (
                <TouchableOpacity
                  key={cat.slug}
                  style={s.catCard}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(cat.slug)}
                >
                  <View style={[s.catIcon, { backgroundColor: cat.color }]}>
                    <Icon size={19} color="#fff" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.catName} numberOfLines={1}>{label}</Text>
                    <Text style={s.catSubCount} numberOfLines={1}>
                      {cat.subCategories.length > 0
                        ? `${cat.subCategories.length} ${t('allCategoriesScreen.subServices')}`
                        : t('allCategoriesScreen.service', { defaultValue: 'service' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
          {/* Sous-services — accès direct */}
          {filtered.filter(c => c.subCategories.length > 0).map(cat => {
            const Icon = getCategoryIcon(cat.slug)
            return (
              <View key={`sub-${cat.slug}`} style={{ marginTop: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 4, marginBottom: 8 }}>
                  <View style={[s.miniIcon, { backgroundColor: cat.color }]}>
                    <Icon size={12} color="#fff" />
                  </View>
                  <Text style={s.groupLabelSm}>{getCategoryLabel(cat, i18n.language)}</Text>
                </View>
                <View style={s.subList}>
                  {cat.subCategories.map(sub => (
                    <TouchableOpacity
                      key={sub.slug}
                      style={s.subChip}
                      activeOpacity={0.65}
                      onPress={() => router.push({ pathname: '/create-request', params: { category: cat.slug, subcategory: sub.slug } })}
                    >
                      <Text style={s.subChipText}>{getSubCategoryLabel(sub, i18n.language)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, marginBottom: 4, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text, padding: 0 },
  body: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginHorizontal: 4, marginBottom: 10 },
  groupLabelSm: { fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  miniIcon: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  catIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName: { fontSize: 13, fontWeight: '800', color: colors.ink },
  catSubCount: { fontSize: 10.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  subList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  subChip: { backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.borderSoft },
  subChipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
})

export default withScreenBoundary(AllCategories, 'AllCategories')
