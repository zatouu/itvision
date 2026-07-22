import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Image, Alert, Platform, ActionSheetIOS,
  Switch, TextInput, Modal, ActivityIndicator, FlatList
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiGetRetry, apiUpload, apiPatch } from '../src/api'
import TabBar from '../src/components/TabBar'
import AppHeader from '../src/components/AppHeader'
import SectionHeader from '../src/components/SectionHeader'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { clearAuth, getAuthUser, subscribeAuth, updateAuthUser } from '../src/auth'
import { resetSocket } from '../src/socket'
import { resetNotificationBinding } from '../src/notifications'
import LanguagePicker from '../src/components/LanguagePicker'
import { captureMedia, pickMedia, resolveMediaUrl } from '../src/media'
import { loadCategories, getCategoryLabel, getSubCategoryLabel, ServiceCategory, SubCategory } from '../src/categories'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import {
  ArrowLeft, ChevronRight, Camera, User, MapPin, Bell, Shield, Star, Wallet, Briefcase,
  Clock, Globe, Zap, Settings, HelpCircle, FileText, Lock, Eye, DollarSign, Award,
  Phone, Mail, CheckCircle2, AlertCircle, Plus, Trash2, CircleDollarSign
} from 'lucide-react-native'

// ─── Types ───────────────────────────────────────────────────────────────────

type AvailabilityStatus = 'available_now' | 'busy' | 'paused' | 'vacation' | 'offline'

interface ProviderDashboardProfile {
  _id: string
  userId: string
  xeuyId: string
  accountStatus: string
  memberSince: string
  name: string
  avatarUrl: string
  phone: string
  email: string
  company: string
  address: string
  city: string
  country: string
  referralCode: string
  referralBalance: number
  referralCount: number
  kycVerified: boolean
  kyc: {
    status: 'none' | 'pending' | 'approved' | 'rejected'
    phoneVerified: boolean
    emailVerified: boolean
    idVerified: boolean
    selfieVerified: boolean
    addressVerified: boolean
    rejectionReason: string
  }
  personal: {
    firstName: string
    lastName: string
    businessName: string
    gender: string
    birthDate: string
    bio: string
    spokenLanguages: string[]
    experienceYears: number
  }
  categories: {
    primary: string[]
    secondary: string[]
    subCategories: Record<string, string[]>
  }
  zone: {
    city: string
    region: string
    country: string
    departments: string[]
    regions: string[]
    radiusKm: number
    coordinates: [number, number] | null
  }
  availability: {
    status: AvailabilityStatus
    workingDays: number[]
    startTime: string
    endTime: string
    lunchStart: string
    lunchEnd: string
    exceptions: Array<{ from: string; to: string; reason: string }>
  }
  missionPreferences: {
    urgent: boolean
    planned: boolean
    troubleshooting: boolean
    installation: boolean
    maintenance: boolean
    longMissions: boolean
    shortMissions: boolean
    minAmount: number
    maxDistanceKm: number
    maxDurationHours: number
  }
  notifications: {
    channels: { push: boolean; sms: boolean; email: boolean; call: boolean }
    events: { newMission: boolean; missionAssigned: boolean; payment: boolean; message: boolean; promotion: boolean; news: boolean; reminder: boolean }
  }
  visibility: {
    visible: boolean
    autoAcceptRequests: boolean
    showPhone: boolean
    showCompany: boolean
    showExactLocation: boolean
    publicProfile: boolean
    showReviews: boolean
    showAddress: boolean
    allowAnonymousStats: boolean
  }
  portfolio: Array<{ id: string; type: string; url: string; label?: string; createdAt?: string }>
  paymentMethods: Array<{ id: string; type: string; label: string; details: string; isDefault: boolean }>
  advanced: {
    secondaryCategoriesEnabled: boolean
    outOfZoneFallback: boolean
    verifiedClientsOnly: boolean
    depositOnly: boolean
    escrowOnly: boolean
    maxConcurrentMissions: number
    batterySaver: boolean
    highAvailability: boolean
    autoReplyEnabled: boolean
    autoReplyMessage: string
  }
  performance: {
    totalMissions: number
    completedMissions: number
    successRate: number
    avgResponseMinutes: number
    avgArrivalMinutes: number
    ratingAvg: number
    ratingCount: number
    cancellationRate: number
    revenueFcfa: number
    monthlyTrend: number
  }
  premium: {
    tier: string
    features: string[]
    visibilityRadiusKm: number
    priorityLevel: number
    credits: number
    expiresAt: string | null
    autoRenewal: boolean
  }
  currentLoad: number
  maxConcurrentMissions: number
  createdAt: string
  updatedAt: string
}

const emptyProfile: ProviderDashboardProfile = {
  _id: '', userId: '', xeuyId: '', accountStatus: 'active', memberSince: '',
  name: '', avatarUrl: '', phone: '', email: '', company: '', address: '', city: '', country: '',
  referralCode: '', referralBalance: 0, referralCount: 0, kycVerified: false,
  kyc: { status: 'none', phoneVerified: false, emailVerified: false, idVerified: false, selfieVerified: false, addressVerified: false, rejectionReason: '' },
  personal: { firstName: '', lastName: '', businessName: '', gender: '', birthDate: '', bio: '', spokenLanguages: [], experienceYears: 0 },
  categories: { primary: [], secondary: [], subCategories: {} },
  zone: { city: '', region: '', country: 'Sénégal', departments: [], regions: [], radiusKm: 10, coordinates: null },
  availability: { status: 'offline', workingDays: [1, 2, 3, 4, 5, 6], startTime: '08:00', endTime: '18:00', lunchStart: '13:00', lunchEnd: '14:00', exceptions: [] },
  missionPreferences: { urgent: true, planned: true, troubleshooting: true, installation: true, maintenance: true, longMissions: true, shortMissions: true, minAmount: 0, maxDistanceKm: 50, maxDurationHours: 8 },
  notifications: { channels: { push: true, sms: true, email: false, call: false }, events: { newMission: true, missionAssigned: true, payment: true, message: true, promotion: false, news: false, reminder: true } },
  visibility: { visible: true, autoAcceptRequests: false, showPhone: false, showCompany: true, showExactLocation: false, publicProfile: true, showReviews: true, showAddress: false, allowAnonymousStats: true },
  portfolio: [], paymentMethods: [],
  advanced: { secondaryCategoriesEnabled: false, outOfZoneFallback: false, verifiedClientsOnly: false, depositOnly: false, escrowOnly: false, maxConcurrentMissions: 3, batterySaver: false, highAvailability: false, autoReplyEnabled: false, autoReplyMessage: '' },
  performance: { totalMissions: 0, completedMissions: 0, successRate: 0, avgResponseMinutes: 0, avgArrivalMinutes: 0, ratingAvg: 0, ratingCount: 0, cancellationRate: 0, revenueFcfa: 0, monthlyTrend: 0 },
  premium: { tier: 'free', features: [], visibilityRadiusKm: 10, priorityLevel: 0, credits: 0, expiresAt: null, autoRenewal: false },
  currentLoad: 0, maxConcurrentMissions: 3, createdAt: '', updatedAt: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay = 600) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function formatDate(iso: string) {
  if (!iso) return '-'
  try { return new Date(iso).toLocaleDateString('fr-FR') } catch { return iso }
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'PR'
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

const RADIUS_OPTIONS = [5, 10, 20, 30, 50, 100]

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money',
  bank_account: 'Compte bancaire', wallet_xeuy: 'Wallet Xeuy', iban: 'IBAN'
}

// ─── Small UI Components ─────────────────────────────────────────────────────

function SectionCard({ children, title, icon: Icon, action, onAction }: { children: React.ReactNode; title: string; icon?: any; action?: string; onAction?: () => void }) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          {Icon ? <View style={s.cardIconWrap}><Icon size={18} color={colors.primary} /></View> : null}
          <Text style={s.cardTitle}>{title}</Text>
        </View>
        {action ? (
          <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
            <Text style={s.cardAction}>{action}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  )
}

function SwitchRow({ label, value, onValueChange, sub }: { label: string; value: boolean; onValueChange: (v: boolean) => void; sub?: string }) {
  return (
    <View style={s.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.switchLabel}>{label}</Text>
        {sub ? <Text style={s.switchSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : '#fff'}
      />
    </View>
  )
}

function InfoRow({ label, value, icon: Icon, onPress }: { label: string; value?: string | number; icon?: any; onPress?: () => void }) {
  const content = (
    <View style={s.infoRow}>
      <View style={s.infoRowLeft}>
        {Icon ? <Icon size={16} color={colors.textMuted} style={{ marginRight: 10 }} /> : null}
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <View style={s.infoRowRight}>
        <Text style={s.infoValue} numberOfLines={1}>{value ?? '-'}</Text>
        {onPress ? <ChevronRight size={16} color={colors.textMuted} /> : null}
      </View>
    </View>
  )
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>
  return content
}

function Badge({ label, type }: { label: string; type: 'success' | 'warning' | 'danger' | 'info' }) {
  const bg = { success: colors.successLight, warning: colors.warningLight, danger: colors.dangerLight, info: colors.infoLight }[type]
  const color = { success: colors.success, warning: colors.warning, danger: colors.danger, info: colors.info }[type]
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{label}</Text>
    </View>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

function Profile() {
  const { t, i18n } = useTranslation()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ProviderDashboardProfile>(emptyProfile)
  const [draft, setDraft] = useState<ProviderDashboardProfile>(emptyProfile)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [referral, setReferral] = useState<{ code: string; balance: number; count: number } | null>(null)
  const [offersStats, setOffersStats] = useState({ total: 0, accepted: 0, revenue: 0 })

  // Modals
  const [editField, setEditField] = useState<{ key: string; label: string; value: string; multiline?: boolean } | null>(null)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [pickerMode, setPickerMode] = useState<'primary' | 'secondary'>('primary')
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [newPayment, setNewPayment] = useState<{ type: string; details: string } | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ personal: true, kyc: true })

  const changedRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const [p, cats, ref, offers] = await Promise.all([
        apiGet('/api/provider/profile'),
        loadCategories(),
        apiGetRetry('/api/auth/referral').catch(() => null),
        apiGet('/api/services/offers?mine=1').catch(() => ({ items: [] })),
      ])
      const prof = p.profile || emptyProfile
      setProfile(prof)
      setDraft(prof)
      setCategories(cats)
      if (ref) setReferral({ code: ref.referralCode, balance: ref.referralBalance, count: ref.referralCount })
      const items = offers.items || []
      const accepted = items.filter((i: any) => ['accepted', 'in_progress', 'completed'].includes(i.status)).length
      const revenue = items.filter((i: any) => ['completed', 'accepted'].includes(i.status)).reduce((sum: number, i: any) => sum + (i.price || 0), 0)
      setOffersStats({ total: items.length, accepted, revenue })
      if (prof.name) updateAuthUser({ name: prof.name, avatarUrl: prof.avatarUrl, phone: prof.phone })
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || 'Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const saveProfile = useCallback(async (next: ProviderDashboardProfile) => {
    setSaving(true)
    try {
      const r = await apiPatch('/api/provider/profile', {
        name: next.name,
        phone: next.phone,
        email: next.email,
        company: next.personal.businessName || next.company,
        address: next.address,
        city: next.zone.city || next.city,
        country: next.zone.country || next.country,
        firstName: next.personal.firstName,
        lastName: next.personal.lastName,
        businessName: next.personal.businessName,
        gender: next.personal.gender,
        birthDate: next.personal.birthDate,
        bio: next.personal.bio,
        spokenLanguages: next.personal.spokenLanguages,
        experienceYears: next.personal.experienceYears,
        categories: next.categories,
        zone: next.zone,
        availability: next.availability,
        missionPreferences: next.missionPreferences,
        notifications: next.notifications,
        visibility: next.visibility,
        advanced: next.advanced,
        paymentMethods: next.paymentMethods,
        portfolio: next.portfolio,
      } as any)
      setProfile(r.profile)
      setDraft(r.profile)
      if (r.profile.name) updateAuthUser({ name: r.profile.name, avatarUrl: r.profile.avatarUrl, phone: r.profile.phone })
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }, [t])

  // Auto-save on draft changes (debounced)
  const debouncedDraft = useDebounce(draft, 900)
  useEffect(() => {
    if (!changedRef.current) return
    changedRef.current = false
    if (JSON.stringify(debouncedDraft) !== JSON.stringify(profile)) {
      saveProfile(debouncedDraft)
    }
  }, [debouncedDraft, profile, saveProfile])

  const updateDraft = (updater: (d: ProviderDashboardProfile) => ProviderDashboardProfile) => {
    setDraft(prev => {
      changedRef.current = true
      return updater(prev)
    })
  }

  const promptAvatarSource = (): Promise<'camera' | 'gallery' | 'avatar' | null> => {
    return new Promise((resolve) => {
      const options = [t('profile.avatarCamera'), t('profile.avatarGallery'), t('profile.avatarGenerated'), t('common.cancel')]
      const actions: Array<'camera' | 'gallery' | 'avatar' | null> = ['camera', 'gallery', 'avatar', null]
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 3, title: t('profile.avatarTitle') },
          (idx) => resolve(actions[idx] ?? null)
        )
      } else {
        Alert.alert(t('profile.avatarTitle'), '', [
          { text: options[0], onPress: () => resolve('camera') },
          { text: options[1], onPress: () => resolve('gallery') },
          { text: options[2], onPress: () => resolve('avatar') },
          { text: options[3], style: 'cancel', onPress: () => resolve(null) },
        ], { cancelable: true })
      }
    })
  }

  const changeAvatar = async () => {
    const source = await promptAvatarSource()
    if (!source) return
    if (source === 'avatar') {
      updateDraft(d => ({ ...d, avatarUrl: '' }))
      updateAuthUser({ avatarUrl: '' })
      return
    }
    const assets = source === 'camera' ? await captureMedia({ selfie: true }) : await pickMedia({ maxFiles: 1 })
    if (!assets.length) return
    const file = assets[0]
    const contentType = file.type === 'video' ? 'video/mp4' : 'image/jpeg'
    const uploaded = await apiUpload(file.uri, file.name, contentType, 'avatars')
    const avatarUrl = uploaded.staticUrl || uploaded.url
    updateDraft(d => ({ ...d, avatarUrl }))
    updateAuthUser({ avatarUrl })
  }

  const toggleCategory = (slug: string, mode: 'primary' | 'secondary') => {
    const maxPrimary = 5
    updateDraft(d => {
      const list = mode === 'primary' ? [...d.categories.primary] : [...d.categories.secondary]
      const idx = list.indexOf(slug)
      if (idx >= 0) list.splice(idx, 1)
      else {
        if (mode === 'primary' && list.length >= maxPrimary) {
          Alert.alert(t('profile.maxCategories', { max: maxPrimary }))
          return d
        }
        list.push(slug)
      }
      return { ...d, categories: { ...d.categories, [mode === 'primary' ? 'primary' : 'secondary']: list } }
    })
  }

  const toggleSubCategory = (catSlug: string, subSlug: string) => {
    updateDraft(d => {
      const subs = { ...d.categories.subCategories }
      const arr = [...(subs[catSlug] || [])]
      const idx = arr.indexOf(subSlug)
      if (idx >= 0) arr.splice(idx, 1)
      else arr.push(subSlug)
      subs[catSlug] = arr
      return { ...d, categories: { ...d.categories, subCategories: subs } }
    })
  }

  const updateNested = <S extends keyof ProviderDashboardProfile>(section: S, key: keyof ProviderDashboardProfile[S], value: any) => {
    updateDraft(d => ({ ...d, [section]: { ...(d as any)[section], [key]: value } } as any))
  }

  const addPaymentMethod = (type: string, details: string, label: string) => {
    updateDraft(d => ({
      ...d,
      paymentMethods: [...d.paymentMethods.filter(m => m.type !== type), { id: `${type}-${Date.now()}`, type, details, label, isDefault: d.paymentMethods.length === 0 }]
    }))
    setPaymentModalOpen(false)
  }

  const removePaymentMethod = (id: string) => {
    updateDraft(d => ({ ...d, paymentMethods: d.paymentMethods.filter(m => m.id !== id) }))
  }

  const openEdit = (key: string, label: string, value: string, multiline = false) => {
    setEditField({ key, label, value, multiline })
  }

  const saveEdit = (val: string) => {
    if (!editField) return
    const { key, multiline } = editField
    if (key.startsWith('personal.')) {
      const k = key.split('.')[1]
      updateDraft(d => ({ ...d, personal: { ...d.personal, [k]: multiline ? val.trim() : val.trim() } }))
    } else if (key === 'name') {
      updateDraft(d => ({ ...d, name: val.trim() }))
    } else if (['phone', 'email', 'address'].includes(key)) {
      updateDraft(d => ({ ...d, [key]: val.trim() }))
    } else if (key === 'zone.city') {
      updateNested('zone', 'city', val.trim())
    } else if (key === 'zone.region') {
      updateNested('zone', 'region', val.trim())
    }
    setEditField(null)
  }

  const logout = async () => {
    await clearAuth(); resetSocket(); resetNotificationBinding()
    router.replace('/login')
  }

  const lang = i18n.language as 'fr' | 'en' | 'wo'

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <AppHeader title={t('profile.title')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const displayName = draft.name || `${draft.personal.firstName} ${draft.personal.lastName}`.trim() || t('profile.defaultName')
  const isVerified = draft.kycVerified || draft.kyc.status === 'approved'

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader title={t('profile.title')} onBack={() => router.back()} showBell onBell={() => router.push('/notifications')} />

      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.cover}>
            <View style={s.coverGradient} />
          </View>
          <View style={s.heroContent}>
            <TouchableOpacity activeOpacity={0.9} onPress={changeAvatar} style={s.avatarWrap}>
              {draft.avatarUrl ? (
                <Image source={{ uri: resolveMediaUrl(draft.avatarUrl) }} style={s.avatarImage} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials(displayName)}</Text>
                </View>
              )}
              <View style={s.cameraBadge}>
                <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.heroName}>{displayName}</Text>
              <View style={s.heroMetaRow}>
                <Badge label={isVerified ? t('menu.verified') : t('profile.kycPending')} type={isVerified ? 'success' : 'warning'} />
                {draft.premium.tier !== 'free' ? <Badge label={draft.premium.tier.toUpperCase()} type="info" /> : null}
                <Text style={s.heroMeta}>{t('profile.memberSince')} {formatDate(draft.memberSince)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Online status */}
        <View style={s.statusCard}>
          <Text style={s.statusTitle}>{t('home.online')}</Text>
          <View style={s.statusOptions}>
            {(['available_now', 'busy', 'paused', 'vacation', 'offline'] as AvailabilityStatus[]).map(st => (
              <TouchableOpacity
                key={st}
                style={[s.statusPill, draft.availability.status === st && s.statusPillActive]}
                onPress={() => updateNested('availability', 'status', st)}
              >
                <View style={[s.statusDot, { backgroundColor: st === 'offline' ? colors.textMuted : st === 'available_now' ? colors.success : st === 'busy' ? colors.danger : st === 'paused' ? colors.warning : colors.info }]} />
                <Text style={[s.statusPillText, draft.availability.status === st && s.statusPillTextActive]}>{t(`profile.status_${st}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.loadRow}>
            <Text style={s.loadText}>{t('profile.currentLoad')} {draft.currentLoad} / {draft.advanced.maxConcurrentMissions}</Text>
            <View style={s.loadBar}>
              <View style={[s.loadFill, { width: `${Math.min(100, (draft.currentLoad / Math.max(1, draft.advanced.maxConcurrentMissions)) * 100)}%` }]} />
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{offersStats.total}</Text>
            <Text style={s.statLabel}>{t('profile.statOffers')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{offersStats.accepted}</Text>
            <Text style={s.statLabel}>{t('profile.statAccepted')}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{offersStats.revenue.toLocaleString('fr-FR')}</Text>
            <Text style={s.statLabel}>{t('profile.statRevenue')}</Text>
          </View>
        </View>

        {/* Performance */}
        <SectionCard title={t('profile.performance')} icon={Star}>
          <View style={s.grid4}>
            <View style={s.metric}>
              <Text style={s.metricValue}>{draft.performance.completedMissions}</Text>
              <Text style={s.metricLabel}>{t('profile.completedMissions')}</Text>
            </View>
            <View style={s.metric}>
              <Text style={s.metricValue}>{draft.performance.ratingAvg.toFixed(1)}</Text>
              <Text style={s.metricLabel}>{t('profile.rating')}</Text>
            </View>
            <View style={s.metric}>
              <Text style={s.metricValue}>{draft.performance.successRate}%</Text>
              <Text style={s.metricLabel}>{t('profile.successRate')}</Text>
            </View>
            <View style={s.metric}>
              <Text style={s.metricValue}>{(draft.performance.avgResponseMinutes || 0).toFixed(0)}</Text>
              <Text style={s.metricLabel}>{t('profile.avgResponse')}</Text>
            </View>
          </View>
        </SectionCard>

        {/* Personal info */}
        <SectionCard title={t('profile.personal')} icon={User} action={expanded.personal ? t('common.close') : t('profile.edit')} onAction={() => setExpanded(e => ({ ...e, personal: !e.personal }))}>
          {expanded.personal && (
            <View style={s.form}>
              <View style={s.row2}>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('personal.firstName', t('profile.firstName'), draft.personal.firstName)}>
                  <Text style={s.inputLabel}>{t('profile.firstName')}</Text>
                  <Text style={s.inputValue}>{draft.personal.firstName || '-'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('personal.lastName', t('profile.lastName'), draft.personal.lastName)}>
                  <Text style={s.inputLabel}>{t('profile.lastName')}</Text>
                  <Text style={s.inputValue}>{draft.personal.lastName || '-'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.inputWrapFull} onPress={() => openEdit('name', t('profile.displayName'), draft.name)}>
                <Text style={s.inputLabel}>{t('profile.displayName')}</Text>
                <Text style={s.inputValue}>{draft.name || '-'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.inputWrapFull} onPress={() => openEdit('personal.businessName', t('profile.businessName'), draft.personal.businessName)}>
                <Text style={s.inputLabel}>{t('profile.businessName')}</Text>
                <Text style={s.inputValue}>{draft.personal.businessName || '-'}</Text>
              </TouchableOpacity>
              <View style={s.row2}>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('phone', t('auth.phoneLabel'), draft.phone)}>
                  <Text style={s.inputLabel}>{t('auth.phoneLabel')}</Text>
                  <Text style={s.inputValue}>{draft.phone || '-'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('email', 'Email', draft.email)}>
                  <Text style={s.inputLabel}>Email</Text>
                  <Text style={s.inputValue}>{draft.email || '-'}</Text>
                </TouchableOpacity>
              </View>
              <View style={s.row2}>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('zone.city', t('profile.city'), draft.zone.city || draft.city)}>
                  <Text style={s.inputLabel}>{t('profile.city')}</Text>
                  <Text style={s.inputValue}>{draft.zone.city || draft.city || '-'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.inputWrap} onPress={() => openEdit('zone.region', t('profile.region'), draft.zone.region)}>
                  <Text style={s.inputLabel}>{t('profile.region')}</Text>
                  <Text style={s.inputValue}>{draft.zone.region || '-'}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.inputWrapFull} onPress={() => openEdit('personal.bio', t('profile.bio'), draft.personal.bio, true)}>
                <Text style={s.inputLabel}>{t('profile.bio')}</Text>
                <Text style={s.inputValue} numberOfLines={2}>{draft.personal.bio || '-'}</Text>
              </TouchableOpacity>
              <InfoRow label={t('profile.memberSince')} value={formatDate(draft.memberSince)} />
              <InfoRow label={t('profile.xeuyId')} value={draft.xeuyId} />
            </View>
          )}
        </SectionCard>

        {/* KYC */}
        <SectionCard title={t('profile.kyc')} icon={Shield} action={draft.kyc.status === 'approved' ? undefined : t('profile.verify')} onAction={() => { if (!isVerified) router.push('/kyc') }}>
          <View style={s.kycGrid}>
            {[
              { key: 'phoneVerified', label: t('profile.kycPhone'), ok: draft.kyc.phoneVerified },
              { key: 'emailVerified', label: t('profile.kycEmail'), ok: draft.kyc.emailVerified },
              { key: 'idVerified', label: t('profile.kycIdentity'), ok: draft.kyc.idVerified },
              { key: 'selfieVerified', label: t('profile.kycSelfie'), ok: draft.kyc.selfieVerified },
              { key: 'addressVerified', label: t('profile.kycAddress'), ok: draft.kyc.addressVerified },
            ].map(item => (
              <View key={item.key} style={s.kycItem}>
                {item.ok ? <CheckCircle2 size={18} color={colors.success} /> : <AlertCircle size={18} color={colors.textMuted} />}
                <Text style={[s.kycLabel, item.ok && s.kycLabelDone]}>{item.label}</Text>
              </View>
            ))}
          </View>
          {draft.kyc.status === 'rejected' && draft.kyc.rejectionReason ? (
            <View style={s.rejectedBox}>
              <Text style={s.rejectedTitle}>{t('kyc.rejected')}</Text>
              <Text style={s.rejectedReason}>{draft.kyc.rejectionReason}</Text>
              <TouchableOpacity style={s.rejectedBtn} onPress={() => router.push('/kyc')}>
                <Text style={s.rejectedBtnText}>{t('kyc.submit')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </SectionCard>

        {/* Categories */}
        <SectionCard title={t('profile.activities')} icon={Briefcase} action={t('profile.edit')} onAction={() => { setPickerMode('primary'); setCategoryModalOpen(true) }}>
          <View style={s.chipWrap}>
            {draft.categories.primary.map(slug => {
              const cat = categories.find(c => c.slug === slug)
              return <View key={slug} style={[s.chip, { backgroundColor: getCategoryMeta(slug).bg }]}><Text style={[s.chipText, { color: getCategoryMeta(slug).color }]}>{cat ? getCategoryLabel(cat, lang) : getCategoryMeta(slug).label}</Text></View>
            })}
            {draft.categories.primary.length === 0 && <Text style={s.emptyChip}>{t('profile.noCategories')}</Text>}
          </View>
          <Text style={s.sectionHint}>{t('profile.secondaryHint')}</Text>
          <View style={s.chipWrap}>
            {draft.categories.secondary.map(slug => {
              const cat = categories.find(c => c.slug === slug)
              return <View key={slug} style={s.chipSecondary}><Text style={s.chipSecondaryText}>{cat ? getCategoryLabel(cat, lang) : slug}</Text></View>
            })}
            {draft.categories.secondary.length === 0 && <Text style={s.emptyChip}>{t('profile.noSecondary')}</Text>}
          </View>
        </SectionCard>

        {/* Zone */}
        <SectionCard title={t('profile.zone')} icon={MapPin}>
          <Text style={s.sliderLabel}>{t('profile.radius')} : {draft.zone.radiusKm} km</Text>
          <View style={s.sliderRow}>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity key={r} style={[s.sliderPill, draft.zone.radiusKm === r && s.sliderPillActive]} onPress={() => updateNested('zone', 'radiusKm', r)}>
                <Text style={[s.sliderPillText, draft.zone.radiusKm === r && s.sliderPillTextActive]}>{r} km</Text>
              </TouchableOpacity>
            ))}
          </View>
          <InfoRow label={t('profile.city')} value={draft.zone.city || draft.city} icon={MapPin} onPress={() => openEdit('zone.city', t('profile.city'), draft.zone.city || draft.city)} />
          <InfoRow label={t('profile.region')} value={draft.zone.region} icon={MapPin} onPress={() => openEdit('zone.region', t('profile.region'), draft.zone.region)} />
        </SectionCard>

        {/* Mission preferences */}
        <SectionCard title={t('profile.preferences')} icon={Zap}>
          <SwitchRow label={t('profile.urgent')} value={draft.missionPreferences.urgent} onValueChange={v => updateNested('missionPreferences', 'urgent', v)} />
          <SwitchRow label={t('profile.planned')} value={draft.missionPreferences.planned} onValueChange={v => updateNested('missionPreferences', 'planned', v)} />
          <SwitchRow label={t('profile.troubleshooting')} value={draft.missionPreferences.troubleshooting} onValueChange={v => updateNested('missionPreferences', 'troubleshooting', v)} />
          <SwitchRow label={t('profile.installation')} value={draft.missionPreferences.installation} onValueChange={v => updateNested('missionPreferences', 'installation', v)} />
          <SwitchRow label={t('profile.maintenance')} value={draft.missionPreferences.maintenance} onValueChange={v => updateNested('missionPreferences', 'maintenance', v)} />
          <View style={s.row2}>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>{t('profile.minAmount')} (FCFA)</Text>
              <TextInput
                style={s.nativeInput}
                keyboardType="numeric"
                value={String(draft.missionPreferences.minAmount)}
                onChangeText={text => updateNested('missionPreferences', 'minAmount', Number(text.replace(/[^0-9]/g, '')) || 0)}
              />
            </View>
            <View style={s.inputWrap}>
              <Text style={s.inputLabel}>{t('profile.maxDuration')} (h)</Text>
              <TextInput
                style={s.nativeInput}
                keyboardType="numeric"
                value={String(draft.missionPreferences.maxDurationHours)}
                onChangeText={text => updateNested('missionPreferences', 'maxDurationHours', Math.min(72, Number(text.replace(/[^0-9]/g, '')) || 1))}
              />
            </View>
          </View>
        </SectionCard>

        {/* Notifications */}
        <SectionCard title={t('profile.notifications')} icon={Bell}>
          <Text style={s.subSectionTitle}>{t('profile.channels')}</Text>
          <SwitchRow label={t('profile.push')} value={draft.notifications.channels.push} onValueChange={v => updateNested('notifications', 'channels', { ...draft.notifications.channels, push: v })} />
          <SwitchRow label={t('profile.sms')} value={draft.notifications.channels.sms} onValueChange={v => updateNested('notifications', 'channels', { ...draft.notifications.channels, sms: v })} />
          <SwitchRow label={t('profile.email')} value={draft.notifications.channels.email} onValueChange={v => updateNested('notifications', 'channels', { ...draft.notifications.channels, email: v })} />
          <SwitchRow label={t('profile.call')} value={draft.notifications.channels.call} onValueChange={v => updateNested('notifications', 'channels', { ...draft.notifications.channels, call: v })} />
          <Text style={s.subSectionTitle}>{t('profile.events')}</Text>
          {(['newMission', 'missionAssigned', 'payment', 'message', 'promotion', 'news', 'reminder'] as const).map(ev => (
            <SwitchRow key={ev} label={t(`profile.event_${ev}`)} value={draft.notifications.events[ev]} onValueChange={v => updateNested('notifications', 'events', { ...draft.notifications.events, [ev]: v })} />
          ))}
        </SectionCard>

        {/* Visibility */}
        <SectionCard title={t('profile.visibility')} icon={Eye}>
          <SwitchRow label={t('profile.visible')} value={draft.visibility.visible} onValueChange={v => updateNested('visibility', 'visible', v)} />
          <SwitchRow label={t('profile.autoAccept')} value={draft.visibility.autoAcceptRequests} onValueChange={v => updateNested('visibility', 'autoAcceptRequests', v)} sub={t('profile.autoAcceptSub')} />
          <SwitchRow label={t('profile.showPhone')} value={draft.visibility.showPhone} onValueChange={v => updateNested('visibility', 'showPhone', v)} />
          <SwitchRow label={t('profile.showCompany')} value={draft.visibility.showCompany} onValueChange={v => updateNested('visibility', 'showCompany', v)} />
          <SwitchRow label={t('profile.showExactLocation')} value={draft.visibility.showExactLocation} onValueChange={v => updateNested('visibility', 'showExactLocation', v)} sub={t('profile.showExactLocationSub')} />
        </SectionCard>

        {/* Portfolio */}
        <SectionCard title={t('profile.portfolio')} icon={Camera} action={t('profile.add')} onAction={() => { /* upload */ }}>
          {draft.portfolio.length === 0 ? (
            <Text style={s.emptyText}>{t('profile.noPortfolio')}</Text>
          ) : (
            <FlatList
              data={draft.portfolio}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={s.portfolioThumb}>
                  {item.url ? <Image source={{ uri: resolveMediaUrl(item.url) }} style={s.portfolioImage} /> : <Camera size={24} color={colors.textMuted} />}
                  <Text style={s.portfolioLabel}>{item.label || item.type}</Text>
                </View>
              )}
              contentContainerStyle={{ gap: spacing.sm }}
            />
          )}
        </SectionCard>

        {/* Payments */}
        <SectionCard title={t('profile.payments')} icon={CircleDollarSign} action={t('profile.add')} onAction={() => { setNewPayment(null); setPaymentModalOpen(true) }}>
          {draft.paymentMethods.length === 0 ? (
            <Text style={s.emptyText}>{t('profile.noPaymentMethod')}</Text>
          ) : (
            draft.paymentMethods.map(m => (
              <View key={m.id} style={s.paymentRow}>
                <View>
                  <Text style={s.paymentType}>{PAYMENT_TYPE_LABELS[m.type] || m.type}</Text>
                  <Text style={s.paymentDetails}>{m.details}</Text>
                </View>
                <TouchableOpacity onPress={() => removePaymentMethod(m.id)}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </SectionCard>

        {/* Premium */}
        <SectionCard title={t('profile.premium')} icon={Award}>
          <View style={s.premiumRow}>
            <View style={s.premiumBadge}>
              <Text style={s.premiumTier}>{draft.premium.tier.toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.premiumTitle}>{t('profile.currentPack')} {draft.premium.tier.toUpperCase()}</Text>
              <Text style={s.premiumSub}>{t('profile.radius')} {draft.premium.visibilityRadiusKm} km · {t('profile.priority')} {draft.premium.priorityLevel}</Text>
            </View>
            <Text style={s.premiumCredits}>{draft.premium.credits}</Text>
          </View>
          <InfoRow label={t('profile.credits')} value={`${draft.premium.credits} crédits`} icon={Zap} onPress={() => router.push('/wallet')} />
        </SectionCard>

        {/* Referral */}
        {draft.referralCode ? (
          <SectionCard title={t('profile.referralTitle')} icon={Phone} action={t('profile.referralShare')} onAction={() => Share.share({ message: t('profile.referralShareProvider', { code: draft.referralCode }) })}>
            <View style={s.referralRow}>
              <View style={s.referralCodeBox}>
                <Text style={s.referralCode}>{draft.referralCode}</Text>
              </View>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{draft.referralBalance.toLocaleString('fr-FR')} FCFA</Text>
                <Text style={s.referralStatLabel}>{t('profile.referralEarned')}</Text>
              </View>
              <View style={s.referralStat}>
                <Text style={s.referralStatNum}>{draft.referralCount}</Text>
                <Text style={s.referralStatLabel}>{t('profile.referralCount')}</Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        {/* Advanced */}
        <SectionCard title={t('profile.advanced')} icon={Settings}>
          <SwitchRow label={t('profile.secondaryCategoriesEnabled')} value={draft.advanced.secondaryCategoriesEnabled} onValueChange={v => updateNested('advanced', 'secondaryCategoriesEnabled', v)} />
          <SwitchRow label={t('profile.outOfZoneFallback')} value={draft.advanced.outOfZoneFallback} onValueChange={v => updateNested('advanced', 'outOfZoneFallback', v)} />
          <SwitchRow label={t('profile.verifiedClientsOnly')} value={draft.advanced.verifiedClientsOnly} onValueChange={v => updateNested('advanced', 'verifiedClientsOnly', v)} />
          <SwitchRow label={t('profile.depositOnly')} value={draft.advanced.depositOnly} onValueChange={v => updateNested('advanced', 'depositOnly', v)} />
          <SwitchRow label={t('profile.escrowOnly')} value={draft.advanced.escrowOnly} onValueChange={v => updateNested('advanced', 'escrowOnly', v)} />
          <SwitchRow label={t('profile.batterySaver')} value={draft.advanced.batterySaver} onValueChange={v => updateNested('advanced', 'batterySaver', v)} />
          <SwitchRow label={t('profile.highAvailability')} value={draft.advanced.highAvailability} onValueChange={v => updateNested('advanced', 'highAvailability', v)} />
          <View style={s.inputWrapFull}>
            <Text style={s.inputLabel}>{t('profile.maxConcurrentMissions')}</Text>
            <TextInput
              style={s.nativeInput}
              keyboardType="numeric"
              value={String(draft.advanced.maxConcurrentMissions)}
              onChangeText={text => updateNested('advanced', 'maxConcurrentMissions', Math.min(20, Math.max(1, Number(text.replace(/[^0-9]/g, '')) || 1)))}
            />
          </View>
        </SectionCard>

        {/* Support */}
        <SectionCard title={t('profile.support')} icon={HelpCircle}>
          <TouchableOpacity style={s.supportRow} onPress={() => {}}>
            <HelpCircle size={18} color={colors.textSecondary} />
            <Text style={s.supportText}>{t('profile.faq')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.supportRow} onPress={() => {}}>
            <Mail size={18} color={colors.textSecondary} />
            <Text style={s.supportText}>{t('profile.supportContact')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.supportRow} onPress={() => {}}>
            <FileText size={18} color={colors.textSecondary} />
            <Text style={s.supportText}>{t('profile.terms')}</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </SectionCard>

        {/* Language & Logout */}
        <SectionCard title={t('profile.language')} icon={Globe}>
          <LanguagePicker />
        </SectionCard>

        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>

        {saving && <View style={s.savingPill}><ActivityIndicator size="small" color={colors.surface} /><Text style={s.savingText}>{t('common.save')}</Text></View>}
      </ScrollView>

      {/* Edit text modal */}
      <Modal visible={!!editField} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>{editField?.label}</Text>
            <TextInput
              style={[s.nativeInput, { minHeight: editField?.multiline ? 100 : 48 }]}
              value={editField?.value}
              onChangeText={text => setEditField(f => f ? { ...f, value: text } : null)}
              multiline={editField?.multiline}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setEditField(null)}>
                <Text style={s.modalBtnSecondaryText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalBtnPrimary} onPress={() => saveEdit(editField?.value || '')}>
                <Text style={s.modalBtnPrimaryText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category picker modal */}
      <Modal visible={categoryModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { maxHeight: '80%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{pickerMode === 'primary' ? t('profile.choosePrimary') : t('profile.chooseSecondary')}</Text>
              <TouchableOpacity onPress={() => setCategoryModalOpen(false)}>
                <Text style={s.modalClose}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
            <View style={s.modeTabs}>
              <TouchableOpacity style={[s.modeTab, pickerMode === 'primary' && s.modeTabActive]} onPress={() => setPickerMode('primary')}>
                <Text style={[s.modeTabText, pickerMode === 'primary' && s.modeTabTextActive]}>{t('profile.primary')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modeTab, pickerMode === 'secondary' && s.modeTabActive]} onPress={() => setPickerMode('secondary')}>
                <Text style={[s.modeTabText, pickerMode === 'secondary' && s.modeTabTextActive]}>{t('profile.secondary')}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={item => item.slug}
              renderItem={({ item }) => {
                const selected = pickerMode === 'primary' ? draft.categories.primary.includes(item.slug) : draft.categories.secondary.includes(item.slug)
                const isPrimary = draft.categories.primary.includes(item.slug)
                return (
                  <View>
                    <TouchableOpacity style={[s.catRow, selected && s.catRowActive]} onPress={() => toggleCategory(item.slug, pickerMode)}>
                      <View style={[s.catDot, { backgroundColor: item.color }]} />
                      <Text style={s.catLabel}>{getCategoryLabel(item, lang)}</Text>
                      {selected ? <CheckCircle2 size={20} color={colors.primary} /> : <View style={s.catCheck} />}
                    </TouchableOpacity>
                    {isPrimary && item.subCategories && item.subCategories.length > 0 && (
                      <View style={s.subCatWrap}>
                        {item.subCategories.map((sub: SubCategory) => {
                          const active = (draft.categories.subCategories[item.slug] || []).includes(sub.slug)
                          return (
                            <TouchableOpacity key={sub.slug} style={[s.subCatPill, active && s.subCatPillActive]} onPress={() => toggleSubCategory(item.slug, sub.slug)}>
                              <Text style={[s.subCatText, active && s.subCatTextActive]}>{getSubCategoryLabel(sub, lang)}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    )}
                  </View>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Payment method modal */}
      <Modal visible={paymentModalOpen} animationType="slide" transparent onRequestClose={() => { setPaymentModalOpen(false); setNewPayment(null) }}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {newPayment ? (
              <>
                <Text style={s.modalTitle}>{PAYMENT_TYPE_LABELS[newPayment.type]} — {t('profile.paymentDetails')}</Text>
                <TextInput
                  style={s.nativeInput}
                  value={newPayment.details}
                  onChangeText={text => setNewPayment({ ...newPayment, details: text })}
                  placeholder={t('profile.paymentDetails')}
                  autoFocus
                />
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setNewPayment(null)}>
                    <Text style={s.modalBtnSecondaryText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.modalBtnPrimary} onPress={() => addPaymentMethod(newPayment.type, newPayment.details, PAYMENT_TYPE_LABELS[newPayment.type])}>
                    <Text style={s.modalBtnPrimaryText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={s.modalTitle}>{t('profile.addPaymentMethod')}</Text>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([type, label]) => (
                  <TouchableOpacity
                    key={type}
                    style={s.paymentOption}
                    onPress={() => setNewPayment({ type, details: '' })}
                  >
                    <Text style={s.paymentOptionText}>{label}</Text>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.modalBtnPrimary} onPress={() => setPaymentModalOpen(false)}>
                  <Text style={s.modalBtnPrimaryText}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <TabBar active="profile" />
    </SafeAreaView>
  )
}

// Category meta fallback (copied from design for safety)
function getCategoryMeta(key?: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    electricite: { color: '#2563EB', bg: '#EFF6FF', label: 'Électricité' },
    plomberie: { color: '#0891B2', bg: '#E0F2FE', label: 'Plomberie' },
    menuiserie: { color: '#EA580C', bg: '#FFF7ED', label: 'Menuiserie' },
    peinture: { color: '#7C3AED', bg: '#F5F3FF', label: 'Peinture' },
    climatisation: { color: '#06B6D4', bg: '#ECFEFF', label: 'Climatisation' },
    securite: { color: '#166534', bg: '#F0FDF4', label: 'Sécurité' },
  }
  return map[(key || '').toLowerCase()] || { color: colors.navy, bg: '#F1F5F9', label: key || 'Service' }
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },

  hero: { backgroundColor: colors.surface, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
  cover: { height: 90, backgroundColor: colors.navy },
  coverGradient: { flex: 1, opacity: 0.8 },
  heroContent: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md, marginTop: -40 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surface },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: colors.surface },
  avatarText: { color: colors.surface, fontSize: 28, fontWeight: typography.weight.extrabold as any },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  heroName: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap' },
  heroMeta: { fontSize: typography.sm.fontSize, color: colors.textMuted },

  statusCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, ...shadows.sm, borderWidth: 1, borderColor: colors.border },
  statusTitle: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: spacing.md },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  statusPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  statusPillText: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  statusPillTextActive: { color: colors.primary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  loadRow: { marginTop: spacing.md, gap: spacing.xs },
  loadText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  loadBar: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  loadFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  statNum: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text },
  statLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginTop: spacing.xs },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typography.md.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  cardAction: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.semibold as any, color: colors.primary },

  form: { gap: spacing.md },
  row2: { flexDirection: 'row', gap: spacing.md },
  inputWrap: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  inputWrapFull: { backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginBottom: 2 },
  inputValue: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.semibold as any },
  nativeInput: { fontSize: typography.base.fontSize, color: colors.text, padding: 0, minHeight: 24 },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: typography.base.fontSize, color: colors.textSecondary },
  infoRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoValue: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.semibold as any, maxWidth: 160 },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchLabel: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.semibold as any },
  switchSub: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginTop: 2 },

  subSectionTitle: { fontSize: typography.sm.fontSize, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: typography.weight.bold as any },

  kycGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kycItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, width: '47%', paddingVertical: spacing.xs },
  kycLabel: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  kycLabelDone: { color: colors.text, fontWeight: typography.weight.semibold as any },
  rejectedBox: { backgroundColor: colors.dangerLight, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md },
  rejectedTitle: { fontSize: typography.base.fontSize, fontWeight: typography.weight.bold as any, color: colors.danger },
  rejectedReason: { fontSize: typography.sm.fontSize, color: colors.text, marginTop: spacing.xs },
  rejectedBtn: { backgroundColor: colors.danger, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  rejectedBtnText: { color: colors.surface, fontWeight: typography.weight.bold as any },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  chipText: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.bold as any },
  chipSecondary: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipSecondaryText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  emptyChip: { fontSize: typography.sm.fontSize, color: colors.textMuted, fontStyle: 'italic' },
  sectionHint: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginBottom: spacing.xs },

  sliderLabel: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.semibold as any, marginBottom: spacing.sm },
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  sliderPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  sliderPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sliderPillText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  sliderPillTextActive: { color: colors.surface, fontWeight: typography.weight.bold as any },

  grid4: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  metricValue: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  metricLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },

  portfolioThumb: { width: 90, height: 90, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portfolioImage: { width: 90, height: 90 },
  portfolioLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted, position: 'absolute', bottom: 4 },
  emptyText: { fontSize: typography.sm.fontSize, color: colors.textMuted, fontStyle: 'italic', paddingVertical: spacing.sm },

  paymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentType: { fontSize: typography.base.fontSize, fontWeight: typography.weight.semibold as any, color: colors.text },
  paymentDetails: { fontSize: typography.sm.fontSize, color: colors.textMuted },

  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  premiumBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.warningLight, alignItems: 'center', justifyContent: 'center' },
  premiumTier: { fontSize: typography.xs.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.warning },
  premiumTitle: { fontSize: typography.base.fontSize, fontWeight: typography.weight.bold as any, color: colors.text },
  premiumSub: { fontSize: typography.sm.fontSize, color: colors.textMuted },
  premiumCredits: { fontSize: typography.xl.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.primary },

  referralRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  referralCodeBox: { backgroundColor: colors.bg, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  referralCode: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: 2 },
  referralStat: { alignItems: 'center' },
  referralStatNum: { fontSize: typography.base.fontSize, fontWeight: typography.weight.bold as any, color: colors.text },
  referralStatLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted },

  supportRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  supportText: { flex: 1, fontSize: typography.base.fontSize, color: colors.text },

  logoutBtn: { backgroundColor: colors.dangerLight, borderRadius: radius.xl, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA', marginBottom: spacing.xl },
  logoutText: { color: colors.danger, fontWeight: typography.weight.extrabold as any, fontSize: typography.base.fontSize },

  savingPill: { position: 'absolute', bottom: 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  savingText: { color: colors.surface, fontSize: typography.sm.fontSize, fontWeight: typography.weight.bold as any },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl + 20, gap: spacing.md },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  modalTitle: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalClose: { fontSize: typography.base.fontSize, color: colors.textMuted },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  modalBtnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  modalBtnPrimaryText: { color: colors.surface, fontWeight: typography.weight.bold as any, fontSize: typography.base.fontSize },
  modalBtnSecondary: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalBtnSecondaryText: { color: colors.text, fontWeight: typography.weight.bold as any, fontSize: typography.base.fontSize },

  modeTabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modeTab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.bg, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.primary },
  modeTabText: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  modeTabTextActive: { color: colors.surface },

  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  catRowActive: { backgroundColor: colors.primaryLight },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  catLabel: { flex: 1, fontSize: typography.base.fontSize, color: colors.text },
  catCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  subCatWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingLeft: spacing.xl, paddingBottom: spacing.md },
  subCatPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  subCatPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  subCatText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  subCatTextActive: { color: colors.surface },

  paymentOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentOptionText: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.semibold as any },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  badgeText: { fontSize: typography.xs.fontSize, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(Profile, 'Profile')
