import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { ArrowLeft, ShieldCheck, Smartphone, Mail, GraduationCap, Wrench, Briefcase, FileCheck, AlertCircle, CheckCircle2, Circle, TrendingUp } from 'lucide-react-native'
import { apiGet } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const VERIFS = (data: any) => [
  { id: 'phone', icon: Smartphone, label: 'Téléphone', done: !!data.user?.phone },
  { id: 'email', icon: Mail, label: 'Email', done: !!data.user?.email },
  { id: 'kyc', icon: ShieldCheck, label: 'KYC', done: data.user?.kycVerified || data.provider?.kycVerified },
  { id: 'skills', icon: Wrench, label: 'Compétences validées', done: (data.provider?.serviceCategories || []).length > 0 },
  { id: 'diploma', icon: GraduationCap, label: 'Diplôme', done: false },
  { id: 'insurance', icon: FileCheck, label: 'Assurance', done: false },
  { id: 'company', icon: Briefcase, label: 'Entreprise / Registre', done: false },
  { id: 'criminal', icon: AlertCircle, label: 'Casier judiciaire', done: false },
]

function Verification() {
  const [data, setData] = useState<any>({ user: {}, provider: {}, kyc: { status: 'pending' } })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/provider/profile').then(setData).finally(() => setLoading(false))
  }, [])

  const items = VERIFS(data)
  const doneCount = items.filter((i) => i.done).length

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Vérification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.scoreCard}>
          <View style={s.scoreTop}>
            <View>
              <Text style={s.scoreTitle}>Score de confiance</Text>
              <Text style={s.scoreValue}>{data.provider?.scoreXeuy || 0}/100</Text>
            </View>
            <View style={s.badge}>
              <TrendingUp size={14} color={colors.success} />
              <Text style={s.badgeText}>Top 5%</Text>
            </View>
          </View>
          <TouchableOpacity style={s.scoreBtn} onPress={() => router.push('/kyc')}>
            <Text style={s.scoreBtnText}>Compléter mes vérifications</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {items.map((v, idx) => {
            const Icon = v.icon
            return (
              <View key={v.id} style={[s.row, idx < items.length - 1 && s.rowBorder]}>
                <View style={[s.icon, v.done ? s.iconDone : s.iconPending]}>
                  <Icon size={18} color={v.done ? '#fff' : colors.textMuted} />
                </View>
                <Text style={[s.label, v.done && s.labelDone]}>{v.label}</Text>
                <Text style={v.done ? s.statusDone : s.statusPending}>{v.done ? 'Validé' : 'À compléter'}</Text>
              </View>
            )
          })}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(doneCount / items.length) * 100}%` }]} />
          </View>
          <Text style={s.progressText}>{doneCount}/{items.length} vérifications complètes</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: 100 },
  scoreCard: { backgroundColor: colors.heroDark, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.lg },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  scoreTitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  scoreValue: { fontSize: 32, fontWeight: '700', color: '#fff' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { fontSize: 12, color: colors.success, fontWeight: '600' },
  scoreBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  scoreBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, ...shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
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

export default withScreenBoundary(Verification, 'Verification')
