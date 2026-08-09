import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import SuccessBanner from '../../src/components/SuccessBanner'
import Button from '../../src/components/Button'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import { Star, Clock, MessageSquare, Receipt, RotateCcw, Banknote, ShieldAlert, ChevronRight, Send, Check } from 'lucide-react-native'
import { colors, spacing, radius, shadows, typography } from '../../src/design'
import { mockMission, mockProviders } from '../../src/mock'

const TAGS = ['Ponctuel', 'Professionnel', 'Rapide', 'Travail propre', 'Bon prix', 'Communicatif']
const ACTIONS = [
  { key: 'invoice', icon: <Receipt size={18} color={colors.text} />, label: 'downloadInvoice' },
  { key: 'rebook', icon: <RotateCcw size={18} color={colors.text} />, label: 'rebook' },
  { key: 'tip', icon: <Banknote size={18} color={colors.text} />, label: 'leaveTip' },
  { key: 'dispute', icon: <ShieldAlert size={18} color={colors.text} />, label: 'reportDispute' },
]

export default function MissionReview() {
  const { t } = useTranslation()
  const [rating, setRating] = useState(5)
  const [selectedTags, setSelectedTags] = useState<string[]>(['Professionnel', 'Rapide'])
  const [comment, setComment] = useState('')

  const provider = mockMission.provider || mockProviders[0]
  const initials = provider.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <AppHeader title={t('clientReview.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <SuccessBanner
          title={t('clientReview.successTitle')}
          subtitle={t('clientReview.successSub')}
        />

        <View style={s.providerCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{provider.name}</Text>
            <Text style={s.trade}>{provider.trade}</Text>
            <View style={s.arrivalRow}>
              <Clock size={14} color={colors.success} />
              <Text style={s.arrivalText}>{t('clientReview.arrivedIn', { minutes: 18 })}</Text>
            </View>
          </View>
        </View>

        <Text style={s.question}>{t('clientReview.question')}</Text>

        <View style={s.stars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i + 1)} activeOpacity={0.7}>
              <Star size={44} color={i < rating ? colors.warning : '#E2E8F0'} fill={i < rating ? colors.warning : 'transparent'} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.tags}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              style={[s.tag, selectedTags.includes(tag) && s.tagActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.commentBox}>
          <MessageSquare size={18} color={colors.textSecondary} />
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('clientReview.commentPlaceholder')}
            multiline
            numberOfLines={4}
            style={s.commentInput}
            textAlignVertical="top"
          />
          <Text style={s.commentCounter}>{comment.length}/500</Text>
        </View>

        <View style={s.actionsList}>
          {ACTIONS.map(action => (
            <TouchableOpacity key={action.key} style={s.actionRow} activeOpacity={0.85}>
              <View style={s.actionIconCircle}>
                {action.icon}
              </View>
              <Text style={s.actionLabel}>{t(`clientReview.${action.label}`)}</Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <StickyBottomBar>
        <Button
          title={t('clientReview.submit')}
          onPress={() => router.back()}
          fullWidth
          size="lg"
          icon={<Send size={18} color={colors.surface} />}
        />
      </StickyBottomBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  providerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  name: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  trade: { fontSize: typography.base.fontSize, color: colors.textSecondary, marginTop: 2 },
  arrivalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  arrivalIcon: { color: colors.success },
  arrivalText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  question: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: typography.lg.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  star: { color: '#E2E8F0' },
  starActive: { color: colors.warning },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  tagText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  tagTextActive: { color: colors.success, fontWeight: typography.weight.extrabold as any },
  commentBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  commentIcon: { color: colors.textSecondary, marginBottom: spacing.sm },
  commentInput: {
    flex: 1,
    fontSize: typography.base.fontSize,
    color: colors.text,
    minHeight: 80,
  },
  commentCounter: {
    textAlign: 'right',
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  actionsList: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { color: colors.text },
  actionLabel: { flex: 1, fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.bold as any },
  actionArrow: { color: colors.textSecondary },
})
