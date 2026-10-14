import { createThemedStyles } from '../src/theme'
import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPatch, apiUpload } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { ListGroup, ListRow } from '../src/components/ListGroup'
import TabBar from '../src/components/TabBar'
import AccountSection from '../src/components/AccountSection'
import { spacing, radius, typography, shadows, touch } from '../src/design'
import {
  User, Camera, Star, Briefcase, Calendar, ShieldCheck, FolderOpen, MessageSquare,
  ChevronRight, Crown, Zap, Award, TrendingUp, Clock, MapPin, Sliders, Eye, Wallet,
  Lock, CheckCircle2, Circle, QrCode, ShoppingBag, Package
} from 'lucide-react-native'
import { marketLinks } from '../src/links'
import { loadCategories } from '../src/categories'
import { captureMedia, pickMedia, resolveMediaUrl } from '../src/media'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { pickOption } from '../src/option-sheet'
import { updateAuthUser } from '../src/auth'

const HERO_H = 250

// Quatre groupes : ce que voient les clients, mon travail, mes gains, mon compte. Libellés via proProfile.menu.<key>.
const SECTIONS = [
  {
    key: 'public', title: 'Mon profil public',
    items: [
      { key: 'trades', icon: Zap, label: 'Métiers et présentation', route: '/profile-detail?section=business' },
      { key: 'portfolio', icon: FolderOpen, label: 'Portfolio', route: '/portfolio' },
      { key: 'reviews', icon: MessageSquare, label: 'Avis', route: '/reviews' },
      { key: 'passport', icon: QrCode, label: 'Passeport pro', route: '/pro-passport' },
      { key: 'badges', icon: Crown, label: 'Badges', route: '/badges' },
      { key: 'verification', icon: ShieldCheck, label: 'Vérification', route: '/verification' },
    ],
  },
  {
    key: 'work', title: 'Mon travail',
    items: [
      { key: 'starter', icon: Award, label: 'Bien démarrer', route: '/starter-kit' },
      { key: 'stock', icon: Package, label: 'Mon stock', route: '/pro-stock' },
      { key: 'zone', icon: MapPin, label: "Zone d'intervention", route: '/profile-detail?section=zone' },
      { key: 'availability', icon: Clock, label: 'Disponibilités', route: '/profile-detail?section=availability' },
      { key: 'calendar', icon: Calendar, label: 'Calendrier', route: '/calendar' },
      { key: 'preferences', icon: Sliders, label: 'Préférences missions', route: '/profile-detail?section=preferences' },
      { key: 'visibility', icon: Eye, label: 'Visibilité', route: '/profile-detail?section=visibility' },
    ],
  },
  {
    key: 'earnings', title: 'Mes gains',
    items: [
      { key: 'wallet', icon: Wallet, label: 'Portefeuille', route: '/pro-wallet' },
      { key: 'performance', icon: TrendingUp, label: 'Performances', route: '/performance' },
      { key: 'shop', icon: ShoppingBag, label: 'Boutique DDM+', externalUrl: marketLinks.catalog },
    ],
  },
  {
    key: 'account', title: 'Compte & sécurité',
    items: [
      { key: 'personal', icon: User, label: 'Informations personnelles', route: '/profile-detail?section=personal' },
      { key: 'security', icon: Lock, label: 'Sécurité', route: '/profile-detail?section=security' },
      { key: 'privacy', icon: ShieldCheck, label: 'Confidentialité', route: '/privacy' },
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
  const { colors, SECTION_TINT, s } = useStyles()
  const { t } = useTranslation()
  const [data, setData] = useState<any>(emptyProfile)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const promptSource = async (): Promise<'camera' | 'gallery' | null> => {
    const key = await pickOption(t('profile.avatarTitle'), [
      { key: 'camera', label: t('profile.avatarCamera') },
      { key: 'gallery', label: t('profile.avatarGallery') },
    ])
    return key === 'camera' || key === 'gallery' ? key : null
  }

  const uploadAvatar = async () => {
    try {
      const source = await promptSource()
      if (!source) return
      setUploading(true)
      const assets = source === 'camera' ? await captureMedia({ selfie: true }) : await pickMedia({ maxFiles: 1 })
      if (!assets.length) return setUploading(false)
      const file = assets[0]
      const uploaded = await apiUpload(file.uri, file.name, 'image/jpeg', 'avatars')
      const url = uploaded.url || uploaded.staticUrl
      await apiPatch('/api/users/me', { avatarUrl: url })
      await updateAuthUser({ avatarUrl: url })
      setData((d: any) => ({ ...d, user: { ...d.user, avatarUrl: url } }))
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => { loadCategories().then(setCategories).catch(() => {}) }, [])

  const [portfolioCount, setPortfolioCount] = useState<number | null>(null)
  useFocusEffect(useCallback(() => {
    apiGet('/api/provider/portfolio')
      .then((r: any) => setPortfolioCount(Array.isArray(r?.items) ? r.items.length : 0))
      .catch(() => {})
  }, []))

  // Rechargé à chaque retour sur l'écran : la checklist reflète les étapes
  // complétées dans les sous-écrans (zone, bio, KYC...). Lecture seule : les réglages se modifient dans leurs écrans.
  const loadProfile = useCallback(() => {
    setLoadError(false)
    apiGet('/api/provider/profile')
      .then((r: any) => setData({ ...emptyProfile, ...r, user: { ...emptyProfile.user, ...r.user }, provider: { ...emptyProfile.provider, ...r.provider, preferences: { ...emptyProfile.provider.preferences, ...(r.provider?.preferences || {}) } } }))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])
  useFocusEffect(loadProfile)

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
    reliability: typeof stats.reliabilityScore === 'number' ? Math.round(stats.reliabilityScore) : 100,
  }

  const isOnline = p.availabilityStatus === 'Disponible' && p.visible !== false

  // Checklist de complétion : ce qui fait qu'un prestataire reçoit des demandes.
  const checklist = [
    { key: 'avatar', done: !!u.avatarUrl, label: t('proProfile.checkAvatar', { defaultValue: 'Photo de profil' }), onPress: uploadAvatar },
    { key: 'categories', done: (p.serviceCategories || []).length > 0, label: t('proProfile.checkCategories', { defaultValue: 'Catégories de services' }), onPress: () => router.push('/profile-detail?section=business' as any) },
    { key: 'zone', done: !!p.zone?.city, label: t('proProfile.checkZone', { defaultValue: "Zone d'intervention" }), onPress: () => router.push('/profile-detail?section=zone' as any) },
    { key: 'bio', done: !!(p.preferences?.bio || '').trim(), label: t('proProfile.checkBio', { defaultValue: 'Présentation (bio)' }), onPress: () => router.push('/profile-detail?section=business' as any) },
    { key: 'portfolio', done: (portfolioCount ?? 0) > 0, label: t('proProfile.checkPortfolio', { defaultValue: 'Au moins une réalisation' }), onPress: () => router.push('/portfolio' as any) },
    { key: 'kyc', done: !!(u.kycVerified || p.kycVerified), label: t('proProfile.checkKyc', { defaultValue: "Vérification d'identité" }), onPress: () => router.push('/kyc' as any) },
  ]
  const doneCount = checklist.filter(c => c.done).length
  const completion = Math.round((doneCount / checklist.length) * 100)

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <ActivityIndicator color={colors.primaryText} style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  if (loadError && !u.name) {
    return (
      <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }]} edges={['top', 'left', 'right']}>
        <Text style={{ fontSize: 15, color: colors.text, textAlign: 'center', marginBottom: spacing.md }}>{t('proProfile.loadError')}</Text>
        <TouchableOpacity onPress={() => { setLoading(true); loadProfile() }} style={s.retryBtn} accessibilityRole="button">
          <Text style={s.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
        <TabBar active="profile" mode="provider" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.heroInner}>
            <View style={s.avatarWrap}>
              {u.avatarUrl ? (
                <Image source={{ uri: resolveMediaUrl(u.avatarUrl) }} style={s.avatar} />
              ) : (
                <View style={s.avatar}><User size={32} color={colors.onPrimary} /></View>
              )}
              {uploading && (
                <View style={[s.camera, { backgroundColor: colors.textMuted }]}>
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                </View>
              )}
              <TouchableOpacity style={s.camera} onPress={uploadAvatar} disabled={uploading} activeOpacity={0.8} hitSlop={touch.hitSlop}
                accessibilityRole="button" accessibilityLabel={t('proProfile.changePhoto')}>
                <Camera size={12} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={s.name}>{u.name || ''}</Text>
            <TouchableOpacity style={s.verifiedRow} onPress={() => { if (!u.kycVerified) router.push('/kyc' as any) }} disabled={!!u.kycVerified} accessibilityRole="button">
              {u.kycVerified ? <CheckCircle2 size={14} color={colors.success} /> : <Circle size={14} color="rgba(255,255,255,0.5)" />}
              <Text style={s.verified}>{u.kycVerified ? t('proProfile.verified') : t('proProfile.notVerified')}</Text>
            </TouchableOpacity>
            {/* Note, missions et score en une ligne : le détail est dans Performances */}
            <TouchableOpacity style={s.metaRow} onPress={() => router.push('/performance')} accessibilityRole="button">
              <Star size={12} color={colors.warning} fill={colors.warning} />
              <Text style={s.meta}>{kpi.rating}</Text>
              <Text style={s.dot}>•</Text>
              <Briefcase size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.meta}>{t('proProfile.missionsCount', { count: kpi.missions })}</Text>
              <Text style={s.dot}>•</Text>
              <Award size={12} color="rgba(255,255,255,0.8)" />
              <Text style={s.meta}>{t('proProfile.score', { score: kpi.scoreXeuy })}</Text>
              <ChevronRight size={12} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <View style={s.chips}>
              {catLabels.length ? catLabels.map((l, i) => (
                <View key={i} style={s.chip}><Text style={s.chipText}>{l}</Text></View>
              )) : <Text style={s.noChip}>{t('proProfile.noCategory')}</Text>}
            </View>
            {/* Statut en lecture seule : l'interrupteur « en ligne » unique est sur l'accueil Pro */}
            <TouchableOpacity style={s.statusRow} onPress={() => router.push('/profile-detail?section=availability' as any)} accessibilityRole="button">
              <View style={[s.statusDot, { backgroundColor: isOnline ? colors.success : colors.dangerStrong }]} />
              <Text style={s.statusText}>{isOnline ? t('proProfile.availableNow') : p.availabilityStatus}</Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>

        {completion < 100 && portfolioCount !== null && (
          <View style={s.checkCard}>
            <View style={s.checkHead}>
              <Text style={s.checkTitle}>{t('proProfile.completion', { defaultValue: 'Profil complété à {{pct}}%', pct: completion })}</Text>
              <Text style={s.checkCount}>{doneCount}/{checklist.length}</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${completion}%` }]} />
            </View>
            <Text style={s.checkHint}>{t('proProfile.completionHint', { defaultValue: 'Un profil complet reçoit plus de demandes.' })}</Text>
            {checklist.filter(c => !c.done).map(c => (
              <TouchableOpacity key={c.key} style={s.checkRow} onPress={c.onPress} activeOpacity={0.75} accessibilityRole="button">
                <Circle size={18} color={colors.textMuted} />
                <Text style={s.checkLabel}>{c.label}</Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {SECTIONS.map(section => (
          <ListGroup key={section.key} title={t(`proProfile.section.${section.key}`, { defaultValue: section.title })}>
            {section.items.map(item => {
              const Icon = item.icon
              return (
                <ListRow
                  key={item.key}
                  icon={<Icon size={17} color={colors.onPrimary} />}
                  iconBg={SECTION_TINT[section.key] || colors.primary}
                  title={t(`proProfile.menu.${item.key}`, { defaultValue: item.label })}
                  onPress={() => {
                    const ext = (item as any).externalUrl as string | undefined
                    if (ext) { Linking.openURL(ext).catch(() => {}); return }
                    if ((item as any).route) router.push((item as any).route)
                  }}
                />
              )
            })}
          </ListGroup>
        ))}

        <View style={{ paddingHorizontal: spacing.lg }}>
          <AccountSection />
        </View>
      </ScrollView>
      <TabBar active="profile" mode="provider" />
    </SafeAreaView>
  )
}



export default withScreenBoundary(Profile, 'Profile')

const useStyles = createThemedStyles(colors => {
  const SECTION_TINT: Record<string, string> = {
    public: colors.info,
    work: colors.primary,
    earnings: colors.warning,
    account: colors.textSecondary,
  }

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    retryBtn: { paddingHorizontal: spacing.xl, minHeight: 44, justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary },
    retryText: { color: colors.onPrimary, fontWeight: '700' },
    body: { paddingBottom: 100 },
    hero: { height: HERO_H, backgroundColor: colors.heroDark, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl, overflow: 'hidden' },
    heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingTop: 20, backgroundColor: 'rgba(15,123,79,0.35)' },
    avatarWrap: { position: 'relative', marginBottom: spacing.md },
    avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.surface },
    camera: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.heroGreen, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
    name: { fontSize: 24, fontWeight: '700', color: colors.onPrimary, marginBottom: spacing.xs },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    verified: { fontSize: 14, color: colors.success, fontWeight: '500' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
    meta: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
    dot: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
    chip: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    chipText: { fontSize: 13, color: colors.onPrimary, fontWeight: '500' },
    noChip: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, color: colors.onPrimary, flex: 1 },
    checkCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.lg, marginTop: spacing.lg },
    checkHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    checkTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    checkCount: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    checkHint: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.xs },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
    checkLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
    progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.bgGlobal, overflow: 'hidden', marginBottom: spacing.sm },
    progressFill: { height: '100%', backgroundColor: colors.heroGreen, borderRadius: radius.pill },
  })
  return { colors, SECTION_TINT, s }
})
