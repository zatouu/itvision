import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import TabBar from '../src/components/TabBar'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import {
  User, Camera, Star, Briefcase, Calendar, ShieldCheck, FolderOpen, MessageSquare,
  ChevronRight, Crown, Zap, Award, TrendingUp, Clock, MapPin, Sliders, Eye, Wallet,
  CreditCard, Lock, HelpCircle, Bell, Power, CheckCircle2, Circle, Plus
} from 'lucide-react-native'
import { loadCategories } from '../src/categories'

const HERO_H = 280

const KPI = [
  { key: 'rating', icon: Star, label: 'Note', suffix: '' },
  { key: 'missions', icon: Briefcase, label: 'Missions', suffix: '' },
  { key: 'scoreXeuy', icon: Award, label: 'Score', suffix: '' },
  { key: 'response', icon: Clock, label: 'Réponse', suffix: ' min' },
]

const ACTIONS = [
  { id: 'verification', icon: ShieldCheck, label: 'Vérification', color: colors.success, route: '/verification' },
  { id: 'portfolio', icon: FolderOpen, label: 'Portfolio', color: colors.primary, route: '/portfolio' },
  { id: 'reviews', icon: MessageSquare, label: 'Avis', color: colors.warning, route: '/reviews' },
]

const SECTIONS = [
  {
    title: 'Ma réputation',
    items: [
      { icon: FolderOpen, label: 'Portfolio', route: '/portfolio' },
      { icon: ShieldCheck, label: 'Vérification', route: '/verification' },
      { icon: MessageSquare, label: 'Avis clients', route: '/reviews' },
      { icon: Zap, label: 'Compétences', route: '/profile-detail?section=business' },
      { icon: Award, label: 'Certifications', route: '/profile-detail?section=certifications' },
      { icon: Briefcase, label: 'Expériences', route: '/profile-detail?section=experiences' },
      { icon: Crown, label: 'Badges', route: '/badges' },
    ],
  },
  {
    title: 'Mon activité',
    items: [
      { icon: Sliders, label: 'Préférences missions', route: '/profile-detail?section=preferences' },
      { icon: MapPin, label: 'Zone d\'intervention', route: '/profile-detail?section=zone' },
      { icon: Clock, label: 'Disponibilités', route: '/profile-detail?section=availability' },
      { icon: Calendar, label: 'Calendrier', route: '/calendar' },
      { icon: Eye, label: 'Visibilité', route: '/profile-detail?section=visibility' },
      { icon: Zap, label: 'Catégories principales', route: '/profile-detail?section=business' },
    ],
  },
  {
    title: 'Mon business',
    items: [
      { icon: TrendingUp, label: 'Performances', route: '/performance' },
      { icon: Wallet, label: 'Wallet', route: '/profile-detail?section=wallet' },
      { icon: CreditCard, label: 'Paiements', route: '/profile-detail?section=payments' },
      { icon: Crown, label: 'Premium', route: '/premium' },
      { icon: Award, label: 'Crédits Xeuy', route: '/profile-detail?section=credits' },
      { icon: Briefcase, label: 'Factures', route: '/profile-detail?section=invoices' },
      { icon: TrendingUp, label: 'Historique revenus', route: '/profile-detail?section=history' },
    ],
  },
  {
    title: 'Compte & sécurité',
    items: [
      { icon: User, label: 'Informations personnelles', route: '/profile-detail?section=personal' },
      { icon: Lock, label: 'Sécurité', route: '/profile-detail?section=security' },
      { icon: Bell, label: 'Notifications', route: '/profile-detail?section=notifications' },
      { icon: HelpCircle, label: 'Support', route: '/profile-detail?section=help' },
    ],
  },
]

const emptyProfile = {
  user: { name: '', avatarUrl: '', phone: '', kycVerified: false, providerStats: {}, referralBalance: 0, referralCount: 0, createdAt: '' },
  provider: { kycVerified: false, serviceCategories: [], secondaryCategories: [], availabilityStatus: 'Disponible', visible: true, scoreXeuy: 0, preferences: {}, zone: { city: 'Dakar', radiusKm: 10 } },
  reviews: { average: 0, count: 0 },
  kyc: { status: 'pending' },
}

function Profile() {
  const { t } = useTranslation()
  const [data, setData] = useState<any>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<any[]>([])
  const dirty = useRef(false)
  const timer = useRef<any>(null)

  useEffect(() => { loadCategories().then(setCategories).catch(() => {}) }, [])

  useEffect(() => {
    apiGet('/api/provider/profile')
      .then((r: any) => setData({ ...emptyProfile, ...r, user: { ...emptyProfile.user, ...r.user }, provider: { ...emptyProfile.provider, ...r.provider, preferences: { ...emptyProfile.provider.preferences, ...(r.provider?.preferences || {}) } } }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => apiPatch('/api/provider/profile', { user: data.user, provider: data.provider }).catch(() => {}), 1200)
    return () => clearTimeout(timer.current)
  }, [data])

  const updateProvider = (patch: any) => { dirty.current = true; setData((d: any) => ({ ...d, provider: { ...d.provider, ...patch } })) }

  const toggleAvailable = () => {
    const next = data.provider.availabilityStatus !== 'Disponible' ? 'Disponible' : 'Hors ligne'
    updateProvider({ availabilityStatus: next, visible: next === 'Disponible' })
  }

  const u = data.user || {}
  const p = data.provider || {}
  const stats = u.providerStats || {}
  const rev = data.reviews || {}
  const catSlugs = [...(p.serviceCategories || []), ...(p.secondaryCategories || [])].slice(0, 4)
  const catLabels = catSlugs.map((slug: string) => {
    const c = categories.find((x) => x.slug === slug)
    return c?.label || c?.slug || slug
  }).filter(Boolean)

  const kpi: any = {
    rating: rev.average ? rev.average.toFixed(1) : '0.0',
    missions: stats.completedMissions || 0,
    scoreXeuy: p.scoreXeuy ?? 0,
    response: p.preferences?.notifications?.responseTimeMinutes || 4,
  }

  const isOnline = p.availabilityStatus === 'Disponible' && p.visible !== false

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroInner}>
            <View style={s.avatarWrap}>
              {u.avatarUrl ? (
                <Image source={{ uri: u.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={s.avatar}><User size={32} color="#fff" /></View>
              )}
              <TouchableOpacity style={s.camera}>
                <Camera size={12} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={s.name}>{u.name || 'Mon profil'}</Text>
            <View style={s.verifiedRow}>
              {u.kycVerified ? <CheckCircle2 size={14} color={colors.success} /> : <Circle size={14} color="rgba(255,255,255,0.5)" />}
              <Text style={s.verified}>{u.kycVerified ? 'Prestataire vérifié' : 'Vérification en cours'}</Text>
            </View>
            <View style={s.metaRow}>
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={s.meta}>{kpi.rating}</Text>
              <Text style={s.dot}>•</Text>
              <Briefcase size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.meta}>{kpi.missions} missions</Text>
              <Text style={s.dot}>•</Text>
              <Calendar size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.meta}>Membre {u.createdAt ? new Date(u.createdAt).getFullYear() : '2024'}</Text>
            </View>
            <View style={s.chips}>
              {catLabels.length ? catLabels.map((l, i) => (
                <View key={i} style={s.chip}><Text style={s.chipText}>{l}</Text></View>
              )) : <Text style={s.noChip}>Aucune catégorie</Text>}
            </View>
            <TouchableOpacity style={s.statusRow} onPress={toggleAvailable}>
              <View style={[s.statusDot, { backgroundColor: isOnline ? colors.success : colors.danger }]} />
              <Text style={s.statusText}>{isOnline ? 'Disponible maintenant' : p.availabilityStatus}</Text>
              <Switch value={isOnline} onValueChange={toggleAvailable} trackColor={{ false: '#444', true: colors.success }} thumbColor="#fff" style={s.statusSwitch} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.kpiCard}>
          {KPI.map((k) => {
            const Icon = k.icon
            return (
              <View key={k.key} style={s.kpiCol}>
                <Icon size={20} color={colors.primary} />
                <Text style={s.kpiValue}>{k.key === 'scoreXeuy' ? kpi[k.key] : kpi[k.key]}{k.suffix}</Text>
                <Text style={s.kpiLabel}>{k.label}</Text>
              </View>
            )
          })}
        </View>

        <View style={s.scoreCard}>
          <View style={s.scoreTop}>
            <View>
              <Text style={s.scoreTitle}>Score Xeuy</Text>
              <Text style={s.scoreValue}>{kpi.scoreXeuy}/100</Text>
            </View>
            <View style={s.scoreBadge}>
              <TrendingUp size={12} color={colors.success} />
              <Text style={s.scoreBadgeText}>Top 5%</Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${Math.min(100, kpi.scoreXeuy)}%` }]} />
          </View>
          <Text style={s.scoreDesc}>Avis, ponctualité, KYC, compétences, ancienneté, portefeuille, litiges et temps de réponse.</Text>
        </View>

        <View style={s.levelCard}>
          <View style={s.levelTop}>
            <Crown size={20} color={colors.warning} />
            <Text style={s.levelTitle}>Niveau Or</Text>
          </View>
          <Text style={s.levelText}>Encore 23 missions pour atteindre Platine</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: '49%' }]} />
          </View>
          <TouchableOpacity style={s.levelLink}>
            <Text style={s.levelLinkText}>Voir les avantages</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actionsRow}>
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <TouchableOpacity key={a.id} style={s.actionCard} onPress={() => router.push(a.route as any)}>
                <View style={[s.actionIcon, { backgroundColor: a.color + '15' }]}>
                  <Icon size={22} color={a.color} />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={s.sectionCard}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.items.map((item, idx) => {
              const Icon = item.icon
              return (
                <TouchableOpacity key={item.label} style={[s.row, idx < section.items.length - 1 && s.rowBorder]} onPress={() => router.push(item.route as any)}>
                  <View style={[s.rowIcon, { backgroundColor: colors.bgGlobal }]}>
                    <Icon size={18} color={colors.primary} />
                  </View>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <ChevronRight size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )
            })}
          </View>
        ))}

        <TouchableOpacity style={s.logout} onPress={() => router.push('/profile-detail?section=security')}>
          <Text style={s.logoutText}>Paramètres avancés</Text>
        </TouchableOpacity>
      </ScrollView>
      <TabBar active="profile" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  body: { paddingBottom: 100 },
  hero: { height: HERO_H, backgroundColor: colors.heroDark, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
  heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingTop: 20, backgroundColor: 'rgba(15,123,79,0.35)' },
  avatarWrap: { position: 'relative', marginBottom: spacing.md },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  camera: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.heroGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 32, fontWeight: '600', color: '#fff', marginBottom: spacing.xs },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  verified: { fontSize: 14, color: colors.success, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  dot: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  chip: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  chipText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  noChip: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, color: '#fff', flex: 1 },
  statusSwitch: { transform: [{ scale: 0.8 }] },
  kpiCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.xl, paddingVertical: spacing.lg, marginHorizontal: spacing.lg, marginTop: -32, ...shadows.md },
  kpiCol: { flex: 1, alignItems: 'center' },
  kpiValue: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  kpiLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  scoreCard: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.md },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  scoreTitle: { fontSize: 15, color: colors.textSecondary },
  scoreValue: { fontSize: 28, fontWeight: '700', color: colors.text },
  scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successLight || '#D1FAE5', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  scoreBadgeText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlobal, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', backgroundColor: colors.heroGreen, borderRadius: radius.pill },
  scoreDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  levelCard: { backgroundColor: colors.heroGreen, borderRadius: radius.xl, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  levelTitle: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1 },
  levelText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: spacing.sm },
  levelLink: { alignSelf: 'flex-start', marginTop: spacing.sm },
  levelLinkText: { fontSize: 13, color: '#fff', fontWeight: '600', textDecorationLine: 'underline' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.md },
  actionCard: { flex: 1, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadows.sm },
  actionIcon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  actionLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  sectionCard: { backgroundColor: '#fff', borderRadius: radius.xl, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg, ...shadows.sm },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
  logout: { alignSelf: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
  logoutText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
})

export default withScreenBoundary(Profile, 'Profile')
