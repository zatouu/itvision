import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Zap, ArrowRight, LucideIcon } from 'lucide-react-native'
import { radius, spacing, typography } from '../../design'

const INK = '#0D1520'
const AMBER = '#F5A524'
const TEXT_SOFT = '#B6C4D8'
const GLASS = 'rgba(255,255,255,0.10)'
const GLASS_BORDER = 'rgba(255,255,255,0.14)'

export interface OffersHeroProps {
  request: any
  title: string
  categoryColor: string
  CategoryIcon: LucideIcon
  offerCount: number
}

// Hero shown when no mission is assigned yet but offers are waiting (variant A extension).
export default function OffersHero({ request, title, categoryColor, CategoryIcon, offerCount }: OffersHeroProps) {
  const { t } = useTranslation()
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [anim])

  const openOffers = () => router.push(`/offers/${request._id}` as any)

  return (
    <View style={s.hero}>
      {/* Header */}
      <View style={s.heroHead}>
        <View style={s.heroHeadLeft}>
          <View style={{ width: 8, height: 8 }}>
            <View style={[StyleSheet.absoluteFillObject, { borderRadius: 4, backgroundColor: AMBER }]} />
            <Animated.View
              style={[StyleSheet.absoluteFillObject, {
                borderRadius: 4, backgroundColor: AMBER,
                opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
              }]}
            />
          </View>
          <Text style={s.heroHeadLabel}>{t('home.offersReceived', { count: offerCount })}</Text>
        </View>
        <TouchableOpacity style={s.detailsPill} onPress={openOffers} activeOpacity={0.75}>
          <Text style={s.detailsPillText}>{t('home.details')} →</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={s.heroBody}>
        <View style={s.row}>
          <View style={[s.catIcon, { backgroundColor: categoryColor }]}>
            <CategoryIcon size={22} color="#fff" />
          </View>
          <View style={s.info}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <View style={s.metaRow}>
              <View style={s.countChip}>
                <Zap size={10} color={INK} />
                <Text style={s.countChipText}>{t('home.offersReceived', { count: offerCount })}</Text>
              </View>
              {!!request.budget && (
                <Text style={s.budget}>{Number(request.budget).toLocaleString('fr-FR')} FCFA</Text>
              )}
            </View>
          </View>
        </View>
        <Text style={s.sub}>{t('home.offersWaitingSub')}</Text>

        {/* CTA */}
        <TouchableOpacity style={s.cta} onPress={openOffers} activeOpacity={0.85} accessibilityLabel={t('home.reviewOffers')}>
          <Text style={s.ctaText}>{t('home.reviewOffers')}</Text>
          <ArrowRight size={16} color={INK} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: INK,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    shadowColor: '#0D1520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  heroHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroHeadLabel: {
    fontSize: 11.5, fontWeight: typography.weight.bold as any, letterSpacing: 0.6,
    textTransform: 'uppercase', color: TEXT_SOFT,
  },
  detailsPill: {
    backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  detailsPillText: { color: '#fff', fontSize: 11.5, fontWeight: typography.weight.bold as any },
  heroBody: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 15, fontWeight: typography.weight.extrabold as any, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  countChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: AMBER, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3,
  },
  countChipText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: INK },
  budget: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: TEXT_SOFT },
  sub: { color: TEXT_SOFT, fontSize: 12.5, marginTop: 10 },
  cta: {
    marginTop: 12, height: 46, borderRadius: 14, backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaText: { color: INK, fontSize: 13.5, fontWeight: typography.weight.bold as any },
})
