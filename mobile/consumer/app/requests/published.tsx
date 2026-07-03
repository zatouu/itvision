import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import SuccessBanner from '../../src/components/SuccessBanner'
import Button from '../../src/components/Button'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { mockRequests } from '../../src/mock'

export default function RequestPublished() {
  const { t } = useTranslation()
  const request = mockRequests[0]
  const meta = getCategoryMeta(request.category)
  const ref = request._id.slice(-6).toUpperCase()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('clientRequest.published')} transparent />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={s.hero}>
          <View style={s.checkCircle}>
            <Text style={s.checkIcon}>✓</Text>
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
            <Text style={s.summaryTitle}>{meta.label} • {request.subCategory}</Text>
          </View>
          <View style={s.summaryRows}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>🏷 {t('clientRequest.reference')}</Text>
              <Text style={s.summaryValue}>#{ref}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>💰 {t('clientRequest.budget')}</Text>
              <Text style={s.summaryValue}>{request.budget?.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>📍 {t('clientRequest.location')}</Text>
              <Text style={s.summaryValue}>{request.address}</Text>
            </View>
          </View>
        </View>

        <View style={s.searchingPill}>
          <View style={s.pulseDot} />
          <Text style={s.searchingText}>{t('clientRequest.searching')}</Text>
        </View>

        <View style={s.etaCard}>
          <View style={s.etaIcon}>
            <Text style={s.etaIconText}>⏱</Text>
          </View>
          <View>
            <Text style={s.etaLabel}>{t('clientRequest.avgTime')}</Text>
            <Text style={s.etaValue}>2 à 5 min</Text>
          </View>
        </View>

        <View style={s.ctaGroup}>
          <Button
            title={t('clientRequest.seeOffers')}
            onPress={() => router.push('/offers/req1')}
            fullWidth
            size="lg"
            icon={<Text style={{ color: colors.surface, fontSize: 16 }}>📋</Text>}
          />
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
            <Text style={s.homeIcon}>🏠</Text>
            <Text style={s.homeText}>{t('clientRequest.backHome')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.notifyRow}>
          <Text style={s.notifyIcon}>🔔</Text>
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
  checkIcon: { fontSize: 40, color: colors.surface, fontWeight: typography.weight.extrabold as any },
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
  homeIcon: { fontSize: 18 },
  homeText: { fontSize: typography.md.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  notifyIcon: { fontSize: 16 },
  notifyText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
})
