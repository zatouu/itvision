import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X, Check, AlertTriangle, Eye, ArrowRight, LayoutGrid, User, MoreHorizontal, Search, Clock, Camera, Send, Sparkles } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../../design'
import type { StructuredAdvice, CoachIcon } from '../../types'
import { apiPost } from '../../api'
import { humanErrorMessage } from '../../errorMessages'
import { toast } from '../../toast'
import Button from '../Button'

const STATUS_QUESTIONS: Record<string, string[]> = {
  assigned: ['Quel matériel ?', 'Adresse introuvable', 'Client injoignable', 'Combien de temps ?'],
  on_the_way: ['Quel matériel ?', 'Adresse introuvable', 'Client injoignable', 'Combien de temps ?'],
  provider_arriving: ['Quel matériel ?', 'Adresse introuvable', 'Client injoignable', 'Combien de temps ?'],
  arrived: ['Pas ce qui était décrit', 'Danger', 'Client demande autre chose', 'Par où commencer ?'],
  in_progress: ['Ça ne marche pas', 'Pièce manquante', 'Autre chose que prévu', 'Client demande un extra'],
  paused: ['Où trouver la pièce ?', 'Combien facturer ?', 'Client s\'impatiente'],
  awaiting_validation: ['Client ne valide pas', 'Client conteste', 'Comment expliquer'],
}

const ICONS: Record<CoachIcon, any> = {
  tools: LayoutGrid,
  check: Check,
  warning: AlertTriangle,
  steps: ArrowRight,
  parts: LayoutGrid,
  client: User,
  info: MoreHorizontal,
  eye: Search,
  clock: Clock,
}

interface CoachSheetProps {
  visible: boolean
  onClose: () => void
  status: string
  category?: string
  description?: string
  advice: StructuredAdvice | null
  onSendToChat?: (text: string) => void
}

export function CoachSheet({ visible, onClose, status, category, description, advice, onSendToChat }: CoachSheetProps) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [answering, setAnswering] = useState(false)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  if (!visible) return null

  const questions = STATUS_QUESTIONS[status] || []
  const sections = advice?.sections || []
  const warningFirst = [...sections].sort((a) => (a.icon === 'warning' ? -1 : 0))

  const ask = async (q: string) => {
    if (answering || quotaExhausted) return
    setQuestion(q)
    setAnswer(null)
    setAnswering(true)
    try {
      const res: any = await apiPost('/api/ai/assist', {
        type: 'mission_help',
        category,
        description,
        missionStatus: status,
        question: q,
      })
      if (res.text) {
        setAnswer(res.text)
      } else if (res.code === 'quota_exceeded') {
        setQuotaExhausted(true)
      }
    } catch (e: any) {
      if (e?.status === 402) {
        setQuotaExhausted(true)
      } else {
        toast.error(t('common.error'), humanErrorMessage(e))
      }
    } finally {
      setAnswering(false)
    }
  }

  const reset = () => {
    setQuestion(null)
    setAnswer(null)
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <View style={s.headerIcon}>
            <Sparkles size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{t('coach.title')}</Text>
            {advice?.title ? <Text style={s.headerSub}>{advice.title}</Text> : null}
          </View>
          <TouchableOpacity onPress={onClose} style={s.close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {advice?.summary ? <Text style={s.summary}>{advice.summary}</Text> : null}

          {answer && question && (
            <View style={s.answerCard}>
              <Text style={s.answerLabel}>{t('coach.newQuestion')} : « {question} »</Text>
              <Text style={s.answerText}>{answer}</Text>
              <TouchableOpacity onPress={reset} style={s.reset}>
                <Text style={s.resetText}>{t('coach.newQuestion')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {answering && (
            <View style={s.thinking}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.thinkingText}>{t('coach.thinking')}</Text>
            </View>
          )}

          <View style={s.sections}>
            {warningFirst.map((section, i) => {
              const Icon = ICONS[section.icon] || MoreHorizontal
              const isWarning = section.icon === 'warning'
              return (
                <View key={i} style={[s.section, isWarning && s.sectionWarning]}>
                  <View style={s.sectionHeader}>
                    <View style={[s.sectionIcon, isWarning ? { backgroundColor: colors.warnSoft } : { backgroundColor: colors.bgDeep }]}>
                      <Icon size={16} color={isWarning ? colors.warning : colors.ink} />
                    </View>
                    <Text style={s.sectionTitle}>{section.title}</Text>
                  </View>
                  {section.items.map((item, j) => (
                    <View key={j} style={s.itemRow}>
                      <View style={s.checkCircle}>
                        <Check size={12} color={colors.primary} />
                      </View>
                      <Text style={s.itemText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>

          {(advice?.difficulty || advice?.durationMinutes) && (
            <View style={s.chips}>
              {advice.difficulty ? <View style={s.chip}><Text style={s.chipText}>{advice.difficulty}</Text></View> : null}
              {advice.durationMinutes ? (
                <View style={s.chip}>
                  <Text style={s.chipText}>{advice.durationMinutes.min}–{advice.durationMinutes.max} min</Text>
                </View>
              ) : null}
            </View>
          )}

          {advice?.askClient && advice.askClient.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{t('coach.askClient')}</Text>
              {advice.askClient.map((q, i) => (
                <View key={i} style={s.itemRow}>
                  <Text style={s.questionMark}>?</Text>
                  <Text style={s.itemText}>{q}</Text>
                </View>
              ))}
            </View>
          )}

          {advice?.sayToClient && (
            <View style={s.clientMessage}>
              <Text style={s.cardTitle}>{t('coach.toClient')}</Text>
              <Text style={s.quote}>“{advice.sayToClient}”</Text>
              {onSendToChat && (
                <Button
                  title={t('coach.sendToChat')}
                  onPress={() => onSendToChat(advice.sayToClient!)}
                  icon={<Send size={16} color="#fff" />}
                  fullWidth
                />
              )}
            </View>
          )}

          <View style={s.questionSection}>
            <Text style={s.cardTitle}>{t('coach.questionTitle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.questionPills}>
              {questions.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[s.questionPill, question === q && s.questionPillActive, (answering || quotaExhausted) && s.questionPillDisabled]}
                  onPress={() => ask(q)}
                  disabled={answering || quotaExhausted}
                >
                  <Text style={[s.questionPillText, question === q && s.questionPillTextActive]} numberOfLines={1}>{q}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {quotaExhausted ? (
              <Text style={s.quotaText}>{t('coach.quotaExhausted')}</Text>
            ) : (
              <Text style={s.quotaText}>{t('coach.freeToday')}</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
    minHeight: '55%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  headerSub: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  close: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  summary: { backgroundColor: colors.brandSoft, borderRadius: radius.lg, padding: spacing.md, fontSize: 14, color: colors.brandInk, fontWeight: typography.weight.semibold as any, marginBottom: spacing.md },
  sections: { gap: spacing.md },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  sectionWarning: { borderLeftWidth: 3, borderLeftColor: colors.warning },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  sectionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.ink },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 13.5, color: colors.text, lineHeight: 19 },
  questionMark: { width: 20, textAlign: 'center', fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.info },
  chips: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  chip: { backgroundColor: colors.bgDeep, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  cardTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.ink },
  clientMessage: { backgroundColor: colors.infoLight, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md },
  quote: { fontSize: 14, color: colors.infoInk, lineHeight: 20, fontStyle: 'italic' },
  questionSection: { marginTop: spacing.sm, gap: spacing.sm },
  questionPills: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  questionPill: { height: 40, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  questionPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  questionPillDisabled: { opacity: 0.4 },
  questionPillText: { fontSize: 13, fontWeight: typography.weight.semibold as any, color: colors.text },
  questionPillTextActive: { color: '#fff' },
  quotaText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  answerCard: { backgroundColor: colors.brandTint, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  answerLabel: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.brandInk, marginBottom: spacing.sm },
  answerText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  reset: { marginTop: spacing.sm },
  resetText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.primary },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  thinkingText: { fontSize: 14, color: colors.textMuted },
})
