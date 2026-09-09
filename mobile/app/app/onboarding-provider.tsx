import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { getCategoryIcon } from '../src/categoryIcons'
import { loadCategories, ServiceCategory, getCategoryLabel } from '../src/categories'
import { apiPost, apiPatch } from '../src/api'
import { updateAuthUser, getAuthUser } from '../src/auth'
import { setMode } from '../src/mode'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSuccess, hapticSelect, hapticError } from '../src/haptics'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Button from '../src/components/Button'
import { MapPin, ChevronLeft, Briefcase, Banknote, Shield, Search, Check } from 'lucide-react-native'

const { width: SCREEN_W } = Dimensions.get('window')
const MIN_RADIUS = 5
const MAX_RADIUS = 30
const STEPS = 3

function OnboardingProvider() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [radiusKm, setRadiusKm] = useState(10)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [cats, setCats] = useState<ServiceCategory[]>([])
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadCategories().then(setCats).catch(() => setCats([]))
  }, [i18n.language])

  useEffect(() => {
    Location.getLastKnownPositionAsync({ maxAge: 300_000, requiredAccuracy: 5000 })
      .then(async pos => {
        if (!pos) return
        try {
          const geo = await Location.reverseGeocodeAsync(pos.coords)
          const first = geo?.[0]
          if (first) {
            const parts = [first.city, first.region, first.country]
            setAddress(parts.filter(Boolean).join(', '))
          }
        } catch {}
      })
      .catch(() => {})
  }, [])

  const toggleCategory = (slug: string) => {
    hapticSelect()
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const submit = async () => {
    if (selected.length === 0) {
      toast.error(t('onboardingProvider.noCategory', { defaultValue: 'Choisissez au moins un métier' }), '')
      hapticError()
      return
    }
    setLoading(true)
    try {
      const res = await apiPost('/api/users/me/provider', {})
      if (res?.providerProfileId) {
        await updateAuthUser({ providerProfileId: res.providerProfileId })
      }
      await apiPatch('/api/provider/profile', {
        provider: {
          serviceCategories: selected,
          zone: { radiusKm },
        },
      })
      setSuccess(true)
      hapticSuccess()
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
      hapticError()
    } finally {
      setLoading(false)
    }
  }

  const finish = async (kyc: boolean) => {
    await setMode('provider')
    if (kyc) {
      router.push('/kyc' as any)
    } else {
      router.replace('/pro-home' as any)
    }
  }

  if (success) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.success}>
          <View style={s.successIcon}>
            <Briefcase size={32} color="#fff" />
          </View>
          <Text style={s.successTitle}>{t('onboardingProvider.successTitle', { defaultValue: 'Votre espace prestataire est prêt' })}</Text>
          <Text style={s.successSub}>{t('onboardingProvider.successSub', { defaultValue: 'Vous pouvez basculer Client / Pro à tout moment depuis le menu.' })}</Text>
          <Button
            title={t('onboardingProvider.goProHome', { defaultValue: 'Découvrir mon accueil Pro' })}
            onPress={() => finish(false)}
            fullWidth
          />
          <View style={{ height: spacing.sm }} />
          <Button
            title={t('onboardingProvider.goKyc', { defaultValue: 'Vérifier mon identité (KYC)' })}
            onPress={() => finish(true)}
            variant="outline"
            fullWidth
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()} style={s.back}>
          <ChevronLeft size={20} color={colors.ink} />
        </TouchableOpacity>
        <Text style={s.title}>{t('onboardingProvider.title', { defaultValue: 'Devenir prestataire' })}</Text>
        <Text style={s.step}>{step}/{STEPS}</Text>
      </View>

      <View style={s.stepper}>
        {Array.from({ length: STEPS }).map((_, i) => (
          <View key={i} style={[s.dot, i + 1 <= step && s.dotActive]}>
            {i + 1 < step && <Check size={10} color="#fff" />}
          </View>
        ))}
      </View>

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('onboardingProvider.whyTitle', { defaultValue: 'Pourquoi devenir prestataire ?' })}</Text>
            <View style={s.whyCard}>
              <Benefit icon={MapPin} text={t('onboardingProvider.why1', { defaultValue: 'Recevez des demandes près de chez vous' })} />
              <Benefit icon={Banknote} text={t('onboardingProvider.why2', { defaultValue: 'Fixez vos prix' })} />
              <Benefit icon={Shield} text={t('onboardingProvider.why3', { defaultValue: 'Paiement sécurisé' })} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('onboardingProvider.categoriesTitle', { defaultValue: 'Vos métiers' })}</Text>
            <Text style={s.sectionSub}>{t('onboardingProvider.categoriesSub', { defaultValue: 'Sélectionnez ceux que vous maîtrisez.' })}</Text>
            <View style={s.grid}>
              {cats.map(cat => {
                const Icon = getCategoryIcon(cat.slug)
                const active = selected.includes(cat.slug)
                return (
                  <TouchableOpacity
                    key={cat.slug}
                    style={[s.cat, active && s.catActive]}
                    activeOpacity={0.8}
                    onPress={() => toggleCategory(cat.slug)}
                  >
                    <View style={[s.catIcon, { backgroundColor: active ? cat.color : `${cat.color}15` }]}>
                      <Icon size={22} color={active ? '#fff' : cat.color} />
                    </View>
                    <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={2}>{getCategoryLabel(cat, i18n.language)}</Text>
                    {active && <View style={s.check}><Check size={12} color="#fff" /></View>}
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity
                key="autre"
                style={[s.cat, selected.includes('autre') && s.catActive]}
                activeOpacity={0.8}
                onPress={() => toggleCategory('autre')}
              >
                <View style={[s.catIcon, { backgroundColor: selected.includes('autre') ? colors.ink : colors.bgDeep }]}>
                  <Briefcase size={22} color={selected.includes('autre') ? '#fff' : colors.ink} />
                </View>
                <Text style={[s.catLabel, selected.includes('autre') && s.catLabelActive]}>{t('onboardingProvider.other', { defaultValue: 'Autre' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('onboardingProvider.zoneTitle', { defaultValue: 'Votre zone' })}</Text>
            <View style={s.map}>
              <View style={s.mapCircle}>
                <Text style={s.mapRadius}>{radiusKm} km</Text>
                <MapPin size={20} color={colors.primary} />
              </View>
            </View>
            <Text style={s.address}>{address || t('onboardingProvider.addressDetecting', { defaultValue: 'Position détectée…' })}</Text>
            <View style={s.sliderRow}>
              <Text style={s.sliderLabel}>{MIN_RADIUS} km</Text>
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${((radiusKm - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%` }]} />
              </View>
              <Text style={s.sliderLabel}>{MAX_RADIUS} km</Text>
            </View>
            <View style={s.stepButtons}>
              {[5, 10, 15, 20, 25, 30].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.radiusChip, radiusKm === r && s.radiusChipActive]}
                  onPress={() => { hapticSelect(); setRadiusKm(r) }}
                >
                  <Text style={[s.radiusChipText, radiusKm === r && s.radiusChipTextActive]}>{r} km</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        {step < STEPS ? (
          <Button
            title={t('common.next')}
            onPress={() => {
              if (step === 2 && selected.length === 0) {
                toast.error(t('onboardingProvider.noCategory', { defaultValue: 'Choisissez au moins un métier' }), '')
                hapticError()
                return
              }
              hapticSelect()
              setStep(step + 1)
            }}
            fullWidth
          />
        ) : (
          <Button
            title={t('onboardingProvider.activate', { defaultValue: 'Activer mon espace' })}
            onPress={submit}
            loading={loading}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  )
}

function Benefit({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.benefit}>
      <View style={s.benefitIcon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <Text style={s.benefitText}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.ink, textAlign: 'center' },
  step: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.primary, minWidth: 32, textAlign: 'right' },
  stepper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, paddingBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.primary, width: 16, height: 16, borderRadius: 8 },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  section: { paddingTop: spacing.sm, gap: spacing.md },
  sectionTitle: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.ink, lineHeight: 28 },
  sectionSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  whyCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  cat: {
    width: (SCREEN_W - spacing.lg * 2 - spacing.sm * 2) / 3,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catActive: { borderColor: colors.primary, backgroundColor: colors.brandTint },
  catIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },
  catLabelActive: { color: colors.brandInk },
  check: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  map: { height: 180, borderRadius: radius.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  mapCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: colors.brandSoft, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  mapRadius: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.brandInk, marginBottom: 4 },
  address: { fontSize: 14, fontWeight: typography.weight.medium as any, color: colors.text, textAlign: 'center' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sliderLabel: { fontSize: 12, color: colors.textMuted, minWidth: 30 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.border },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  stepButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  radiusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  radiusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusChipText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  radiusChipTextActive: { color: '#fff' },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl },
  success: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  successTitle: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.ink, textAlign: 'center' },
  successSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
})

export default withScreenBoundary(OnboardingProvider, 'OnboardingProvider')
