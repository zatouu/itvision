import { useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { X, Sparkles, Check } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, shadows } from '../design'
import { hapticLight, hapticSuccess } from '../haptics'

export interface ClarifyQuestion {
  id: string
  question: string
  options?: string[]
  allowFreeText?: boolean
}

export interface ClarifyAnswer {
  question: string
  answer: string
}

interface Props {
  visible: boolean
  questions: ClarifyQuestion[]
  applying: boolean
  onApply: (answers: ClarifyAnswer[]) => void
  onClose: () => void
}

export default function AiClarifyModal({ visible, questions, applying, onApply, onClose }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [freeText, setFreeText] = useState<Record<string, string>>({})

  const pickOption = (qid: string, option: string) => {
    hapticLight()
    setSelected(prev => ({ ...prev, [qid]: prev[qid] === option ? '' : option }))
  }

  const answeredCount = questions.filter(q => (selected[q.id] || freeText[q.id]?.trim())).length

  const handleApply = () => {
    const answers: ClarifyAnswer[] = []
    for (const q of questions) {
      const parts: string[] = []
      if (selected[q.id]) parts.push(selected[q.id])
      if (freeText[q.id]?.trim()) parts.push(freeText[q.id].trim())
      if (parts.length > 0) answers.push({ question: q.question, answer: parts.join(' — ') })
    }
    hapticSuccess()
    onApply(answers)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetWrap}>
          <View style={s.sheet}>
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Sparkles size={18} color={colors.primary} />
                <Text style={s.title}>{t('request.aiClarifyTitle', { defaultValue: 'Précisez votre demande' })}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.subtitle}>
              {t('request.aiClarifySub', { defaultValue: 'Répondez à ce qui est vrai pour vous. Ignorez ce que vous ne savez pas — rien ne sera inventé.' })}
            </Text>

            <ScrollView style={s.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {questions.map((q, idx) => (
                <View key={q.id} style={s.questionBlock}>
                  <Text style={s.questionText}>{idx + 1}. {q.question}</Text>
                  {q.options && q.options.length > 0 && (
                    <View style={s.chipsRow}>
                      {q.options.map(opt => {
                        const active = selected[q.id] === opt
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[s.chip, active && s.chipActive]}
                            onPress={() => pickOption(q.id, opt)}
                            activeOpacity={0.7}
                          >
                            {active && <Check size={13} color={colors.surface} />}
                            <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                  {q.allowFreeText !== false && (
                    <TextInput
                      style={s.freeInput}
                      value={freeText[q.id] || ''}
                      onChangeText={v => setFreeText(prev => ({ ...prev, [q.id]: v }))}
                      placeholder={t('request.aiClarifyOther', { defaultValue: 'Autre précision (optionnel)…' })}
                      placeholderTextColor={colors.textMuted}
                    />
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[s.applyBtn, (answeredCount === 0 || applying) && s.applyBtnDisabled]}
              onPress={handleApply}
              disabled={answeredCount === 0 || applying}
              activeOpacity={0.85}
            >
              {applying ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={s.applyBtnText}>
                  {t('request.aiClarifyApply', { defaultValue: 'Compléter ma description' })}{answeredCount > 0 ? ` (${answeredCount})` : ''}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
    ...shadows.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn: { padding: 4 },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },
  body: { flexGrow: 0 },
  questionBlock: { marginBottom: spacing.lg },
  questionText: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, lineHeight: 20 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { color: colors.surface, fontWeight: '600' },
  freeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  applyBtnDisabled: { opacity: 0.5 },
  applyBtnText: { color: colors.surface, fontSize: 14, fontWeight: '700' },
})
