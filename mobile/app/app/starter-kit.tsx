import { createThemedStyles } from '../src/theme'
import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Image } from 'expo-image'
import { Briefcase, Wrench, Package, ShoppingBag, Users, ShieldCheck, Check, ChevronRight } from 'lucide-react-native'
import { apiGet, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import AppHeader from '../src/components/AppHeader'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { marketLinks } from '../src/links'
import { getCategoryLabel, loadCategories } from '../src/categories'
import { spacing, radius, typography } from '../src/design'

type KitData = {
  categories: Array<{ slug: string; openRequests: number }>
  openRequests: number
  kit: { tools: string[]; consumables: Array<{ name: string; inStock: boolean }> }
  kycVerified: boolean
  ddmBridge: boolean
  supplies: {
    products: Array<{ id: string; name: string; image: string | null; priceFcfa: number | null; proPriceFcfa: number | null; path: string }>
    groups: Array<{ groupId: string; name: string; unitPriceFcfa: number; currentQty: number; targetQty: number; path: string }>
  }
}

const fcfa = (n?: number | null) => (typeof n === 'number' ? `${Math.round(n).toLocaleString('fr-FR')} F` : '')

function openMarket(path: string) {
  Linking.openURL(marketLinks.path(`${path}${path.includes('?') ? '&' : '?'}utm_source=xeuy&utm_medium=kit-demarrage`)).catch(() => {})
}

/** « Bien démarrer » : missions ouvertes dans ses métiers, kit de base, équipement via DDM+ (si actif). */
function StarterKit() {
  const { colors, s } = useStyles()
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<KitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [labels, setLabels] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      setData(await apiGet('/api/services/starter-kit'))
    } catch (e) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    load()
    loadCategories()
      .then(cats => setLabels(Object.fromEntries(cats.map(c => [c.slug, getCategoryLabel(c, i18n.language)]))))
      .catch(() => {})
  }, [load, i18n.language])

  const missing = (data?.kit.consumables || []).filter(c => !c.inStock)

  // Ajoute les consommables du kit à « Mon stock » (seuil d'alerte 1) sans toucher à l'existant
  const addKitToStock = async () => {
    if (!missing.length) return
    setAdding(true)
    try {
      const current = await apiGet('/api/services/pro-stock')
      const items = Array.isArray(current.items) ? current.items : []
      await apiPatch('/api/services/pro-stock', { items: [...items, ...missing.map(c => ({ name: c.name, qty: 0, minQty: 1 }))] })
      toast.success(t('starterKit.addedToStock'))
      load()
    } catch (e) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setAdding(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader title={t('starterKit.title')} onBack={() => router.back()} />
      {loading || !data ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primaryText} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primaryText} />}
        >
          <Text style={s.intro}>{t('starterKit.intro')}</Text>

          {/* 1. Du travail tout de suite */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.step}><Text style={s.stepText}>1</Text></View>
              <Briefcase size={18} color={colors.ink} />
              <Text style={s.cardTitle}>{t('starterKit.missionsTitle')}</Text>
            </View>
            <Text style={s.big}>{t('starterKit.missionsCount', { count: data.openRequests })}</Text>
            {data.categories.map(c => (
              <View key={c.slug} style={s.row}>
                <Text style={s.rowLabel} numberOfLines={1}>{labels[c.slug] || c.slug}</Text>
                <Text style={s.rowValue}>{c.openRequests}</Text>
              </View>
            ))}
            <TouchableOpacity style={s.primaryBtn} onPress={() => router.push('/nearby-requests' as any)} accessibilityRole="button">
              <Text style={s.primaryBtnText}>{t('starterKit.seeMissions')}</Text>
              <ChevronRight size={16} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          {/* 2. Inspirer confiance */}
          {!data.kycVerified && (
            <TouchableOpacity style={[s.card, s.rowCard]} onPress={() => router.push('/kyc' as any)} accessibilityRole="button">
              <View style={s.step}><Text style={s.stepText}>2</Text></View>
              <ShieldCheck size={20} color={colors.primaryText} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{t('starterKit.kycTitle')}</Text>
                <Text style={s.muted}>{t('starterKit.kycHint')}</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* 3. S'équiper */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.step}><Text style={s.stepText}>{data.kycVerified ? '2' : '3'}</Text></View>
              <Wrench size={18} color={colors.ink} />
              <Text style={s.cardTitle}>{t('starterKit.kitTitle')}</Text>
            </View>
            {data.kit.tools.length === 0 && data.kit.consumables.length === 0 ? (
              <Text style={s.muted}>{t('starterKit.noKit')}</Text>
            ) : (
              <>
                {data.kit.tools.length > 0 && <Text style={s.subTitle}>{t('starterKit.tools')}</Text>}
                {data.kit.tools.map(name => <Text key={name} style={s.bullet}>• {name}</Text>)}
                {data.kit.consumables.length > 0 && <Text style={s.subTitle}>{t('starterKit.consumables')}</Text>}
                {data.kit.consumables.map(c => (
                  <View key={c.name} style={s.consumable}>
                    <Text style={s.bulletText}>• {c.name}</Text>
                    {c.inStock && <View style={s.inStock}><Check size={11} color={colors.primaryText} /><Text style={s.inStockText}>{t('starterKit.inStock')}</Text></View>}
                  </View>
                ))}
                {missing.length > 0 && (
                  <TouchableOpacity style={s.secondaryBtn} onPress={addKitToStock} disabled={adding} accessibilityRole="button">
                    {adding ? <ActivityIndicator color={colors.primaryText} /> : (
                      <>
                        <Package size={16} color={colors.primaryText} />
                        <Text style={s.secondaryBtnText}>{t('starterKit.addToStock', { count: missing.length })}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Équipement sur DDM+ : grisé tant que l'intégration est inactive */}
          {!data.ddmBridge ? (
            <View style={[s.card, s.soonCard]}>
              <View style={s.cardHeader}>
                <ShoppingBag size={18} color={colors.textMuted} />
                <Text style={[s.cardTitle, { color: colors.textMuted }]}>{t('starterKit.ddmTitle')}</Text>
                <View style={s.soonTag}><Text style={s.soonTagText}>{t('common.soon')}</Text></View>
              </View>
              <Text style={s.muted}>{t('starterKit.ddmSoon')}</Text>
            </View>
          ) : (data.supplies.products.length > 0 || data.supplies.groups.length > 0) && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <ShoppingBag size={18} color={colors.ink} />
                <Text style={s.cardTitle}>{t('starterKit.ddmTitle')}</Text>
              </View>
              {data.supplies.products.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {data.supplies.products.map(p => (
                    <TouchableOpacity key={p.id} style={s.product} onPress={() => openMarket(p.path)} accessibilityRole="link" accessibilityLabel={p.name}>
                      {p.image
                        ? <Image source={{ uri: p.image }} style={s.productImg} contentFit="cover" />
                        : <View style={[s.productImg, s.productPh]}><Package size={20} color={colors.textMuted} /></View>}
                      <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                      {p.priceFcfa ? <Text style={s.productPrice}>{fcfa(p.priceFcfa)}</Text> : null}
                      {p.proPriceFcfa ? <Text style={s.productPro}>{t('proStock.proPrice', { price: fcfa(p.proPriceFcfa) })}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {data.supplies.groups.map(g => (
                <TouchableOpacity key={g.groupId} style={s.groupRow} onPress={() => openMarket(g.path)} accessibilityRole="link">
                  <Users size={16} color={colors.primaryText} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.rowLabel} numberOfLines={1}>{g.name}</Text>
                    <Text style={s.muted}>{t('proStock.groupProgress', { price: fcfa(g.unitPriceFcfa), current: g.currentQty, target: g.targetQty })}</Text>
                  </View>
                  <Text style={s.link}>{t('proStock.join')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}



export default withScreenBoundary(StarterKit, 'StarterKit')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
    intro: { fontSize: typography.sm.fontSize, color: colors.textSecondary, lineHeight: 19 },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
    rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.ink },
    step: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
    stepText: { color: colors.onPrimary, fontSize: 12, fontWeight: typography.weight.extrabold as any },
    big: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.ink },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
    rowLabel: { flex: 1, fontSize: 14, color: colors.text },
    rowValue: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.ink },
    muted: { fontSize: typography.sm.fontSize, color: colors.textMuted, lineHeight: 18 },
    subTitle: { marginTop: spacing.xs, fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
    bullet: { fontSize: 14, color: colors.text, lineHeight: 22 },
    bulletText: { flex: 1, fontSize: 14, color: colors.text },
    consumable: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
    inStock: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    inStockText: { fontSize: 11, color: colors.primaryText, fontWeight: typography.weight.bold as any },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary, marginTop: spacing.sm },
    primaryBtnText: { color: colors.onPrimary, fontWeight: typography.weight.extrabold as any },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, marginTop: spacing.sm },
    secondaryBtnText: { color: colors.primaryText, fontWeight: typography.weight.bold as any },
    soonCard: { opacity: 0.75 },
    soonTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.bgDeep },
    soonTagText: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.textMuted },
    product: { width: 140, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, padding: 8, gap: 4 },
    productImg: { width: '100%', height: 90, borderRadius: radius.sm },
    productPh: { backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 12.5, color: colors.text },
    productPrice: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
    productPro: { fontSize: 11.5, fontWeight: typography.weight.bold as any, color: colors.primaryText },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: spacing.sm },
    link: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.primaryText },
  })
  return { colors, s }
})
