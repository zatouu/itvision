import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import SuccessBanner from '../../src/components/SuccessBanner'
import Button from '../../src/components/Button'
import { Check, ClipboardList, Home, Bell, Tag, Banknote, MapPin, Clock } from 'lucide-react-native'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'

function RequestPublished() {
  const { t } = useTranslation()
  const params = useLocalSearchParams<{ id?: string; category?: string; subCategory?: string; budget?: string; address?: string }>()
  const category = params.category || 'electricite'
  const subCategory = params.subCategory || ''
  const budget = params.budget ? parseInt(params.budget) : 0
  const address = params.address || ''
  const requestId = params.id || ''
  const meta = getCategoryMeta(category)
  const ref = requestId.slice(-6).toUpperCase() || 'NEW'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientRequest.published')} transparent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={s.hero}>
          <View style={s.checkCircle}>
            <Check size={40} color={colors.surface} />
          </View>
          <View style={s.sparkleLeft}>
            <Text style={s.chip}>EL</Text>
          </View>
          <View style={s.sparkleRight}>
            <Text style={s.chip}>PL</Text>
          </View>
          <View style={s.sparkleBottom}>
            <Text style={s.chip}>ME</Text>
          </View>
        </View>

        <Text style={s.title}>{t('clientRequest.onlineTitle')}</Text>
        <Text style={s.subtitle}>{t('clientRequest.onlineSubtitle')}</Text>

        <View style={s.summaryCard}>
          <View style={s.summaryHeader}>
            <View style={[s.summaryIcon, { backgroundColor: meta.bg }]}>
              <Text style={[s.summaryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={s.summaryTitle}>{meta.label}{subCategory ? ` • ${subCategory}` : ''}</Text>
          </View>
          <View style={s.summaryRows}>
            <View style={s.summaryRow}>
              <View style={s.summaryLabelRow}>
                <Tag size={16} color={colors.textSecondary} />
                <Text style={s.summaryLabel}>{t('clientRequest.reference')}</Text>
              </View>
              <Text style={s.summaryValue}>#{ref}</Text>
            </View>
            <View style={s.summaryRow}>
              <View style={s.summaryLabelRow}>
                <Banknote size={16} color={colors.textSecondary} />
                <Text style={s.summaryLabel}>{t('clientRequest.budget')}</Text>
              </View>
              <Text style={s.summaryValue}>{budget.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={s.summaryRow}>
              <View style={s.summaryLabelRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={s.summaryLabel}>{t('clientRequest.location')}</Text>
              </View>
              <Text style={s.summaryValue}>{address}</Text>
            </View>
          </View>
        </View>

        <View style={s.searchingPill}>
          <View style={s.pulseDot} />
          <Text style={s.searchingText}>{t('clientRequest.searching')}</Text>
        </View>

        <View style={s.etaCard}>
          <View style={s.etaIcon}>
            <Clock size={24} color={colors.success} />
          </View>
          <View>
            <Text style={s.etaLabel}>{t('clientRequest.avgTime')}</Text>
            <Text style={s.etaValue}>2 à 5 min</Text>
          </View>
        </View>

        <View style={s.ctaGroup}>
          <Button
            title={t('clientRequest.seeOffers')}
            onPress={() => requestId ? router.push(`/offers/${requestId}`) : router.push('/my-requests')}
            fullWidth
            size="lg"
            icon={<ClipboardList size={18} color={colors.surface} />}
          />
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Home size={18} color={colors.primary} />
            <Text style={s.homeText}>{t('clientRequest.backHome')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.notifyRow}>
          <Bell size={16} color={colors.textSecondary} />
          <Text style={s.notifyText}>{t('clientRequest.notifyOnOffer')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  hero: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: { color: colors.surface },
  sparkleLeft: { position: 'absolute', top: 10, left: -30, transform: [{ rotate: '-15deg' }] },
  sparkleRight: { position: 'absolute', top: 20, right: -30, transform: [{ rotate: '15deg' }] },
  sparkleBottom: { position: 'absolute', bottom: -10, right: -10, transform: [{ rotate: '10deg' }] },
  chip: {
    fontSize: 12,
    fontWeight: typography.weight.extrabold as any,
    color: colors.surface,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  title: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: typography.xxl.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    marginHorizontal: spacing.lg,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: typography.base.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
    lineHeight: 22,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAbbr: { fontSize: 16, fontWeight: typography.weight.extrabold as any },
  summaryTitle: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  summaryRows: { gap: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  summaryLabel: { fontSize: typography.base.fontSize, color: colors.textSecondary },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryValue: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
  searchingPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xl,
  },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  searchingText: { fontSize: typography.base.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaIconText: { fontSize: 20 },
  etaLabel: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  etaValue: { fontSize: typography.xl.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  ctaGroup: { marginHorizontal: spacing.lg, marginTop: spacing.xl, gap: spacing.md },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  homeIcon: { color: colors.primary },
  homeText: { fontSize: typography.md.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  notifyIcon: { color: colors.textSecondary },
  notifyText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
})

export default withScreenBoundary(RequestPublished, 'RequestPublished')

