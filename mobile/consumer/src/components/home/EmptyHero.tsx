import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Plus, Zap } from 'lucide-react-native'
import { colors, spacing, typography } from '../../design'

export type UrgentEligibility = {
  eligible: boolean
  count: number
  bestEta: number | null
  radiusKm: number
  maxEta: number
}

// Empty state — green gradient card (variant A). The CSS gradient is simulated
// with a darker base + lighter translucent discs (no extra dependency).
export default function EmptyHero({
  urgentEligibility,
  onUrgent,
}: {
  urgentEligibility: UrgentEligibility | null
  onUrgent: () => void
}) {
  const { t } = useTranslation()
  const eligible = !!urgentEligibility?.eligible
  return (
    <View style={s.hero}>
      <View style={s.discLight} />
      <View style={s.disc1} />
      <View style={s.disc2} />
      <View style={s.content}>
        <Text style={s.eyebrow}>{t('home.noActiveMissions')}</Text>
        <Text style={s.title}>{t('home.needToday')}</Text>
        <Text style={s.sub}>{t('home.verifiedEta')}</Text>
        <View style={s.ctaRow}>
          <TouchableOpacity
            style={s.ctaPrimary}
            onPress={() => router.push('/create-request' as any)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('home.publishRequest')}
          >
            <Plus size={18} color={colors.navy} strokeWidth={2.5} />
            <Text style={s.ctaPrimaryText}>{t('home.publishRequest')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.ctaUrgent, !eligible && s.ctaUrgentDisabled]}
            onPress={onUrgent}
            disabled={!eligible}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('home.emergencyRepair')}
          >
            <Zap
              size={16}
              color={eligible ? '#fff' : colors.textMuted}
              fill={eligible ? '#fff' : 'transparent'}
              strokeWidth={2.4}
            />
            <Text style={[s.ctaUrgentText, !eligible && s.ctaUrgentTextDisabled]}>
              {t('home.emergencyRepair')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#0F7A56',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#16A574',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  discLight: {
    position: 'absolute', top: -60, left: -40, width: 220, height: 220,
    borderRadius: 110, backgroundColor: 'rgba(22,165,116,0.55)',
  },
  disc1: {
    position: 'absolute', top: -30, right: -30, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  disc2: {
    position: 'absolute', bottom: -50, right: 40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: { paddingHorizontal: 20, paddingVertical: 22 },
  eyebrow: {
    color: '#fff', fontSize: 11.5, fontWeight: typography.weight.bold as any,
    letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.8,
  },
  title: {
    color: '#fff', fontSize: 22, fontWeight: typography.weight.extrabold as any,
    letterSpacing: -0.4, marginTop: 6, lineHeight: 26,
  },
  sub: { color: '#fff', fontSize: 13, opacity: 0.85, marginTop: 6 },
  ctaRow: {
    marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  ctaPrimary: {
    flex: 1, minWidth: 140,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaPrimaryText: { color: colors.navy, fontSize: 14, fontWeight: typography.weight.bold as any },
  ctaUrgent: {
    flex: 1, minWidth: 140,
    backgroundColor: colors.danger,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaUrgentDisabled: { backgroundColor: colors.slate100 },
  ctaUrgentText: { color: '#fff', fontSize: 14, fontWeight: typography.weight.bold as any },
  ctaUrgentTextDisabled: { color: colors.textMuted },
})
