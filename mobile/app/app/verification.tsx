import { createThemedStyles } from '../src/theme'
import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { spacing, radius, typography, shadows } from '../src/design'
import { ShieldCheck, Smartphone, Mail, Wrench } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'

const VERIFS = (data: any) => [
  { id: 'phone', icon: Smartphone, labelKey: 'verificationScreen.items.phone', done: !!data.user?.phone },
  { id: 'email', icon: Mail, labelKey: 'verificationScreen.items.email', done: !!data.user?.email },
  { id: 'kyc', icon: ShieldCheck, labelKey: 'verificationScreen.items.kyc', done: data.user?.kycVerified || data.provider?.kycVerified },
  { id: 'skills', icon: Wrench, labelKey: 'verificationScreen.items.skills', done: (data.provider?.serviceCategories || []).length > 0 },
]

function Verification() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const [data, setData] = useState<any>({ user: {}, provider: {}, kyc: { status: 'pending' } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/provider/profile').then(setData).finally(() => setLoading(false))
  }, [])

  const items = VERIFS(data)
  const doneCount = items.filter((i) => i.done).length

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primaryText} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <BackIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('verificationScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.scoreCard}>
          <View style={s.scoreTop}>
            <View>
              <Text style={s.scoreTitle}>{t('verificationScreen.trustScore')}</Text>
              <Text style={s.scoreValue}>{data.provider?.scoreXeuy || 0}/100</Text>
            </View>
          </View>
          <TouchableOpacity style={s.scoreBtn} onPress={() => router.push('/kyc')}>
            <Text style={s.scoreBtnText}>{t('verificationScreen.completeCta')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {items.map((v, idx) => {
            const Icon = v.icon
            return (
              <View key={v.id} style={[s.row, idx < items.length - 1 && s.rowBorder]}>
                <View style={[s.icon, v.done ? s.iconDone : s.iconPending]}>
                  <Icon size={18} color={v.done ? colors.onPrimary : colors.textMuted} />
                </View>
                <Text style={[s.label, v.done && s.labelDone]}>{t(v.labelKey)}</Text>
                <Text style={v.done ? s.statusDone : s.statusPending}>{v.done ? t('verificationScreen.statusDone') : t('verificationScreen.statusPending')}</Text>
              </View>
            )
          })}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(doneCount / items.length) * 100}%` }]} />
          </View>
          <Text style={s.progressText}>{t('verificationScreen.progress', { done: doneCount, count: items.length })}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(Verification, 'Verification')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
    back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '600', color: colors.text },
    body: { padding: spacing.lg, paddingBottom: 100 },
    scoreCard: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
    scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    scoreTitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
    scoreValue: { fontSize: 32, fontWeight: '700', color: colors.onPrimary },
    scoreBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
    scoreBtnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
    card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    icon: { width: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
    iconDone: { backgroundColor: colors.success },
    iconPending: { backgroundColor: colors.bgGlobal },
    label: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
    labelDone: { color: colors.text },
    statusDone: { fontSize: 13, color: colors.success, fontWeight: '600' },
    statusPending: { fontSize: 13, color: colors.textSecondary },
    progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.bgGlobal, overflow: 'hidden', marginTop: spacing.md },
    progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: radius.pill },
    progressText: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  })
  return { colors, s }
})
