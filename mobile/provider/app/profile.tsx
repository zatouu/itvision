import { useEffect, useRef, useState } from 'react'
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import TabBar from '../src/components/TabBar'
import { colors, spacing } from '../src/design'
import { ProfileHeader } from '../src/components/profile/ProfileHeader'
import { PersonalSection, KycSection } from '../src/components/profile/ProfileIdentity'
import { ActivitiesSection, ZoneSection, AvailabilitySection, MissionSection } from '../src/components/profile/ProfileBusiness'
import { NotificationsSection, VisibilitySection, PrivacySection, AdvancedSection } from '../src/components/profile/ProfileSettings'
import { PortfolioSection, PaymentsSection, StatsSection, PremiumSection, CreditsSection, SecuritySection, HelpSection } from '../src/components/profile/ProfileAccount'

const emptyProfile = {
  user: {
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    company: '',
    address: '',
    city: '',
    country: '',
    referralCode: '',
    referralBalance: 0,
    referralCount: 0,
    kycVerified: false,
    providerStats: {
      completedMissions: 0,
      cancelledByProvider: 0,
      cancelledByClient: 0,
      reliabilityScore: 100,
    },
  },
  provider: {
    kycVerified: false,
    serviceCategories: [],
    secondaryCategories: [],
    zone: { city: '', region: '', radiusKm: 10, departments: [], regions: [] },
    coverUrl: '',
    maxConcurrentMissions: 3,
    preferences: {},
  },
  kyc: { status: 'pending', rejectionReason: '' },
  reviews: { average: 0, count: 0 },
}

function Profile() {
  const { t } = useTranslation()
  const [data, setData] = useState(emptyProfile)
  const [loading, setLoading] = useState(true)
  const dirty = useRef(false)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    apiGet('/api/provider/profile')
      .then((r: any) => {
        setData({
          ...emptyProfile,
          ...r,
          user: { ...emptyProfile.user, ...r.user },
          provider: { ...emptyProfile.provider, ...r.provider, preferences: { ...(r.provider?.preferences || {}) } },
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!dirty.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      apiPatch('/api/provider/profile', { user: data.user, provider: data.provider }).catch(() => {})
    }, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [data])

  const onUser = (patch: any) => {
    dirty.current = true
    setData((d) => ({ ...d, user: { ...d.user, ...patch } }))
  }

  const onProvider = (patch: any) => {
    dirty.current = true
    setData((d) => ({ ...d, provider: { ...d.provider, ...patch } }))
  }

  const onPreferences = (patch: any) => {
    dirty.current = true
    setData((d) => ({
      ...d,
      provider: { ...d.provider, preferences: { ...d.provider.preferences, ...patch } },
    }))
  }

  const onHeaderChange = (user: any, provider: any) => {
    dirty.current = true
    setData((d) => ({ ...d, user: { ...d.user, ...user }, provider: { ...d.provider, ...provider } }))
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.body}>
        <ProfileHeader data={data} onChange={onHeaderChange} />
        <PersonalSection data={data} onUser={onUser} onProvider={onProvider} onPreferences={onPreferences} />
        <KycSection data={data} onUser={onUser} onProvider={onProvider} onPreferences={onPreferences} />
        <ActivitiesSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <ZoneSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <AvailabilitySection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <MissionSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <NotificationsSection data={data} onPreferences={onPreferences} />
        <VisibilitySection data={data} onPreferences={onPreferences} />
        <PortfolioSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <PaymentsSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <StatsSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <PremiumSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <CreditsSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <SecuritySection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <PrivacySection data={data} onPreferences={onPreferences} />
        <AdvancedSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
        <HelpSection data={data} onProvider={onProvider} onPreferences={onPreferences} />
      </ScrollView>
      <TabBar active="profile" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { paddingBottom: spacing.xl },
})

export default withScreenBoundary(Profile, 'Profile')
