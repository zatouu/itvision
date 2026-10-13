import { createThemedStyles } from '../src/theme'
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Linking, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Image } from 'expo-image'
import { Minus, Plus, X, Package, ShoppingBag, Users, BadgePercent, Store, Rocket, Repeat, ChevronRight } from 'lucide-react-native'
import { apiGet, apiPatch, apiPost } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import AppHeader from '../src/components/AppHeader'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { marketLinks } from '../src/links'
import { spacing, radius, typography } from '../src/design'

type StockItem = { name: string; qty: number; minQty: number; unit?: string }
type SupplyProduct = { id: string; name: string; image: string | null; priceFcfa: number | null; proPriceFcfa: number | null; path: string }
type SupplyGroup = { groupId: string; name: string; image: string | null; unitPriceFcfa: number; currentQty: number; targetQty: number; path: string }
type ProStatus = { tier: string; requested: boolean; eligible: boolean; minMissions: number; missions: number; kycVerified: boolean }
type GroupLot = { groupId: string; name: string; qty: number; status: string; paid: boolean; resellable: boolean; path: string; resellPath: string }

const AUTOSAVE_MS = 1200

const fcfa = (n?: number | null) => (typeof n === 'number' ? `${Math.round(n).toLocaleString('fr-FR')} F` : '')

/** Lien DDM+ suivi dans le tunnel (utm), ouvert dans le navigateur. */
function openMarket(path: string, medium: string) {
  const url = `${path}${path.includes('?') ? '&' : '?'}utm_source=xeuy&utm_medium=${medium}`
  Linking.openURL(marketLinks.path(url)).catch(() => {})
}

function ProStock() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirty, setDirty] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [items, setItems] = useState<StockItem[]>([])
  const [lots, setLots] = useState<GroupLot[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [pro, setPro] = useState<ProStatus | null>(null)
  const [ddm, setDdm] = useState(false)
  const [products, setProducts] = useState<SupplyProduct[]>([])
  const [groups, setGroups] = useState<SupplyGroup[]>([])
  const [newName, setNewName] = useState('')
  const [newMin, setNewMin] = useState('')
  const [requesting, setRequesting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await apiGet('/api/services/pro-stock')
      setItems(Array.isArray(res.items) ? res.items : [])
      setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : [])
      setPro(res.pro || null)
      setDdm(res.ddmBridge === true)
      setProducts(res.supplies?.products || [])
      setGroups(res.supplies?.groups || [])
      setLots(Array.isArray(res.lots) ? res.lots : [])
      setDirty(false)
    } catch (e) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  // Enregistrement automatique peu après la dernière modification (pas de bouton à oublier en quittant l'écran)
  useEffect(() => {
    if (!dirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        await apiPatch('/api/services/pro-stock', { items })
        setDirty(false)
        setSaveState('saved')
      } catch (e) {
        setSaveState('idle')
        toast.error(t('common.error'), humanErrorMessage(e))
      }
    }, AUTOSAVE_MS)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [items, dirty, t])

  // Sortie de l'écran avant l'enregistrement automatique : on envoie quand même la dernière version
  const latest = useRef({ items, dirty })
  latest.current = { items, dirty }
  useEffect(() => () => {
    if (latest.current.dirty) apiPatch('/api/services/pro-stock', { items: latest.current.items }).catch(() => {})
  }, [])

  const update = (next: StockItem[]) => { setItems(next); setDirty(true) }
  const add = (raw: string, minQty = 0) => {
    const name = raw.trim().slice(0, 60)
    if (!name || items.length >= 50 || items.some(i => i.name.toLowerCase() === name.toLowerCase())) return
    update([...items, { name, qty: 0, minQty }])
    setSuggestions(list => list.filter(s => s.toLowerCase() !== name.toLowerCase()))
    setNewName(''); setNewMin('')
  }
  const changeQty = (name: string, delta: number) =>
    update(items.map(i => (i.name === name ? { ...i, qty: Math.min(9999, Math.max(0, i.qty + delta)) } : i)))
  const remove = (name: string) => update(items.filter(i => i.name !== name))

  const requestPro = async () => {
    setRequesting(true)
    try {
      await apiPost('/api/services/pro-stock', { action: 'request_pro' })
      setPro(p => (p ? { ...p, requested: true } : p))
      toast.success(t('proStock.proRequested'))
    } catch (e) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setRequesting(false)
    }
  }

  const lowCount = items.filter(i => i.minQty > 0 && i.qty <= i.minQty).length

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader title={t('proStock.title')} onBack={() => router.back()} />
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primaryText} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primaryText} />}
        >
          <Text style={s.intro}>{t('proStock.intro')}</Text>

          <TouchableOpacity style={[s.card, s.kitCard]} onPress={() => router.push('/starter-kit' as any)} accessibilityRole="button">
            <Rocket size={20} color={colors.brandInk} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{t('starterKit.title')}</Text>
              <Text style={s.muted}>{t('proStock.kitHint')}</Text>
            </View>
            <ChevronRight size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Consommables */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Package size={18} color={colors.ink} />
              <Text style={s.cardTitle}>{t('proStock.myItems')}</Text>
              {lowCount > 0 && <View style={s.lowBadge}><Text style={s.lowBadgeText}>{t('proStock.toRestock', { count: lowCount })}</Text></View>}
            </View>
            {saveState !== 'idle' && (
              <Text style={s.saveState} accessibilityLiveRegion="polite">
                {saveState === 'saving' ? t('proStock.saving') : t('proStock.saved')}
              </Text>
            )}

            {items.length === 0 && <Text style={s.muted}>{t('proStock.empty')}</Text>}
            {items.map(i => {
              const low = i.minQty > 0 && i.qty <= i.minQty
              return (
                <View key={i.name} style={s.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.itemName} numberOfLines={1}>{i.name}</Text>
                    <Text style={[s.itemMeta, low && s.itemMetaLow]}>
                      {low ? t('proStock.lowItem') : i.minQty > 0 ? t('proStock.threshold', { n: i.minQty }) : ' '}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(i.name, -1)} accessibilityRole="button" accessibilityLabel={t('proStock.less', { name: i.name })}>
                    <Minus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={s.qty} accessibilityLabel={t('proStock.qtyLabel', { name: i.name, qty: i.qty })}>{i.qty}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => changeQty(i.name, 1)} accessibilityRole="button" accessibilityLabel={t('proStock.more', { name: i.name })}>
                    <Plus size={14} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => remove(i.name)} accessibilityRole="button" accessibilityLabel={t('proStock.remove', { name: i.name })}>
                    <X size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )
            })}

            <View style={s.addRow}>
              <TextInput value={newName} onChangeText={setNewName} placeholder={t('proStock.namePlaceholder')} placeholderTextColor={colors.textMuted}
                style={[s.input, { flex: 1 }]} maxLength={60} returnKeyType="done" onSubmitEditing={() => add(newName, Number(newMin) || 0)} />
              <TextInput value={newMin} onChangeText={v => setNewMin(v.replace(/[^0-9]/g, ''))} placeholder={t('proStock.minPlaceholder')} placeholderTextColor={colors.textMuted}
                style={[s.input, s.inputSmall]} keyboardType="number-pad" maxLength={4} />
              <TouchableOpacity style={s.addBtn} onPress={() => add(newName, Number(newMin) || 0)} disabled={!newName.trim()} accessibilityRole="button">
                <Text style={s.addBtnText}>{t('proStock.add')}</Text>
              </TouchableOpacity>
            </View>

            {suggestions.length > 0 && (
              <>
                <Text style={s.muted}>{t('proStock.suggested')}</Text>
                <View style={s.chips}>
                  {suggestions.map(n => (
                    <TouchableOpacity key={n} style={s.chip} onPress={() => add(n)} accessibilityRole="button">
                      <Plus size={12} color={colors.primaryText} />
                      <Text style={s.chipText} numberOfLines={1}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* DDM+ : rachat au tarif pro, achats groupés, boutique — grisé tant que l'intégration est inactive */}
          {!ddm ? (
            <View style={[s.card, s.soonCard]}>
              <View style={s.cardHeader}>
                <ShoppingBag size={18} color={colors.textMuted} />
                <Text style={[s.cardTitle, { color: colors.textMuted }]}>{t('proStock.ddmTitle')}</Text>
                <View style={s.soonTag}><Text style={s.soonTagText}>{t('common.soon')}</Text></View>
              </View>
              {(['soonRestock', 'soonGroups', 'soonPro', 'soonShop'] as const).map(k => (
                <Text key={k} style={s.soonLine}>• {t(`proStock.${k}`)}</Text>
              ))}
            </View>
          ) : (
            <>
              {products.length > 0 && (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <ShoppingBag size={18} color={colors.ink} />
                    <Text style={s.cardTitle}>{t('proStock.restockTitle')}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                    {products.map(p => (
                      <TouchableOpacity key={p.id} style={s.product} onPress={() => openMarket(p.path, 'stock')} accessibilityRole="link" accessibilityLabel={p.name}>
                        {p.image
                          ? <Image source={{ uri: p.image }} style={s.productImg} contentFit="cover" />
                          : <View style={[s.productImg, s.productPh]}><Package size={20} color={colors.textMuted} /></View>}
                        <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                        {p.priceFcfa ? <Text style={s.productPrice}>{fcfa(p.priceFcfa)}</Text> : null}
                        {p.proPriceFcfa ? <Text style={s.productPro}>{t('proStock.proPrice', { price: fcfa(p.proPriceFcfa) })}</Text> : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {groups.length > 0 && (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Users size={18} color={colors.ink} />
                    <Text style={s.cardTitle}>{t('proStock.groupsTitle')}</Text>
                  </View>
                  <Text style={s.muted}>{t('proStock.groupsHint')}</Text>
                  {groups.map(g => (
                    <TouchableOpacity key={g.groupId} style={s.groupRow} onPress={() => openMarket(g.path, 'stock-groupe')} accessibilityRole="link">
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.itemName} numberOfLines={1}>{g.name}</Text>
                        <Text style={s.itemMeta}>{t('proStock.groupProgress', { price: fcfa(g.unitPriceFcfa), current: g.currentQty, target: g.targetQty })}</Text>
                      </View>
                      <Text style={s.link}>{t('proStock.join')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {lots.length > 0 && (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <Repeat size={18} color={colors.ink} />
                    <Text style={s.cardTitle}>{t('proStock.lotsTitle')}</Text>
                  </View>
                  <Text style={s.muted}>{t('proStock.lotsHint')}</Text>
                  {lots.map(l => (
                    <View key={l.groupId} style={s.groupRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.itemName} numberOfLines={1}>{l.name}</Text>
                        <Text style={s.itemMeta}>{t('proStock.lotMeta', { qty: l.qty, status: t(`proStock.lotStatus.${l.status}`, { defaultValue: l.status }) })}</Text>
                      </View>
                      {l.resellable ? (
                        <TouchableOpacity onPress={() => openMarket(l.resellPath, 'stock-revente')} accessibilityRole="link" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={s.link}>{t('proStock.resell')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => openMarket(l.path, 'stock-lot')} accessibilityRole="link" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={s.linkMuted}>{t('proStock.follow')}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {pro && (
                <View style={s.card}>
                  <View style={s.cardHeader}>
                    <BadgePercent size={18} color={colors.ink} />
                    <Text style={s.cardTitle}>{t('proStock.proTitle')}</Text>
                  </View>
                  {pro.tier !== 'standard' ? (
                    <Text style={s.ok}>{t('proStock.proActive')}</Text>
                  ) : pro.requested ? (
                    <Text style={s.muted}>{t('proStock.proPending')}</Text>
                  ) : pro.eligible ? (
                    <>
                      <Text style={s.muted}>{t('proStock.proHint')}</Text>
                      <TouchableOpacity style={s.saveBtn} onPress={requestPro} disabled={requesting} accessibilityRole="button">
                        {requesting ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.saveBtnText}>{t('proStock.proRequest')}</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={s.muted}>{t('proStock.proLocked', { n: pro.minMissions, done: pro.missions })}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={[s.card, s.shopCard]} onPress={() => Linking.openURL(marketLinks.becomeVendor).catch(() => {})} accessibilityRole="link">
                <Store size={20} color={colors.brandInk} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{t('proStock.shopTitle')}</Text>
                  <Text style={s.muted}>{t('proStock.shopHint')}</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}



export default withScreenBoundary(ProStock, 'ProStock')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
    intro: { fontSize: typography.sm.fontSize, color: colors.textSecondary, lineHeight: 19 },
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardTitle: { flex: 1, fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.ink },
    muted: { fontSize: typography.sm.fontSize, color: colors.textMuted, lineHeight: 18 },
    ok: { fontSize: typography.sm.fontSize, color: colors.primaryText, fontWeight: typography.weight.bold as any },
    lowBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.warning },
    lowBadgeText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: colors.onPrimary },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
    itemName: { fontSize: 14, color: colors.text, fontWeight: typography.weight.bold as any },
    itemMeta: { fontSize: 11.5, color: colors.textMuted },
    itemMetaLow: { color: colors.warning, fontWeight: typography.weight.bold as any },
    qtyBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    qty: { minWidth: 28, textAlign: 'center', fontWeight: typography.weight.bold as any, color: colors.text },
    addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
    input: { minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.text },
    inputSmall: { width: 64, textAlign: 'center' },
    addBtn: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: colors.onPrimary, fontWeight: typography.weight.bold as any },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', paddingHorizontal: spacing.md, minHeight: 36, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
    chipText: { fontSize: typography.sm.fontSize, color: colors.text, flexShrink: 1 },
    saveBtn: { minHeight: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
    saveBtnText: { color: colors.onPrimary, fontWeight: typography.weight.extrabold as any },
    soonCard: { opacity: 0.75 },
    soonTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.bgDeep },
    soonTagText: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.textMuted },
    soonLine: { fontSize: typography.sm.fontSize, color: colors.textMuted, lineHeight: 19 },
    product: { width: 140, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md, padding: 8, gap: 4 },
    productImg: { width: '100%', height: 90, borderRadius: radius.sm },
    productPh: { backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 12.5, color: colors.text },
    productPrice: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
    productPro: { fontSize: 11.5, fontWeight: typography.weight.bold as any, color: colors.primaryText },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingTop: spacing.sm },
    link: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.primaryText },
    linkMuted: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.textSecondary },
    kitCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    saveState: { fontSize: 11.5, color: colors.textMuted },
    shopCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.brandSoft },
  })
  return { colors, s }
})
