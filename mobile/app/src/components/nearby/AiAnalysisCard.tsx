import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Check, AlertTriangle, Eye, List, Wrench, User, Info, Clock,
  Package, Star, ChevronRight,
} from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../../design'
import type { StructuredAdvice, CoachIcon } from '../../types'

const ICONS: Record<CoachIcon, any> = {
  tools: Wrench,
  check: Check,
  warning: AlertTriangle,
  steps: List,
  parts: Package,
  client: User,
  info: Info,
  eye: Eye,
  clock: Clock,
}

const TONE: Record<CoachIcon, { color: string; bg: string }> = {
  warning: { color: colors.warning, bg: colors.warnSoft },
  info: { color: colors.info, bg: colors.infoSoft },
  eye: { color: colors.info, bg: colors.infoSoft },
  clock: { color: colors.ink, bg: colors.bgDeep },
  tools: { color: colors.brandInk, bg: '#fff' },
  parts: { color: colors.ink, bg: colors.bgDeep },
  check: { color: colors.brandInk, bg: '#fff' },
  client: { color: colors.ink, bg: colors.bgDeep },
  steps: { color: colors.brandInk, bg: '#fff' },
}

interface AiAnalysisCardProps {
  advice: StructuredAdvice
  onMakeOffer?: () => void
  onAskQuestion?: () => void
  onRefresh?: () => void
  loading?: boolean
}

function SectionIcon({ icon }: { icon: CoachIcon }) {
  const t = TONE[icon]
  const Icon = ICONS[icon] || Info
  return (
    <View style={[s.icon, { backgroundColor: t.bg }]}>
      <Icon size={16} color={t.color} strokeWidth={2.2} />
    </View>
  )
}

function Item({ text }: { text: string }) {
  return (
    <View style={s.item}>
      <View style={s.dot}>
        <Check size={10} color="#fff" strokeWidth={3} />
      </View>
      <Text style={s.itemText}>{text}</Text>
    </View>
  )
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.chip}>
      <View style={s.chipIcon}>
        <Icon size={16} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.chipLabel}>{label}</Text>
        <Text style={s.chipValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  )
}

export default function AiAnalysisCard({ advice, onMakeOffer, onAskQuestion, onRefresh, loading }: AiAnalysisCardProps) {
  const { t } = useTranslation()
  const sections = [...(advice.sections || [])].sort((a, b) => (a.icon === 'warning' ? -1 : 0) - (b.icon === 'warning' ? -1 : 0))

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Sparkles size={18} color={colors.brandInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{advice.title || t('coach.analyzeRequest')}</Text>
          {advice.summary ? <Text style={s.summary} numberOfLines={2}>{advice.summary}</Text> : null}
        </View>
      </View>

      <View style={s.chips}>
        {advice.difficulty ? <InfoChip icon={Star} label={t('coach.difficulty')} value={advice.difficulty} /> : null}
        {advice.durationMinutes ? (
          <InfoChip icon={Clock} label={t('coach.duration')} value={`${advice.durationMinutes.min}–${advice.durationMinutes.max} min`} />
        ) : null}
      </View>

      <View style={s.sections}>
        {sections.map((section, i) => (
          <View key={i} style={[s.section, section.icon === 'warning' ? { borderLeftWidth: 3, borderLeftColor: colors.warning } : null]}>
            <View style={s.sectionHeader}>
              <SectionIcon icon={section.icon} />
              <Text style={s.sectionTitle}>{section.title}</Text>
            </View>
            {section.items.map((it, j) => <Item key={j} text={it} />)}
          </View>
        ))}
      </View>

      {advice.askClient && advice.askClient.length > 0 && (
        <View style={s.askCard}>
          <View style={s.sectionHeader}>
            <SectionIcon icon="client" />
            <Text style={s.sectionTitle}>{t('coach.askClient')}</Text>
          </View>
          {advice.askClient.map((q, i) => (
            <View key={i} style={s.askRow}>
              <View style={s.askMark}><Text style={s.askMarkText}>?</Text></View>
              <Text style={s.askText}>{q}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={s.actions}>
        {onAskQuestion && (
          <TouchableOpacity style={[s.btn, s.btnOutline]} onPress={onAskQuestion} disabled={loading}>
            <Text style={s.btnOutlineText}>{t('providerNearby.askQuestion')}</Text>
          </TouchableOpacity>
        )}
        {onMakeOffer && (
          <TouchableOpacity style={s.btn} onPress={onMakeOffer} disabled={loading}>
            <Text style={s.btnText}>{t('coach.makeOffer')}</Text>
            <ChevronRight size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 12, ...shadows.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  summary: { fontSize: 13, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chipIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  chipValue: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  sections: { gap: 10 },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, gap: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  askCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: 12, gap: 6 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  askMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  askMarkText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  askText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 14 },
  btnText: { fontSize: 15, fontWeight: typography.weight.bold as any, color: '#fff' },
  btnOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink },
  btnOutlineText: { fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.ink },
})
