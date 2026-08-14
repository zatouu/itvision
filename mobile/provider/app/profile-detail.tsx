import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react-native'
import { apiGet, apiPatch, logoutApi } from '../src/api'
import { clearAuth } from '../src/auth'
import { resetSocket } from '../src/socket'
import { resetNotificationBinding } from '../src/notifications'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { loadCategories } from '../src/categories'
import { toast } from '../src/toast'

const AVAIL = ['Disponible', 'Occupé', 'En pause', 'En vacances', 'Hors ligne']

const TITLES: any = {
  preferences: 'Préférences missions',
  zone: 'Zone d\'intervention',
  availability: 'Disponibilités',
  visibility: 'Visibilité',
  business: 'Mon business',
  wallet: 'Wallet',
  payments: 'Paiements',
  premium: 'Premium',
  credits: 'Crédits Xeuy',
  security: 'Compte & sécurité',
  notifications: 'Notifications',
  personal: 'Informations personnelles',
  bio: 'Bio',
  help: 'Support',
}

const emptyProfile = {
  user: { name: '', phone: '', email: '', kycVerified: false, providerStats: {}, referralBalance: 0 },
  provider: { serviceCategories: [], secondaryCategories: [], availabilityStatus: 'Disponible', visible: true, scoreXeuy: 0, preferences: {}, zone: { city: 'Dakar', radiusKm: 10 }, maxConcurrentMissions: 3 },
  reviews: { average: 0, count: 0 },
}

function ProfileDetail() {
  const { section } = useLocalSearchParams<{ section: string }>()
  const title = TITLES[section] || 'Paramètres'
  const [data, setData] = useState<any>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const dirty = useRef(false)
  const timer = useRef<any>(null)

  useEffect(() => { loadCategories().then(setCategories).catch(() => {}) }, [])

  useEffect(() => {
    apiGet('/api/provider/profile').then((r: any) => setData({ ...emptyProfile, ...r, user: { ...emptyProfile.user, ...r.user }, provider: { ...emptyProfile.provider, ...r.provider, preferences: { ...emptyProfile.provider.preferences, ...(r.provider?.preferences || {}) } } })).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => apiPatch('/api/provider/profile', { user: data.user, provider: data.provider }).catch(() => {}), 1200)
    return () => clearTimeout(timer.current)
  }, [data])

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
  const catLabel = (slug: string) => categories.find((c: any) => c.slug === slug)?.label || slug

  const renderSwitch = (label: string, value: boolean, onChange: (v: boolean) => void, desc?: string) => (
    <View style={s.row}>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        {desc ? <Text style={s.rowDesc}>{desc}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#ddd', true: colors.primary }} thumbColor="#fff" />
    </View>
  )

  const renderSliderRow = (label: string, value: number, min: number, max: number, unit: string, onChange: (n: number) => void) => (
    <View style={s.sliderRow}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.sliderTrack}>
        <View style={[s.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
      </View>
      <View style={s.sliderButtons}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))} style={s.sliderBtn}><Text style={s.sliderBtnText}>-</Text></TouchableOpacity>
        <Text style={s.sliderValue}>{value}{unit}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))} style={s.sliderBtn}><Text style={s.sliderBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  )

  const renderSection = () => {
    switch (section) {
      case 'preferences':
        return (
          <View style={s.card}>
            {renderSliderRow('Rayon de visibilité', pref.visibilityRadiusKm || p.zone?.radiusKm || 10, 1, 50, ' km', (v) => updatePref('visibilityRadiusKm', v))}
            {renderSliderRow('Distance maximale', pref.maxDistanceKm || 20, 1, 100, ' km', (v) => updatePref('maxDistanceKm', v))}
            {renderSliderRow('Montant minimum', pref.minAmount || 0, 0, 50000, ' FCFA', (v) => updatePref('minAmount', v))}
            {renderSliderRow('Missions simultanées', p.maxConcurrentMissions || 3, 1, 10, '', (v) => updateProvider({ maxConcurrentMissions: v }))}
            {renderSwitch('Missions urgentes', pref.urgent !== false, (v) => updatePref('urgent', v))}
            {renderSwitch('Missions planifiées', pref.planned !== false, (v) => updatePref('planned', v))}
            {renderSwitch('Recevoir missions similaires', pref.similar !== false, (v) => updatePref('similar', v))}
            {renderSwitch('Uniquement missions vérifiées', pref.verifiedOnly === true, (v) => updatePref('verifiedOnly', v))}
            {renderSwitch('Uniquement missions Escrow', pref.escrowOnly === true, (v) => updatePref('escrowOnly', v))}
          </View>
        )
      case 'zone':
        return (
          <View style={s.card}>
            <Text style={s.label}>Ville principale</Text>
            <TextInput style={s.input} value={p.zone?.city} onChangeText={(t) => updateZone({ city: t })} placeholder="Dakar" />
            {renderSliderRow('Rayon d\'intervention', p.zone?.radiusKm || 10, 1, 100, ' km', (v) => updateZone({ radiusKm: v }))}
          </View>
        )
      case 'availability':
        return (
          <View style={s.card}>
            <Text style={s.label}>Statut</Text>
            <View style={s.chipRow}>
              {AVAIL.map((st) => (
                <TouchableOpacity key={st} style={[s.chip, p.availabilityStatus === st && s.chipActive]} onPress={() => setAvailability(st)}>
                  <Text style={[s.chipText, p.availabilityStatus === st && s.chipTextActive]}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Horaires habituels</Text>
            <TextInput style={s.input} value={pref.scheduleHours || 'Lun-Sam 8h-20h'} onChangeText={(t) => updatePref('scheduleHours', t)} />
          </View>
        )
      case 'visibility':
        return (
          <View style={s.card}>
            {renderSwitch('Visible sur l\'accueil', p.visible === true, toggleVisible, p.availabilityStatus !== 'Disponible' ? 'Mettez Disponible pour activer' : undefined)}
            {renderSliderRow('Rayon de visibilité Premium', pref.visibilityRadiusKm || p.zone?.radiusKm || 10, 1, 100, ' km', (v) => updatePref('visibilityRadiusKm', v))}
            {renderSliderRow('Priorité de diffusion', pref.priorityLevel || 0, 0, 5, '', (v) => updatePref('priorityLevel', v))}
            <Text style={s.hint}>Les options Premium seront activées prochainement.</Text>
          </View>
        )
      case 'business':
        return (
          <View style={s.card}>
            <Text style={s.label}>Catégories principales</Text>
            <View style={s.chipRow}>
              {categories.map((c: any) => (
                <TouchableOpacity key={c.slug} style={[s.chip, catSlugs.includes(c.slug) && s.chipActive]} onPress={() => {
                  const next = catSlugs.includes(c.slug) ? catSlugs.filter((x: string) => x !== c.slug) : [...catSlugs, c.slug].slice(0, 5)
                  updateProvider({ serviceCategories: next })
                }}>
                  <Text style={[s.chipText, catSlugs.includes(c.slug) && s.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Catégories secondaires</Text>
            <View style={s.chipRow}>
              {categories.map((c: any) => (
                <TouchableOpacity key={c.slug} style={[s.chip2, secondarySlugs.includes(c.slug) && s.chipActive]} onPress={() => {
                  const next = secondarySlugs.includes(c.slug) ? secondarySlugs.filter((x: string) => x !== c.slug) : [...secondarySlugs, c.slug]
                  updateProvider({ secondaryCategories: next })
                }}>
                  <Text style={[s.chip2Text, secondarySlugs.includes(c.slug) && s.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Biographie</Text>
            <TextInput style={[s.input, { height: 80 }]} multiline value={pref.bio || ''} onChangeText={(t) => updatePref('bio', t)} placeholder="Décrivez votre expérience..." />
          </View>
        )
      case 'wallet':
        return (
          <View style={s.card}>
            <View style={s.walletBox}>
              <Text style={s.walletLabel}>Solde disponible</Text>
              <Text style={s.walletValue}>{(u.referralBalance || 0).toLocaleString()} FCFA</Text>
            </View>
            {renderSwitch('Activer retraits automatiques', pref.autoWithdraw === true, (v) => updatePref('autoWithdraw', v))}
            <Text style={s.label}>Moyen de retrait principal</Text>
            <TextInput style={s.input} value={pref.withdrawPhone || u.phone || ''} onChangeText={(t) => updatePref('withdrawPhone', t)} />
          </View>
        )
      case 'security':
        return (
          <View style={s.card}>
            {renderSwitch('Notifications push', pref.pushNotifications !== false, (v) => updatePref('pushNotifications', v))}
            {renderSwitch('Partager localisation', pref.shareLocation !== false, (v) => updatePref('shareLocation', v))}
            {renderSwitch('Profil public', pref.publicProfile === true, (v) => updatePref('publicProfile', v))}
            <TouchableOpacity style={s.logoutBtn} onPress={async () => {
              await logoutApi()
              await clearAuth()
              resetSocket()
              resetNotificationBinding()
              toast.info('Déconnexion', 'Vous êtes déconnecté.')
              router.replace('/login')
            }}>
              <Text style={s.logoutBtnText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        )
      case 'personal':
        return (
          <View style={s.card}>
            <Text style={s.label}>Nom complet</Text>
            <TextInput style={s.input} value={u.name} onChangeText={(t) => updateUser({ name: t })} />
            <Text style={s.label}>Téléphone</Text>
            <TextInput style={s.input} value={u.phone} onChangeText={(t) => updateUser({ phone: t })} keyboardType="phone-pad" />
            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} value={u.email || ''} onChangeText={(t) => updateUser({ email: t })} keyboardType="email-address" />
          </View>
        )
      default:
        return (
          <View style={s.card}>
            <Text style={s.hint}>Cet écran sera enrichi dans la prochaine phase.</Text>
          </View>
        )
    }
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderSection()}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
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
  sliderValue: { fontSize: 16, fontWeight: '600', color: colors.primary, flex: 1, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chip2: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chip2Text: { fontSize: 14, color: colors.textSecondary },
  hint: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.md, fontStyle: 'italic' },
  walletBox: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  walletLabel: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  walletValue: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: spacing.xs },
  logoutBtn: { marginTop: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.danger + '15', padding: spacing.md, alignItems: 'center' },
  logoutBtnText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
})

export default withScreenBoundary(ProfileDetail, 'ProfileDetail')
