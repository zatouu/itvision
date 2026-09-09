import { useState, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  X, Check, AlertTriangle, Eye, List, Wrench, User, Info, Clock,
  Package, Search, Star, MessageCircle, Camera, Send, Sparkles,
} from 'lucide-react-native'
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

const STATUS_STEP: Record<string, number> = {
  assigned: 1,
  on_the_way: 2,
  provider_arriving: 2,
  arrived: 3,
  in_progress: 4,
  paused: 4,
  awaiting_validation: 5,
}

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

const TONE: Record<CoachIcon, { tone: 'neutral' | 'warning' | 'info' | 'green'; color: string; bg: string }> = {
  warning: { tone: 'warning', color: colors.warning, bg: colors.warnSoft },
  info: { tone: 'info', color: colors.info, bg: colors.infoSoft },
  eye: { tone: 'info', color: colors.info, bg: colors.infoSoft },
  clock: { tone: 'neutral', color: colors.ink, bg: colors.bgDeep },
  tools: { tone: 'green', color: colors.brandInk, bg: '#fff' },
  parts: { tone: 'neutral', color: colors.ink, bg: colors.bgDeep },
  check: { tone: 'green', color: colors.brandInk, bg: '#fff' },
  client: { tone: 'neutral', color: colors.ink, bg: colors.bgDeep },
  steps: { tone: 'green', color: colors.brandInk, bg: '#fff' },
}

interface CoachSheetProps {
  visible: boolean
  onClose: () => void
  status: string
  category?: string
  description?: string
  advice: StructuredAdvice | null
  onSendToChat?: (text: string) => void
  offline?: boolean
  onAction?: () => void
  actionLabel?: string
}

function CoachAvatar({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Sparkles size={size * 0.55} color={colors.brandInk} strokeWidth={2.2} />
    </View>
  )
}

function CoachSectionIcon({ icon, tone }: { icon: CoachIcon; tone?: string }) {
  const t = TONE[icon]
  const finalTone = tone || t.tone
  const toneMap = {
    neutral: { bg: colors.bgDeep, fg: colors.ink },
    warning: { bg: colors.warnSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
    green: { bg: '#fff', fg: colors.brandInk },
  }
  const pal = toneMap[finalTone as keyof typeof toneMap] || toneMap.neutral
  const Icon = ICONS[icon] || Info
  return (
    <View style={[styles.sectionIcon, { backgroundColor: pal.bg }]}>
      <Icon size={16} color={pal.fg} strokeWidth={2.2} />
    </View>
  )
}

function CoachInfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoChip}>
      <View style={styles.infoChipIcon}>
        <Icon size={16} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.infoChipLabel}>{label}</Text>
        <Text style={styles.infoChipValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  )
}

function CheckItem({ text, tone = 'neutral' }: { text: string; tone?: string }) {
  return (
    <View style={styles.itemRow}>
      <View style={[styles.checkCircle, tone === 'warning' ? { borderColor: colors.warning } : null]}>
        <Check size={14} color={colors.primary} strokeWidth={2.8} />
      </View>
      <Text style={styles.itemText}>{text}</Text>
    </View>
  )
}

export function CoachSheet({
  visible,
  onClose,
  status,
  category,
  description,
  advice,
  onSendToChat,
  offline,
  onAction,
  actionLabel,
}: CoachSheetProps) {
  const { t } = useTranslation()
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState<string | null>(null)
  const [answering, setAnswering] = useState(false)
  const [quotaExhausted, setQuotaExhausted] = useState(false)

  if (!visible) return null

  const questions = STATUS_QUESTIONS[status] || []
  const step = STATUS_STEP[status] || 1
  const isDisabled = quotaExhausted || offline || answering

  const sections = useMemo(() => {
    const list = advice?.sections || []
    return [...list].sort((a, b) => (a.icon === 'warning' ? -1 : 0) - (b.icon === 'warning' ? -1 : 0))
  }, [advice])

  const state: 'ready' | 'thinking' | 'quota' | 'offline' = offline ? 'offline' : quotaExhausted ? 'quota' : answering ? 'thinking' : 'ready'

  const ask = async (q: string) => {
    if (isDisabled) return
    setActiveQuestion(q)
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

  const resetAnswer = () => {
    setActiveQuestion(null)
    setAnswer(null)
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <CoachAvatar size={40} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{t('coach.title')}</Text>
            <View style={styles.headerRow}>
              {advice?.title ? <Text style={styles.headerSub} numberOfLines={1}>{advice.title}</Text> : null}
              <View style={styles.stepChip}>
                <Text style={styles.stepChipText}>Étape {step}/5</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.close} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <X size={18} color={colors.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {state === 'offline' && (
            <View style={styles.offlineBanner}>
              <AlertTriangle size={16} color={colors.textMuted} />
              <Text style={styles.offlineBannerText}>{t('coach.offlineMessage')}</Text>
            </View>
          )}

          {/* Summary */}
          {advice?.summary && (
            <View style={styles.summary}>
              <Sparkles size={18} color={colors.brandInk} />
              <Text style={styles.summaryText}>{advice.summary}</Text>
            </View>
          )}

          {/* Info chips */}
          {(advice?.difficulty || advice?.durationMinutes) && (
            <View style={styles.infoChips}>
              {advice.difficulty ? <CoachInfoChip icon={Star} label={t('coach.difficulty')} value={advice.difficulty} /> : null}
              {advice.durationMinutes ? (
                <CoachInfoChip icon={Clock} label={t('coach.duration')} value={`${advice.durationMinutes.min}–${advice.durationMinutes.max} min`} />
              ) : null}
            </View>
          )}

          {/* Sections */}
          <View style={styles.sections}>
            {sections.map((section, i) => {
              const tone = TONE[section.icon].tone
              const isWarning = tone === 'warning'
              return (
                <View key={i} style={[styles.sectionCard, isWarning ? { borderLeftWidth: 3, borderLeftColor: colors.warning } : null]}>
                  <View style={styles.sectionHeader}>
                    <CoachSectionIcon icon={section.icon} tone={tone} />
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  {section.items.map((item, j) => (
                    <CheckItem key={j} text={item} tone={tone} />
                  ))}
                </View>
              )
            })}
          </View>

          {/* Ask client */}
          {advice?.askClient && advice.askClient.length > 0 && (
            <View style={styles.askCard}>
              <View style={styles.sectionHeader}>
                <CoachSectionIcon icon="client" />
                <Text style={styles.sectionTitle}>{t('coach.askClient')}</Text>
              </View>
              {advice.askClient.map((q, i) => (
                <View key={i} style={styles.askRow}>
                  <View style={styles.askMark}>
                    <Text style={styles.askMarkText}>?</Text>
                  </View>
                  <Text style={styles.askText}>{q}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Say to client */}
          {advice?.sayToClient && (
            <View style={styles.clientMessage}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: '#fff' }]}>
                  <MessageCircle size={16} color={colors.info} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.infoInk }]}>{t('coach.toClient')}</Text>
              </View>
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText}>« {advice.sayToClient} »</Text>
              </View>
              {onSendToChat && (
                <Button
                  title={t('coach.sendToChat')}
                  onPress={() => onSendToChat(advice.sayToClient!)}
                  icon={<Send size={16} color="#fff" />}
                  fullWidth
                  variant="secondary"
                />
              )}
            </View>
          )}

          {/* Question zone */}
          <View style={styles.questionZone}>
            <Text style={styles.questionTitle}>{t('coach.questionTitle')}</Text>

            {answering && (
              <View style={styles.thinkingCard}>
                <CoachAvatar size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.thinkingTitle}>{t('coach.thinking')}</Text>
                  <View style={styles.thinkingSkeletons}>
                    <View style={[styles.thinkingSkeleton, { width: '88%' }]} />
                    <View style={[styles.thinkingSkeleton, { width: '55%' }]} />
                  </View>
                </View>
              </View>
            )}

            {answer && activeQuestion && (
              <View style={styles.answerCard}>
                <Text style={styles.answerLabel}>« {activeQuestion} »</Text>
                <Text style={styles.answerText}>{answer}</Text>
                <TouchableOpacity onPress={resetAnswer}>
                  <Text style={styles.resetText}>{t('coach.newQuestion')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.questionPills}>
              {questions.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.questionPill,
                    activeQuestion === q && styles.questionPillActive,
                    isDisabled && styles.questionPillDisabled,
                  ]}
                  onPress={() => ask(q)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.questionPillText,
                      activeQuestion === q && styles.questionPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {q}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.photoRow}>
              <View style={[styles.photoBtn, isDisabled ? { opacity: 0.5 } : null]}>
                <Camera size={22} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.photoTitle}>{t('coach.photoTitle')}</Text>
                <Text style={styles.photoSub}>{t('coach.photoSub')}</Text>
              </View>
            </View>

            <View style={styles.footerHint}>
              {state === 'quota' ? <AlertTriangle size={14} color={colors.warning} /> : null}
              {state === 'offline' ? <AlertTriangle size={14} color={colors.textMuted} /> : null}
              {state === 'ready' || state === 'thinking' ? <Info size={14} color={colors.textMuted} /> : null}
              <Text style={[styles.footerHintText, state === 'quota' ? { color: colors.warnInk } : null]}>
                {state === 'quota' ? t('coach.quotaExhausted')
                  : state === 'offline' ? t('coach.offlineHint')
                    : t('coach.freeToday')}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky footer */}
        {onAction && (
          <View style={styles.footer}>
            <Button title={actionLabel || t('coach.action')} onPress={onAction} fullWidth variant="secondary" />
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,22,40,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 16,
  },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.3 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  headerSub: { fontSize: 13, fontWeight: typography.weight.semibold as any, color: colors.textMuted },
  stepChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
  stepChipText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: colors.brandInk },
  close: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 24 },
  offlineBanner: {
    backgroundColor: colors.bgDeep, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  offlineBannerText: { fontSize: 12.5, fontWeight: typography.weight.semibold as any, color: colors.textMuted },
  summary: {
    backgroundColor: colors.brandSoft, borderRadius: radius.lg,
    padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12,
  },
  summaryText: { flex: 1, fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.brandInk, lineHeight: 20 },
  infoChips: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  infoChip: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: 14, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  infoChipIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  infoChipLabel: { fontSize: 10.5, fontWeight: typography.weight.bold as any, color: colors.textMuted, letterSpacing: 0.4, textTransform: 'uppercase' },
  infoChipValue: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  sections: { gap: 10 },
  sectionCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSoft,
    padding: 14, gap: 6,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.2 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontSize: 14, fontWeight: typography.weight.medium as any, color: colors.text, lineHeight: 19 },
  askCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSoft,
    padding: 14, gap: 6, marginTop: 10,
  },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  askMark: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  askMarkText: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  askText: { flex: 1, fontSize: 14, fontWeight: typography.weight.medium as any, color: colors.text, lineHeight: 19 },
  clientMessage: {
    backgroundColor: colors.infoSoft, borderRadius: radius.lg,
    padding: 14, gap: 10, marginTop: 10,
  },
  quoteBox: {
    borderLeftWidth: 3, borderLeftColor: colors.info,
    paddingLeft: 12, paddingVertical: 2, marginLeft: 2,
  },
  quoteText: { fontSize: 14, fontWeight: typography.weight.medium as any, color: colors.ink, lineHeight: 21, fontStyle: 'italic' },
  questionZone: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSoft,
    padding: 14, marginTop: 10, gap: 10,
  },
  questionTitle: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  thinkingCard: {
    backgroundColor: colors.brandSoft, borderRadius: 14, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  thinkingTitle: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.brandInk, marginBottom: 6 },
  thinkingSkeletons: { gap: 4 },
  thinkingSkeleton: { height: 7, borderRadius: 4, backgroundColor: '#fff', opacity: 0.7 },
  answerCard: { backgroundColor: colors.brandTint, borderRadius: radius.lg, padding: 14, gap: 6 },
  answerLabel: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.brandInk },
  answerText: { fontSize: 14, fontWeight: typography.weight.medium as any, color: colors.text, lineHeight: 20 },
  resetText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.primary },
  questionPills: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  questionPill: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  questionPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  questionPillDisabled: { opacity: 0.4 },
  questionPillText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.text },
  questionPillTextActive: { color: '#fff' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  photoBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  photoTitle: { fontSize: 12.5, fontWeight: typography.weight.semibold as any, color: colors.text },
  photoSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  footerHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft, borderStyle: 'dashed' },
  footerHintText: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.textMuted },
  footer: {
    padding: 16, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  avatar: {
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 2,
  },
})
