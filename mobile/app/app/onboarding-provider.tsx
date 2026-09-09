import { useEffect, useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as Location from 'expo-location'
import Svg, { Circle, Line } from 'react-native-svg'
import { colors, radius, spacing, typography, shadows, cat } from '../src/design'
import { getCategoryIcon } from '../src/categoryIcons'
import { loadCategories, ServiceCategory, getCategoryLabel } from '../src/categories'
import { reverseGeocode } from '../src/geocode'
import { apiPost, apiPatch } from '../src/api'
import { updateAuthUser } from '../src/auth'
import { setMode } from '../src/mode'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSuccess, hapticSelect, hapticError } from '../src/haptics'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Button from '../src/components/Button'
import Logo from '../src/components/Logo'
import {
  MapPin, ChevronLeft, Wrench, Coins, Shield, Search, Check,
  ArrowRight, ArrowLeftRight, ShieldCheck, Zap, Brush, Plus,
} from 'lucide-react-native'

const { width: SCREEN_W } = Dimensions.get('window')
const MIN_RADIUS = 5
const MAX_RADIUS = 30
const STEPS = 3

function OBStepper({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <View style={s.stepper}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[s.stepperBar, i + 1 <= step && s.stepperBarActive]} />
      ))}
    </View>
  )
}

function Benefit({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <View style={s.benefit}>
      <View style={s.benefitIcon}>
        <Icon size={22} color={colors.brandInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.benefitTitle}>{title}</Text>
        <Text style={s.benefitSub}>{sub}</Text>
      </View>
    </View>
  )
}

function HeroIllustration() {
  return (
    <View style={s.hero}>
      <View style={s.heroCircleLarge} />
      <View style={s.heroCircleSmall} />
      <View style={s.heroTool}>
        <Wrench size={48} color="#fff" strokeWidth={2} />
      </View>
      <View style={[s.heroPin, { top: 20, right: 24 }]}>
        <Zap size={14} color={cat.electricite.bg} />
      </View>
      <View style={[s.heroPin, { bottom: 28, left: 28 }]}>
        <Brush size={14} color={cat.peinture.bg} />
      </View>
    </View>
  )
}

function CategoryTile({
  cat: category,
  selected,
  onPress,
}: {
  cat: ServiceCategory
  selected: boolean
  onPress: () => void
}) {
  const { i18n } = useTranslation()
  const Icon = getCategoryIcon(category.slug)
  return (
    <TouchableOpacity
      style={[s.tile, selected && s.tileActive, { borderColor: selected ? category.color : colors.border } as any]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[s.tileIcon, { backgroundColor: selected ? category.color : `${category.color}15` }]}>
        <Icon size={24} color={selected ? '#fff' : category.color} />
      </View>
      <Text style={[s.tileLabel, selected && { color: category.color }]} numberOfLines={2}>
        {getCategoryLabel(category, i18n.language)}
      </Text>
      {selected && (
        <View style={[s.tileCheck, { backgroundColor: category.color }]}>
          <Check size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  )
}

function StaticRadiusMap({ radiusKm, address }: { radiusKm: number; address?: string }) {
  const size = 220
  const maxR = size / 2 - 10
  const r = Math.max(20, Math.min(maxR, ((radiusKm - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * (maxR - 40) + 40))
  const grid = Array.from({ length: 10 }, (_, i) => i)
  const vertical = Array.from({ length: 16 }, (_, i) => i)

  return (
    <View style={s.mapBox}>
      <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        {grid.map(i => <Line key={`h${i}`} x1="0" y1={i * 26} x2="400" y2={i * 26} stroke="#fff" strokeWidth="1" opacity="0.6" />)}
        {vertical.map(i => <Line key={`v${i}`} x1={i * 26} y1="0" x2={i * 26} y2="240" stroke="#fff" strokeWidth="1" opacity="0.6" />)}
        <Circle cx="200" cy="120" r={r} fill={colors.primary} fillOpacity="0.15" stroke={colors.primary} strokeWidth="2" />
      </Svg>
      <View style={s.mapCenter}>
        <View style={s.mapCenterDot} />
        <View style={s.mapCenterLabel}>
          <Text style={s.mapCenterLabelText} numberOfLines={1}>{address || '…'}</Text>
        </View>
      </View>
      <View style={s.mapRadiusBadge}>
        <Text style={s.mapRadiusBadgeText}>{radiusKm} km</Text>
      </View>
    </View>
  )
}

function OnboardingProvider() {
  const { t, i18n } = useTranslation()
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [radiusKm, setRadiusKm] = useState(10)
  const [address, setAddress] = useState('')
  const [locating, setLocating] = useState(true)
  const [loading, setLoading] = useState(false)
  const [cats, setCats] = useState<ServiceCategory[]>([])
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadCategories().then(setCats).catch(() => setCats([]))
  }, [i18n.language])

  useEffect(() => {
    const detect = async () => {
      setLocating(true)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setAddress('')
          return
        }
        let pos = null
        try {
          pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        } catch {
          pos = await Location.getLastKnownPositionAsync({ maxAge: 300_000, requiredAccuracy: 5000 })
        }
        if (!pos) {
          setAddress('')
          return
        }
        const { latitude, longitude } = pos.coords
        let text = ''
        try {
          const geo = await Location.reverseGeocodeAsync(pos.coords)
          const first = geo?.[0]
          if (first) {
            const parts = [first.city, first.region, first.country]
            text = parts.filter(Boolean).join(', ')
          }
        } catch {}
        if (!text) {
          const fallback = await reverseGeocode(latitude, longitude)
          text = fallback?.display || ''
        }
        setAddress(text)
      } finally {
        setLocating(false)
      }
    }
    detect().catch(() => { setLocating(false) })
  }, [])

  const toggleCategory = (slug: string) => {
    hapticSelect()
    setSelected(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  const visibleCats = useMemo(() => {
    const list = cats.filter(c => c.slug !== 'autre')
    if (!list.find(c => c.slug === 'autre')) return [...list, { slug: 'autre', label_fr: 'Autre', label_en: 'Other', label_wo: 'Yeneen', abbr: 'AU', color: '#6B7280', order: 99, subCategories: [] } as any]
    return list
  }, [cats])

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
          <View style={s.successRings}>
            <View style={s.successInner}>
              <Check size={48} color="#fff" strokeWidth={3} />
            </View>
            <View style={[s.confetti, { top: -4, right: 8, backgroundColor: colors.warning }]} />
            <View style={[s.confetti, { bottom: 10, left: -4, backgroundColor: cat.electricite.bg }]} />
            <View style={[s.confettiBar, { top: 18, left: -8, backgroundColor: cat.peinture.bg }]} />
            <View style={[s.confettiBar, { bottom: -4, right: 20, backgroundColor: colors.primary }]} />
          </View>
          <Text style={s.successTitle}>{t('onboardingProvider.successTitle')}</Text>
          <Text style={s.successSub}>{t('onboardingProvider.successSub')}</Text>

          <View style={s.successHint}>
            <ArrowLeftRight size={18} color={colors.ink} />
            <Text style={s.successHintText}>{t('onboardingProvider.successSub')}</Text>
          </View>

          <Button title={t('onboardingProvider.goProHome')} onPress={() => finish(false)} fullWidth />
          <View style={{ height: spacing.sm }} />
          <TouchableOpacity style={s.kycBtn} onPress={() => finish(true)} activeOpacity={0.85}>
            <ShieldCheck size={18} color={colors.ink} />
            <Text style={s.kycText}>{t('onboardingProvider.goKyc')}</Text>
            <View style={s.kycBadge}><Text style={s.kycBadgeText}>RECOMMANDÉ</Text></View>
          </TouchableOpacity>
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
        <Text style={s.headerTitle}>{t('onboardingProvider.title')}</Text>
        <View style={s.back} />
      </View>

      <OBStepper step={step} />

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View style={s.section}>
            <HeroIllustration />
            <Text style={s.sectionTitle}>{t('onboardingProvider.whyTitle')}</Text>
            <Text style={s.sectionSub}>{t('onboardingProvider.whySub', { defaultValue: 'Gagnez de l\'argent en proposant vos services près de chez vous.' })}</Text>
            <View style={s.benefits}>
              <Benefit icon={MapPin} title={t('onboardingProvider.why1')} sub={t('onboardingProvider.why1Sub', { defaultValue: 'Le rayon d\'action, c\'est vous qui le fixez.' })} />
              <Benefit icon={Coins} title={t('onboardingProvider.why2')} sub={t('onboardingProvider.why2Sub', { defaultValue: 'Vous répondez aux demandes qui vous conviennent.' })} />
              <Benefit icon={Shield} title={t('onboardingProvider.why3')} sub={t('onboardingProvider.why3Sub', { defaultValue: 'L\'argent est bloqué jusqu\'à la fin de la mission.' })} />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('onboardingProvider.categoriesTitle')}</Text>
            <Text style={s.sectionSub}>{t('onboardingProvider.categoriesSub')}</Text>
            <View style={s.grid}>
              {visibleCats.map(category => (
                <CategoryTile
                  key={category.slug}
                  cat={category}
                  selected={selected.includes(category.slug)}
                  onPress={() => toggleCategory(category.slug)}
                />
              ))}
            </View>
            <View style={s.counter}>
              <View style={s.counterIcon}>
                <Check size={16} color={colors.brandInk} />
              </View>
              <Text style={s.counterText}>
                {selected.length} {t('onboardingProvider.selectedCount', { defaultValue: 'métiers sélectionnés' })}
              </Text>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('onboardingProvider.zoneTitle')}</Text>
            <Text style={s.sectionSub}>{t('onboardingProvider.zoneSub', { defaultValue: 'Vous recevrez les demandes dans ce périmètre.' })}</Text>

            <StaticRadiusMap radiusKm={radiusKm} address={locating ? t('onboardingProvider.addressDetecting') : (address || t('onboardingProvider.addressUnknown', { defaultValue: 'Position inconnue' }))} />

            <View style={s.addressCard}>
              <View style={s.addressIcon}>
                <MapPin size={18} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.addressLabel}>{t('onboardingProvider.addressDetected', { defaultValue: 'Adresse détectée' })}</Text>
                <Text style={s.addressValue}>{locating ? t('onboardingProvider.addressDetecting') : (address || t('onboardingProvider.addressUnknown', { defaultValue: 'Position inconnue' }))}</Text>
              </View>
            </View>

            <View style={s.sliderCard}>
              <View style={s.sliderHeader}>
                <Text style={s.sliderTitle}>{t('onboardingProvider.radiusLabel', { defaultValue: 'Rayon d\'action' })}</Text>
                <View style={s.radiusValue}>
                  <Text style={s.radiusValueText}>{radiusKm} km</Text>
                </View>
              </View>
              <View style={s.track}>
                <View style={[s.trackFill, { width: `${((radiusKm - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%` }]} />
                <View style={[s.thumb, { left: `${((radiusKm - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%` }]} />
              </View>
              <View style={s.sliderLabels}>
                <Text style={s.sliderLabel}>{MIN_RADIUS} km</Text>
                <Text style={s.sliderLabel}>{MAX_RADIUS} km</Text>
              </View>
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
                toast.error(t('onboardingProvider.noCategory'), '')
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
            title={t('onboardingProvider.activate')}
            onPress={submit}
            loading={loading}
            fullWidth
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.4, textTransform: 'uppercase' },
  stepper: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  stepperBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.bgDeep },
  stepperBarActive: { backgroundColor: colors.primary },
  body: { flex: 1, paddingHorizontal: spacing.lg },
  section: { paddingTop: spacing.sm, gap: spacing.md },
  sectionTitle: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.6, lineHeight: 30 },
  sectionSub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  hero: {
    height: 200, borderRadius: radius.xl,
    backgroundColor: colors.brandSoft,
    position: 'relative', overflow: 'hidden', marginBottom: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  heroCircleLarge: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroCircleSmall: { position: 'absolute', right: 30, bottom: -50, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroTool: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.hero },
  heroPin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  benefits: { gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: 14.5, fontWeight: typography.weight.extrabold as any, color: colors.ink, marginBottom: 2 },
  benefitSub: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  tile: {
    width: (SCREEN_W - spacing.lg * 2 - 14 * 2) / 3,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  tileActive: { backgroundColor: colors.brandTint },
  tileIcon: { width: 62, height: 62, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },
  tileCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.brandSoft, borderRadius: 12, padding: 10 },
  counterIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  counterText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.brandInk },
  mapBox: { height: 220, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  mapCenter: { position: 'relative', alignItems: 'center' },
  mapCenterDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 4, borderColor: '#fff', ...shadows.md },
  mapCenterLabel: { marginTop: 6, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  mapCenterLabelText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: '#fff' },
  mapRadiusBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, ...shadows.sm },
  mapRadiusBadgeText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  addressIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  addressLabel: { fontSize: 11, fontWeight: typography.weight.bold as any, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  addressValue: { fontSize: 13.5, fontWeight: typography.weight.bold as any, color: colors.ink },
  sliderCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: colors.borderSoft },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sliderTitle: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  radiusValue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  radiusValueText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  track: { position: 'relative', height: 6, borderRadius: 3, backgroundColor: colors.bgDeep, marginBottom: 8 },
  trackFill: { position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  thumb: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary, marginLeft: -10, ...shadows.sm },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderLabel: { fontSize: 11, color: colors.textMuted, fontWeight: typography.weight.semibold as any },
  stepButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  radiusChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  radiusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusChipText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  radiusChipTextActive: { color: '#fff' },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  success: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xxxl, gap: spacing.md },
  successRings: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md, position: 'relative' },
  successInner: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.hero },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 2 },
  confettiBar: { position: 'absolute', width: 12, height: 3, borderRadius: 2 },
  successTitle: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.ink, textAlign: 'center', letterSpacing: -0.6, lineHeight: 32 },
  successSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  successHint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: 14, maxWidth: 320 },
  successHintText: { flex: 1, fontSize: 12.5, color: colors.text, fontWeight: typography.weight.semibold as any },
  kycBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.border, width: '100%' },
  kycText: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.ink },
  kycBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.warnSoft },
  kycBadgeText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.warnInk, letterSpacing: 0.2, textTransform: 'uppercase' },
})

export default withScreenBoundary(OnboardingProvider, 'OnboardingProvider')
