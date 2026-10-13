import { createThemedStyles } from '../../theme'
import { View, Text, TouchableOpacity, StyleSheet, Linking, ScrollView } from 'react-native'
import { Image } from 'expo-image'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Check, AlertTriangle, Eye, List, Wrench, User, Info, Clock,
  Package, Star, ChevronRight, ShoppingBag,
} from 'lucide-react-native'
import { radius, spacing, typography, shadows } from '../../design'
import { marketLinks } from '../../links'
import type { StructuredAdvice, CoachIcon, MaterialSuggestion } from '../../types'

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



interface AiAnalysisCardProps {
  advice: StructuredAdvice
  materials?: MaterialSuggestion[]
  /** Intégration DDM+ active (admin) ; `false` = partie achat grisée « Bientôt » */
  ddmEnabled?: boolean
  onMakeOffer?: () => void
  onAskQuestion?: () => void
  onRefresh?: () => void
  loading?: boolean
}

function SectionIcon({ icon }: { icon: CoachIcon }) {
  const { TONE, s } = useStyles()
  const t = TONE[icon]
  const Icon = ICONS[icon] || Info
  return (
    <View style={[s.icon, { backgroundColor: t.bg }]}>
      <Icon size={16} color={t.color} strokeWidth={2.2} />
    </View>
  )
}

function Item({ text }: { text: string }) {
  const { colors, s } = useStyles()
  return (
    <View style={s.item}>
      <View style={s.dot}>
        <Check size={10} color={colors.onPrimary} strokeWidth={3} />
      </View>
      <Text style={s.itemText}>{text}</Text>
    </View>
  )
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  const { colors, s } = useStyles()
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

export default function AiAnalysisCard({ advice, materials, ddmEnabled, onMakeOffer, onAskQuestion, onRefresh, loading }: AiAnalysisCardProps) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const sections = [...(advice.sections || [])].sort((a, b) => (a.icon === 'warning' ? -1 : 0) - (b.icon === 'warning' ? -1 : 0))
  const products = (materials || []).flatMap(m => m.products).filter((p, i, all) => all.findIndex(x => x.id === p.id) === i).slice(0, 8)
  const soonMaterials = ddmEnabled === false ? (advice.materials || []).filter(m => typeof m === 'string' && m.trim()).slice(0, 8) : []

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

      {products.length > 0 && (
        <View style={s.askCard}>
          <View style={s.sectionHeader}>
            <View style={[s.icon, { backgroundColor: colors.brandSoft }]}>
              <ShoppingBag size={16} color={colors.brandInk} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>{t('coach.materialsTitle')}</Text>
              <Text style={s.summary}>{t('coach.materialsHint')}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.products}>
            {products.map(p => (
              <TouchableOpacity
                key={p.id}
                style={s.product}
                onPress={() => Linking.openURL(marketLinks.path(`${p.path}?utm_source=xeuy&utm_medium=analyse`)).catch(() => {})}
                accessibilityRole="link"
                accessibilityLabel={p.name}
              >
                {p.image
                  ? <Image source={{ uri: p.image }} style={s.productImg} contentFit="cover" />
                  : <View style={[s.productImg, s.productPh]}><Package size={20} color={colors.textMuted} /></View>}
                <Text style={s.productName} numberOfLines={2}>{p.name}</Text>
                <Text style={s.productPrice}>
                  {p.priceFcfa ? `${Math.round(p.priceFcfa).toLocaleString('fr-FR')} F` : t('coach.onRequest')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {soonMaterials.length > 0 && (
        <View style={[s.askCard, s.soonCard]}>
          <View style={s.sectionHeader}>
            <View style={[s.icon, { backgroundColor: colors.bgDeep }]}>
              <ShoppingBag size={16} color={colors.textMuted} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionTitle}>{t('coach.materialsSoonTitle')}</Text>
              <Text style={s.summary}>{t('coach.materialsSoonHint')}</Text>
            </View>
            <View style={s.soonTag}><Text style={s.soonTagText}>{t('common.soon')}</Text></View>
          </View>
          {soonMaterials.map((m, i) => <Item key={i} text={m} />)}
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
            <ChevronRight size={16} color={colors.onPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
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

  const s = StyleSheet.create({
    soonCard: { opacity: 0.75 },
    soonTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: colors.bgDeep },
    soonTagText: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted },
    products: { gap: 10, paddingTop: 4 },
    product: { width: 132, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg, padding: 8, gap: 4, backgroundColor: colors.surface },
    productImg: { width: '100%', height: 90, borderRadius: radius.md },
    productPh: { backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.ink, minHeight: 32 },
    productPrice: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
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
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.navy, borderRadius: radius.lg, paddingVertical: 14 },
    btnText: { fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.onPrimary },
    btnOutline: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.ink },
    btnOutlineText: { fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.ink },
  })
  return { colors, TONE, s }
})
