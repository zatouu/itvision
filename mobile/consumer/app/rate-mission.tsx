import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPostQueued } from '../src/api'

const TAGS = ['Ponctuel', 'Propre', 'Professionnel', 'Bon prix', 'Rapide', 'Communicatif']

export default function RateMission() {
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
    if (rating === 0) { setError('Veuillez donner une note'); return }
    setLoading(true)
    setError(null)
    try {
      const r = await apiPostQueued('/api/services/reviews', {
        requestId: id,
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      }, 'Votre avis sera envoyé dès le retour réseau.')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          <Text style={s.successEmoji}>🎉</Text>
          <Text style={s.successTitle}>Merci pour votre avis !</Text>
          <Text style={s.successText}>Votre note aide la communauté Ligey à s'améliorer.</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.replace('/')}>
            <Text style={s.btnText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.skipBtn}>
              <Text style={s.skipText}>Plus tard</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.title}>Comment s'est passée l'intervention ?</Text>
          {providerName && <Text style={s.subtitle}>Notez {providerName}</Text>}

          {/* Étoiles */}
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} style={s.starBtn}>
                <Text style={[s.star, n <= rating && s.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.ratingLabel}>
            {rating === 0 ? 'Appuyez sur une étoile' :
             rating === 1 ? 'Très insatisfait' :
             rating === 2 ? 'Insatisfait' :
             rating === 3 ? 'Correct' :
             rating === 4 ? 'Satisfait' :
             'Excellent !'}
          </Text>

          {/* Tags rapides */}
          {rating >= 3 && (
            <View style={s.tagsSection}>
              <Text style={s.tagsTitle}>Qu'avez-vous apprécié ? (optionnel)</Text>
              <View style={s.tagsRow}>
                {TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[s.tag, selectedTags.includes(tag) && s.tagActive]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Commentaire */}
          <TextInput
            style={s.input}
            placeholder="Un commentaire ? (optionnel)"
            placeholderTextColor="#94A3B8"
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btn, rating === 0 && s.btnDisabled]}
            onPress={submit}
            disabled={loading || rating === 0}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Envoyer mon avis</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  skipText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 44, color: '#E2E8F0' },
  starActive: { color: '#F59E0B' },
  ratingLabel: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  tagsSection: { marginBottom: 20 },
  tagsTitle: { fontSize: 13, color: '#475569', fontWeight: '600', marginBottom: 10 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  tagActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  tagText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  tagTextActive: { color: '#2563EB' },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 80, marginBottom: 16, backgroundColor: '#F8FAFC' },
  error: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  successText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
})
