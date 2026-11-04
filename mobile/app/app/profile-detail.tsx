import { createThemedStyles } from '../src/theme'
import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import Toggle from '../src/components/Toggle'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { spacing, radius, typography, shadows } from '../src/design'
import { Check, ChevronRight, Plus, Search } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { apiGet, apiPatch, logoutApi } from '../src/api'
import { clearAuth } from '../src/auth'
import { clearAllUserData } from '../src/clear-user-data'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { loadCategories } from '../src/categories'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { useTranslation } from 'react-i18next'

// value = statut persisté côté API (ne pas traduire)
const AVAIL = [
  { value: 'Disponible', labelKey: 'profileDetailScreen.avail.available' },
  { value: 'Occupé', labelKey: 'profileDetailScreen.avail.busy' },
  { value: 'En pause', labelKey: 'profileDetailScreen.avail.paused' },
  { value: 'En vacances', labelKey: 'profileDetailScreen.avail.vacation' },
  { value: 'Hors ligne', labelKey: 'profileDetailScreen.avail.offline' },
]

const TITLES: any = {
  preferences: 'profileDetailScreen.titles.preferences',
  zone: 'profileDetailScreen.titles.zone',
  availability: 'profileDetailScreen.titles.availability',
  visibility: 'profileDetailScreen.titles.visibility',
  business: 'profileDetailScreen.titles.business',
  wallet: 'profileDetailScreen.titles.wallet',
  payments: 'profileDetailScreen.titles.payments',
  premium: 'profileDetailScreen.titles.premium',
  credits: 'profileDetailScreen.titles.credits',
  security: 'profileDetailScreen.titles.security',
  notifications: 'profileDetailScreen.titles.notifications',
  personal: 'profileDetailScreen.titles.personal',
  bio: 'profileDetailScreen.titles.bio',
  help: 'profileDetailScreen.titles.help',
}

const emptyProfile = {
  user: { name: '', phone: '', email: '', kycVerified: false, providerStats: {}, referralBalance: 0 },
  provider: { serviceCategories: [], secondaryCategories: [], availabilityStatus: 'Disponible', visible: true, scoreXeuy: 0, preferences: {}, zone: { city: 'Dakar', radiusKm: 10 }, maxConcurrentMissions: 3 },
  reviews: { average: 0, count: 0 },
}

const MAX_MAIN_CATEGORIES = 5
const BIO_MAX = 500

function ProfileDetail() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const { section } = useLocalSearchParams<{ section: string }>()
  const title = t(TITLES[section] || 'profileDetailScreen.titles.default')
  const [data, setData] = useState<any>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const loaded = useRef(false)
  const [categories, setCategories] = useState<any[]>([])
  const [tradeQuery, setTradeQuery] = useState('')
  const [mainLimitHit, setMainLimitHit] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const dirty = useRef(false)
  const timer = useRef<any>(null)

  useEffect(() => { loadCategories().then(setCategories).catch(() => {}) }, [])

  const load = () => {
    setLoading(true)
    setLoadError(false)
    apiGet('/api/provider/profile')
      .then((r: any) => {
        loaded.current = true
        setData({ ...emptyProfile, ...r, user: { ...emptyProfile.user, ...r.user }, provider: { ...emptyProfile.provider, ...r.provider, preferences: { ...emptyProfile.provider.preferences, ...(r.provider?.preferences || {}) } } })
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Jamais d'enregistrement tant que le profil réel n'est pas chargé : on enverrait un profil vide
  useEffect(() => {
    if (!dirty.current || !loaded.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      // Remis à false avant l'envoi : une modification faite pendant la requête reste « à enregistrer »
      dirty.current = false
      setSaveState('saving')
      apiPatch('/api/provider/profile', { user: data.user, provider: data.provider })
        .then(() => setSaveState('saved'))
        .catch((e: unknown) => { dirty.current = true; setSaveState('error'); toast.error(t('profileDetailScreen.saveFailed'), humanErrorMessage(e)) })
    }, 1200)
    return () => clearTimeout(timer.current)
  }, [data])

  const latest = useRef(data)
  latest.current = data
  useEffect(() => () => {
    if (dirty.current && loaded.current) {
      apiPatch('/api/provider/profile', { user: latest.current.user, provider: latest.current.provider })
        .catch((e: unknown) => toast.error(t('profileDetailScreen.saveFailed'), humanErrorMessage(e)))
    }
  }, [])

  const updateUser = (patch: any) => { dirty.current = true; setData((d: any) => ({ ...d, user: { ...d.user, ...patch } })) }
  const updateProvider = (patch: any) => { dirty.current = true; setData((d: any) => ({ ...d, provider: { ...d.provider, ...patch } })) }
  const updatePreferences = (patch: any) => { dirty.current = true; setData((d: any) => ({ ...d, provider: { ...d.provider, preferences: { ...d.provider.preferences, ...patch } } })) }
  const updatePref = (key: string, value: any) => updatePreferences({ [key]: value })
  const updateZone = (patch: any) => updateProvider({ zone: { ...data.provider.zone, ...patch } })

  const p = data.provider || {}
  const pref = p.preferences || {}
  const u = data.user || {}

  const setAvailability = (status: string) => {
    updateProvider({ availabilityStatus: status, visible: status === 'Disponible' ? (p.visible ?? true) : false })
  }

  const toggleVisible = () => {
    if (p.availabilityStatus !== 'Disponible') return
    updateProvider({ visible: !p.visible })
  }

  const catSlugs = p.serviceCategories || []
  const secondarySlugs = p.secondaryCategories || []

  const renderSwitch = (label: string, value: boolean, onChange: (v: boolean) => void, desc?: string) => (
    <View style={s.row}>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {desc ? <Text style={s.rowDesc}>{desc}</Text> : null}
      </View>
      <Toggle value={value} onValueChange={onChange} />
    </View>
  )

  const renderSliderRow = (label: string, value: number, min: number, max: number, unit: string, onChange: (n: number) => void, opts: { step?: number; display?: string } = {}) => {
    const step = opts.step || 1
    return (
      <View style={s.sliderRow}>
        <Text style={s.rowLabel}>{label}</Text>
        <View style={s.sliderTrack}>
          <View style={[s.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
        </View>
        <View style={s.sliderButtons}>
          <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} style={s.sliderBtn}><Text style={s.sliderBtnText}>-</Text></TouchableOpacity>
          <Text style={s.sliderValue}>{opts.display ?? `${value}${unit}`}</Text>
          <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))} style={s.sliderBtn}><Text style={s.sliderBtnText}>+</Text></TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderSection = () => {
    switch (section) {
      case 'preferences': {
        // 100 km = sans limite (même règle côté serveur : visibility/preferences.ts)
        const maxDistance = Math.min(Number(pref.maxDistanceKm) || 100, 100)
        return (
          <View style={s.card}>
            {renderSliderRow(t('profileDetailScreen.maxDistance'), maxDistance, 5, 100, ' km', (v) => updatePref('maxDistanceKm', v), {
              step: 5,
              display: maxDistance >= 100 ? t('profileDetailScreen.noLimit') : undefined,
            })}
            {renderSliderRow(t('profileDetailScreen.minAmount'), pref.minAmount || 0, 0, 50000, ' FCFA', (v) => updatePref('minAmount', v), { step: 1000 })}
            {renderSliderRow(t('profileDetailScreen.concurrentMissions'), p.maxConcurrentMissions || 3, 1, 10, '', (v) => updateProvider({ maxConcurrentMissions: v }))}
            {renderSwitch(t('profileDetailScreen.urgentMissions'), pref.urgent !== false, (v) => updatePref('urgent', v))}
            {renderSwitch(t('profileDetailScreen.plannedMissions'), pref.planned !== false, (v) => updatePref('planned', v))}
            <Text style={s.hint}>{t('profileDetailScreen.preferencesHint')}</Text>
          </View>
        )
      }
      case 'zone':
        return (
          <View style={s.card}>
            <Text style={s.label}>{t('profileDetailScreen.mainCity')}</Text>
            <TextInput style={s.input} value={p.zone?.city} onChangeText={(text) => updateZone({ city: text })} placeholder="Dakar" />
            {renderSliderRow(t('profileDetailScreen.interventionRadius'), p.zone?.radiusKm || 10, 1, 100, ' km', (v) => updateZone({ radiusKm: v }))}
          </View>
        )
      case 'availability':
        return (
          <View style={s.card}>
            <Text style={s.label}>{t('profileDetailScreen.status')}</Text>
            <View style={s.chipRow}>
              {AVAIL.map((st) => (
                <TouchableOpacity key={st.value} style={[s.chip, p.availabilityStatus === st.value && s.chipActive]} onPress={() => setAvailability(st.value)}>
                  <Text style={[s.chipText, p.availabilityStatus === st.value && s.chipTextActive]}>{t(st.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>{t('profileDetailScreen.usualHours')}</Text>
            <TextInput style={s.input} value={pref.scheduleHours || t('profileDetailScreen.defaultHours')} onChangeText={(text) => updatePref('scheduleHours', text)} />
          </View>
        )
      case 'visibility':
        return (
          <View style={s.card}>
            {renderSwitch(t('profileDetailScreen.visibleOnHome'), p.visible === true, toggleVisible, p.availabilityStatus !== 'Disponible' ? t('profileDetailScreen.setAvailableToEnable') : undefined)}
            <Text style={s.hint}>{t('profileDetailScreen.premiumSoon')}</Text>
          </View>
        )
      case 'business': {
        const q = tradeQuery.trim().toLowerCase()
        const matches = (c: any) => !q || String(c.label || c.slug).toLowerCase().includes(q)
        const toggleMain = (slug: string) => {
          if (catSlugs.includes(slug)) {
            setMainLimitHit(false)
            updateProvider({ serviceCategories: catSlugs.filter((x: string) => x !== slug) })
            return
          }
          if (catSlugs.length >= MAX_MAIN_CATEGORIES) { setMainLimitHit(true); return }
          // Un métier est principal OU secondaire, jamais les deux
          updateProvider({ serviceCategories: [...catSlugs, slug], secondaryCategories: secondarySlugs.filter((x: string) => x !== slug) })
        }
        const toggleSecondary = (slug: string) => updateProvider({
          secondaryCategories: secondarySlugs.includes(slug) ? secondarySlugs.filter((x: string) => x !== slug) : [...secondarySlugs, slug],
        })
        const renderChip = (c: any, active: boolean, onPress: () => void) => (
          <TouchableOpacity key={c.slug} style={[s.chip, active && s.chipActive]} onPress={onPress}
            accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={c.label}>
            {active && <Check size={14} color={colors.onPrimary} />}
            <Text style={[s.chipText, active && s.chipTextActive]} numberOfLines={1}>{c.label}</Text>
          </TouchableOpacity>
        )
        const mainList = categories.filter(matches)
        const secondaryList = categories.filter((c: any) => !catSlugs.includes(c.slug) && matches(c))
        const secondaryCount = secondarySlugs.filter((x: string) => !catSlugs.includes(x)).length
        return (
          <View style={s.card}>
            <Text style={s.intro}>{t('profileDetailScreen.tradesIntro')}</Text>
            {categories.length > 8 && (
              <View style={s.searchBox}>
                <Search size={16} color={colors.textMuted} />
                <TextInput style={s.searchInput} value={tradeQuery} onChangeText={setTradeQuery}
                  placeholder={t('profileDetailScreen.searchTrades')} placeholderTextColor={colors.textMuted}
                  autoCorrect={false} returnKeyType="search" accessibilityLabel={t('profileDetailScreen.searchTrades')} />
              </View>
            )}
            {categories.length === 0 && <ActivityIndicator color={colors.primaryText} style={{ marginVertical: spacing.lg }} />}

            <View style={s.sectionHead}>
              <Text style={s.label}>{t('profileDetailScreen.mainCategories')}</Text>
              <Text style={s.counter}>{catSlugs.length}/{MAX_MAIN_CATEGORIES}</Text>
            </View>
            <Text style={s.helper}>{t('profileDetailScreen.mainCategoriesHint', { max: MAX_MAIN_CATEGORIES })}</Text>
            {mainLimitHit && <Text style={s.warnText}>{t('profileDetailScreen.mainLimitReached', { max: MAX_MAIN_CATEGORIES })}</Text>}
            <View style={s.chipRow}>{mainList.map((c: any) => renderChip(c, catSlugs.includes(c.slug), () => toggleMain(c.slug)))}</View>

            <View style={s.sectionHead}>
              <Text style={s.label}>{t('profileDetailScreen.secondaryCategories')}</Text>
              {secondaryCount > 0 && <Text style={s.counter}>{secondaryCount}</Text>}
            </View>
            <Text style={s.helper}>{t('profileDetailScreen.secondaryCategoriesHint')}</Text>
            <View style={s.chipRow}>{secondaryList.map((c: any) => renderChip(c, secondarySlugs.includes(c.slug), () => toggleSecondary(c.slug)))}</View>
            {q !== '' && mainList.length === 0 && <Text style={s.helper}>{t('profileDetailScreen.noTradeFound')}</Text>}

            <Text style={s.label}>{t('profileDetailScreen.biography')}</Text>
            <TextInput style={[s.input, { minHeight: 96, textAlignVertical: 'top' }]} multiline maxLength={BIO_MAX}
              value={pref.bio || ''} onChangeText={(text) => updatePref('bio', text)}
              placeholder={t('profileDetailScreen.bioPlaceholder')} placeholderTextColor={colors.textMuted} />
            <Text style={s.bioCount}>{(pref.bio || '').length}/{BIO_MAX}</Text>
          </View>
        )
      }
      case 'wallet':
        return (
          <View style={s.card}>
            <View style={s.walletBox}>
              <Text style={s.walletLabel}>{t('profileDetailScreen.availableBalance')}</Text>
              <Text style={s.walletValue}>{(u.referralBalance || 0).toLocaleString()} FCFA</Text>
            </View>
            {renderSwitch(t('profileDetailScreen.autoWithdraw'), pref.autoWithdraw === true, (v) => updatePref('autoWithdraw', v))}
            <Text style={s.label}>{t('profileDetailScreen.mainWithdrawMethod')}</Text>
            <TextInput style={s.input} value={pref.withdrawPhone || u.phone || ''} onChangeText={(text) => updatePref('withdrawPhone', text)} />
          </View>
        )
      case 'security':
        return (
          <View style={s.card}>
            {renderSwitch(t('profileDetailScreen.pushNotifications'), pref.pushNotifications !== false, (v) => updatePref('pushNotifications', v))}
            {renderSwitch(t('profileDetailScreen.shareLocation'), pref.shareLocation !== false, (v) => updatePref('shareLocation', v))}
            {renderSwitch(t('profileDetailScreen.publicProfile'), pref.publicProfile === true, (v) => updatePref('publicProfile', v))}
            <TouchableOpacity style={s.logoutBtn} onPress={async () => {
              await logoutApi()
              await clearAuth()
              await clearAllUserData()
              toast.info(t('profileDetailScreen.logout'), t('profileDetailScreen.loggedOut'))
              router.replace('/login')
            }}>
              <Text style={s.logoutBtnText}>{t('profileDetailScreen.logout')}</Text>
            </TouchableOpacity>
          </View>
        )
      case 'personal':
        return (
          <View style={s.card}>
            <Text style={s.label}>{t('profileDetailScreen.fullName')}</Text>
            <TextInput style={s.input} value={u.name} onChangeText={(text) => updateUser({ name: text })} />
            <Text style={s.label}>{t('profileDetailScreen.phone')}</Text>
            <TextInput style={s.input} value={u.phone} onChangeText={(text) => updateUser({ phone: text })} keyboardType="phone-pad" />
            <Text style={s.label}>{t('profileDetailScreen.email')}</Text>
            <TextInput style={s.input} value={u.email || ''} onChangeText={(text) => updateUser({ email: text })} keyboardType="email-address" />
          </View>
        )
      default:
        return (
          <View style={s.card}>
            <Text style={s.hint}>{t('profileDetailScreen.comingSoon')}</Text>
          </View>
        )
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primaryText} style={{ marginTop: 60 }} /></SafeAreaView>
  if (loadError) return (
    <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md }]}>
      <Text style={{ fontSize: 15, color: colors.text, textAlign: 'center' }}>{t('profileDetailScreen.loadError')}</Text>
      <TouchableOpacity onPress={load} style={{ paddingHorizontal: spacing.xl, minHeight: 44, justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary }} accessibilityRole="button">
        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{t('profileDetailScreen.retry')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.md }} accessibilityRole="button">
        <Text style={{ color: colors.textMuted }}>{t('profileDetailScreen.back')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <BackIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <View style={s.saveSlot} accessibilityLiveRegion="polite">
          {saveState === 'saving' && <ActivityIndicator size="small" color={colors.textMuted} />}
          {saveState === 'saved' && <Text style={s.saveText}>{t('profileDetailScreen.saved')}</Text>}
          {saveState === 'error' && <Text style={[s.saveText, { color: colors.danger }]}>{t('profileDetailScreen.notSaved')}</Text>}
        </View>
      </View>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderSection()}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(ProfileDetail, 'ProfileDetail')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
    back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.text, textAlign: 'center', marginHorizontal: spacing.sm },
    body: { padding: spacing.lg, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm },
    label: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, fontSize: 16, color: colors.text, backgroundColor: colors.bg },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    rowText: { flex: 1, marginRight: spacing.md },
    rowLabel: { fontSize: 16, color: colors.text, fontWeight: '500' },
    rowDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    sliderRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
    sliderTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.bgGlobal, overflow: 'hidden', marginVertical: spacing.sm },
    sliderFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
    sliderButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    sliderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgGlobal, alignItems: 'center', justifyContent: 'center' },
    sliderBtnText: { fontSize: 18, color: colors.text, fontWeight: '600' },
    sliderValue: { fontSize: 16, fontWeight: '600', color: colors.primaryText, flex: 1, textAlign: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', minHeight: 40, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { flexShrink: 1, fontSize: 14, color: colors.textSecondary },
    chipTextActive: { color: colors.onPrimary, fontWeight: '600' },
    intro: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: spacing.sm },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, backgroundColor: colors.bg, marginTop: spacing.sm },
    searchInput: { flex: 1, minHeight: 44, fontSize: 15, color: colors.text },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.md },
    counter: { fontSize: 13, fontWeight: '600', color: colors.primaryText },
    helper: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginBottom: spacing.sm },
    warnText: { fontSize: 13, lineHeight: 18, color: colors.warnInk, backgroundColor: colors.warnSoft, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.sm },
    bioCount: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: spacing.xs },
    saveSlot: { minWidth: 44, maxWidth: 96, alignItems: 'flex-end', justifyContent: 'center' },
    saveText: { fontSize: 12, color: colors.textMuted },
    hint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, fontStyle: 'italic' },
    walletBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
    walletLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
    walletValue: { fontSize: 28, fontWeight: '700', color: colors.onPrimary, marginTop: spacing.xs },
    logoutBtn: { marginTop: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerStrong + '15', padding: spacing.md, alignItems: 'center' },
    logoutBtnText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
  })
  return { colors, s }
})
