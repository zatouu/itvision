import { useState } from 'react'

import { colors, radius, shadows } from '../src/design'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPostQueued } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { humanErrorMessage } from '../src/errorMessages'
import { useTranslation } from 'react-i18next'
import { Star, PartyPopper, ArrowLeft, Check, Send } from 'lucide-react-native'
import { hapticSelect, hapticSuccess } from '../src/haptics'

const TAG_KEYS = ['tag_punctual', 'tag_clean', 'tag_pro', 'tag_goodPrice', 'tag_fast', 'tag_communicative'] as const

function RateMission() {
  const { t } = useTranslation()
  const { id, providerName } = useLocalSearchParams<{ id: string; providerName?: string }>()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 3)
    )
  }

  const submit = async () => {
    if (rating === 0) { setError(t('rating.selectRating')); return }
    setLoading(true)
    setError(null)
    try {
      const r = await apiPostQueued('/api/services/reviews', {
        requestId: id,
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      }, t('rating.queuedOffline'))
      setSubmitted(true)
      hapticSuccess()
    } catch (e: any) {
      setError(humanErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          <PartyPopper size={64} color={colors.primary} />
          <Text style={s.successTitle}>{t('rating.thanks')}</Text>
          <Text style={s.successText}>{t('rating.thanksSub')}</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.back()}>
            <Text style={s.btnText}>{t('rating.backToMission')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const missionRef = id ? String(id).slice(-6).toUpperCase() : ''
  const initials = (providerName || 'P').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('rating.headerTitle', { defaultValue: 'Noter la mission' })}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.skipBtn}>
            <Text style={s.skipText}>{t('rating.later')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Hero prestataire */}
          <View style={s.hero}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
              <View style={s.verifiedBadge}><Check size={11} color="#fff" strokeWidth={3.5} /></View>
            </View>
            <Text style={s.providerName}>{providerName || t('mission.defaultProvider')}</Text>
            <Text style={s.heroSub}>
              {t('rating.missionDone', { ref: missionRef, defaultValue: `Mission #${missionRef} terminée` })}
            </Text>
          </View>

          {/* Étoiles */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => { hapticSelect(); setRating(n) }} style={s.starBtn} activeOpacity={0.7}>
                <Star size={38} color={n <= rating ? colors.warning : colors.border} fill={n <= rating ? colors.warning : 'transparent'} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[s.ratingLabel, rating > 0 && { color: colors.primary }]}>
            {rating === 0 ? t('rating.tapStar') :
             rating === 1 ? t('rating.veryDissatisfied') :
             rating === 2 ? t('rating.dissatisfied') :
             rating === 3 ? t('rating.ok') :
             rating === 4 ? t('rating.satisfied') :
             t('rating.excellent')}
          </Text>

          {/* Tags rapides */}
          {rating >= 3 && (
            <View style={s.tagsSection}>
              <Text style={s.tagsTitle}>{t('rating.whatDidYouLike')}</Text>
              <View style={s.tagsRow}>
                {TAG_KEYS.map(key => {
                  const tag = t(`rating.${key}`)
                  const active = selectedTags.includes(tag)
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.tag, active && s.tagActive]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      {active && <Check size={12} color={colors.brandInk} strokeWidth={3} />}
                      <Text style={[s.tagText, active && s.tagTextActive]}>{tag}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

          {/* Commentaire */}
          <Text style={s.fieldLabel}>{t('rating.commentLabel', { defaultValue: 'Commentaire (optionnel)' })}</Text>
          <TextInput
            style={s.input}
            placeholder={t('rating.commentPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={s.hint}>{t('rating.commentHint', { defaultValue: 'Votre avis aidera les autres clients.' })}</Text>

          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.btn, rating === 0 && s.btnDisabled]}
            onPress={submit}
            disabled={loading || rating === 0}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (<>
                  <Text style={s.btnText}>{t('rating.submit')}</Text>
                  <Send size={16} color="#fff" />
                </>)
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  skipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  content: { paddingHorizontal: 22, paddingBottom: 24 },
  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, borderWidth: 2.5, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  providerName: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 12, letterSpacing: -0.3 },
  heroSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 16, fontWeight: '800', color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  tagsSection: { marginTop: 26 },
  tagsTitle: { fontSize: 12.5, fontWeight: '700', color: colors.text, marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tagActive: { borderColor: colors.primary, backgroundColor: colors.brandSoft, borderWidth: 1.5 },
  tagText: { fontSize: 12, color: colors.text, fontWeight: '700' },
  tagTextActive: { color: colors.brandInk },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text, marginTop: 20, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, fontSize: 13.5, color: colors.text, minHeight: 90, backgroundColor: colors.surface },
  hint: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center', marginTop: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, minHeight: 52, ...shadows.md },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  successText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
})

export default withScreenBoundary(RateMission, 'RateMission')
