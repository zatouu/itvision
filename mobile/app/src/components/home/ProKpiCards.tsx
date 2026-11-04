import { createThemedStyles } from '../../theme'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Banknote, Briefcase, Eye, EyeOff, FileText, MessageCircle } from 'lucide-react-native'
import { radius, shadows, spacing } from '../../design'

// ─── Offres envoyées : répartition en attente / acceptées / refusées ───

type OffersProps = {
  total: number
  pending: number
  accepted: number
  counterPending: number
  onPress: () => void
}

export function OffersKpiCard({ total, pending, accepted, counterPending, onPress }: OffersProps) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const other = Math.max(0, total - pending - accepted)
  const decided = accepted + other
  const rate = decided > 0 ? Math.round((accepted / decided) * 100) : null
  const segments = [
    { value: accepted, color: colors.success },
    { value: pending, color: colors.warning },
    { value: other, color: colors.border },
  ].filter(seg => seg.value > 0)

  return (
    <TouchableOpacity style={[s.card, shadows.sm]} onPress={onPress} activeOpacity={0.85} accessibilityRole="button"
      accessibilityLabel={`${t('proHome.kpiOffers')} : ${total}`}>
      <View style={s.top}>
        <View style={[s.icon, { backgroundColor: colors.warnSoft }]}><FileText size={20} color={colors.warnInk} /></View>
        {counterPending > 0 && (
          <View style={s.alertPill}>
            <MessageCircle size={11} color={colors.onPrimary} />
            <Text style={s.alertPillText}>{counterPending}</Text>
          </View>
        )}
      </View>
      <Text style={s.value}>{total}</Text>
      <Text style={s.label} numberOfLines={1}>{t('proHome.kpiOffers')}</Text>
      <View style={s.bar}>
        {segments.length > 0
          ? segments.map((seg, i) => <View key={i} style={{ flex: seg.value, backgroundColor: seg.color }} />)
          : <View style={{ flex: 1, backgroundColor: colors.border }} />}
      </View>
      <Text style={s.sub} numberOfLines={1}>
        {counterPending > 0
          ? t('proHome.offersCounter', { count: counterPending })
          : rate !== null ? t('proHome.offersRate', { pct: rate }) : t('proHome.kpiOffersSub', { count: pending })}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Mission en cours : étape actuelle sur 4 ───

const MISSION_STEPS = ['assigned', 'on_the_way', 'in_progress', 'awaiting_validation']

function missionStepIndex(status: string): number {
  if (status === 'provider_arriving' || status === 'arrived') return 1
  if (status === 'paused' || status === 'dispute') return 2
  const i = MISSION_STEPS.indexOf(status)
  return i < 0 ? 0 : i
}

type MissionProps = {
  active: boolean
  status: string
  statusLabel: string
  elapsed: string | null
  onPress: () => void
}

export function MissionKpiCard({ active, status, statusLabel, elapsed, onPress }: MissionProps) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const step = missionStepIndex(status)
  const warn = status === 'awaiting_validation' || status === 'dispute'

  return (
    <TouchableOpacity style={[s.card, shadows.sm, active && { borderColor: warn ? colors.warning : colors.success, borderWidth: 1.5 }]}
      onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={t('proHome.kpiMission')}>
      <View style={s.top}>
        <View style={[s.icon, { backgroundColor: active ? colors.successLight : colors.slate100 }]}>
          <Briefcase size={20} color={active ? colors.successInk : colors.textSecondary} />
        </View>
        {active && <View style={[s.liveDot, { backgroundColor: warn ? colors.warning : colors.success }]} />}
      </View>
      <Text style={[s.value, active && s.valueSmall]} numberOfLines={1}>{active ? (statusLabel || t('proHome.kpiMission')) : '0'}</Text>
      <Text style={s.label} numberOfLines={1}>{t('proHome.kpiMission')}</Text>
      {active ? (
        <View style={s.steps}>
          {MISSION_STEPS.map((key, i) => (
            <View key={key} style={[s.step, { backgroundColor: i <= step ? (warn && i === step ? colors.warning : colors.success) : colors.border }]} />
          ))}
        </View>
      ) : <View style={s.stepsPlaceholder} />}
      <Text style={s.sub} numberOfLines={1}>
        {active
          ? (elapsed ? t('proHome.kpiMissionSince', { d: elapsed }) : t('proHome.missionStep', { step: step + 1, total: MISSION_STEPS.length }))
          : t('proHome.kpiMissionNone')}
      </Text>
    </TouchableOpacity>
  )
}

// ─── Revenus : montant du jour + barres des 7 derniers jours ───

type RevenueProps = {
  todayLabel: string
  weekLabel: string
  monthLabel: string
  chart: { date: string; amount: number }[]
  hidden: boolean
  onToggleHidden: () => void
  locale: string
}

export function RevenueKpiCard({ todayLabel, weekLabel, monthLabel, chart, hidden, onToggleHidden, locale }: RevenueProps) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const days = chart.slice(-7)
  const max = Math.max(1, ...days.map(d => d.amount || 0))
  const hasData = days.some(d => (d.amount || 0) > 0)
  const dayLetter = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale, { weekday: 'narrow' }).toUpperCase()
  }

  return (
    <View style={[s.card, s.revenueCard, shadows.sm]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.top}>
          <View style={[s.icon, { backgroundColor: colors.slate100 }]}><Banknote size={20} color={colors.text} /></View>
          <TouchableOpacity onPress={onToggleHidden} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button"
            accessibilityLabel={hidden ? t('home.showRevenue', { defaultValue: 'Afficher les revenus' }) : t('home.hideRevenue', { defaultValue: 'Masquer les revenus' })}>
            {hidden ? <EyeOff size={20} color={colors.textSecondary} /> : <Eye size={20} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>
        <Text style={s.value} numberOfLines={1} adjustsFontSizeToFit>{todayLabel}</Text>
        <Text style={s.label} numberOfLines={1}>{t('proHome.kpiRevenue')}</Text>
        <Text style={s.sub} numberOfLines={2}>{t('proHome.kpiRevenueSub', { w: weekLabel, m: monthLabel })}</Text>
      </View>
      <View style={s.chart} accessibilityLabel={t('proHome.revenue7d')}>
        <View style={s.bars}>
          {days.map((d, i) => {
            const isToday = i === days.length - 1
            const h = hasData ? Math.max(4, Math.round(((d.amount || 0) / max) * 56)) : 4
            return (
              <View key={d.date} style={s.barCol}>
                <View style={[s.barFill, { height: h, backgroundColor: isToday ? colors.primary : colors.primaryLight }]} />
                <Text style={[s.barLabel, isToday && { color: colors.primaryText, fontWeight: '800' }]}>{dayLetter(d.date)}</Text>
              </View>
            )
          })}
        </View>
        <Text style={s.chartCaption}>{hasData ? t('proHome.revenue7d') : t('proHome.revenueNone')}</Text>
      </View>
    </View>
  )
}

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    value: { fontSize: 24, fontWeight: '800', color: colors.text },
    valueSmall: { fontSize: 17, lineHeight: 30 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 1 },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.sm, gap: 2 },
    alertPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.info },
    alertPillText: { fontSize: 11, fontWeight: '800', color: colors.onPrimary },
    liveDot: { width: 10, height: 10, borderRadius: 5 },
    steps: { flexDirection: 'row', gap: 3, marginTop: spacing.sm },
    step: { flex: 1, height: 6, borderRadius: 3 },
    stepsPlaceholder: { height: 6, marginTop: spacing.sm },
    revenueCard: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md },
    chart: { width: '42%', maxWidth: 140, justifyContent: 'flex-end' },
    bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 76 },
    barCol: { alignItems: 'center', gap: 4, flex: 1 },
    barFill: { width: 10, borderRadius: 4 },
    barLabel: { fontSize: 10, color: colors.textMuted },
    chartCaption: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  })
  return { colors, s }
})
