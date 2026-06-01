import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPostQueued, apiUpload, apiGetRetry } from '../src/api'
import { cacheClear } from '../src/storage'
import { pickMedia, PickedMedia } from '../src/media'
import { reverseGeocode } from '../src/geocode'
import VoiceRecorder, { VoiceRecording } from '../src/components/VoiceRecorder'
import VoicePlayer from '../src/components/VoicePlayer'
import { loadCategories, getCategoryLabel, ServiceCategory } from '../src/categories'
import { useTranslation } from 'react-i18next'

const FALLBACK_CATS = [
  { id: 'electricite', label: 'Électricité', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Sécurité', abbr: 'SE', color: '#065F46' },
]

const BUDGETS = ['5 000', '10 000', '25 000', '50 000', '100 000']

function isImagePreview(media: PickedMedia): boolean {
  return media.type === 'image' && typeof media.uri === 'string' && media.uri.trim().length > 0
}

function mediaLabel(media: PickedMedia): string {
  if (media.type === 'video') return 'Vidéo'
  return 'Fichier'
}

export default function CreateRequest() {
  const params = useLocalSearchParams<{ category?: string }>()
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState(params.category || '')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [media, setMedia] = useState<PickedMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [landmark, setLandmark] = useState('')
  const [autoAddress, setAutoAddress] = useState('')
  const [voiceNote, setVoiceNote] = useState<VoiceRecording | null>(null)
  const [cats, setCats] = useState<{ id: string; label: string; abbr: string; color: string }[]>(FALLBACK_CATS)
  const [priceEstimate, setPriceEstimate] = useState<{ median: number; low: number; high: number } | null>(null)
  const { i18n } = useTranslation()

  useEffect(() => {
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({
        id: c.slug,
        label: getCategoryLabel(c, i18n.language),
        abbr: c.abbr,
        color: c.color,
      })))
    }).catch(() => {})
    Location.requestForegroundPermissionsAsync()
  }, [])

  // Fetch price estimate when category + coords are ready
  useEffect(() => {
    if (!category || !coords) { setPriceEstimate(null); return }
    const [lng, lat] = coords
    apiGetRetry(`/api/services/price-estimate?category=${category}&lng=${lng}&lat=${lat}`)
      .then((res: any) => { if (res.estimate) setPriceEstimate(res.estimate) })
      .catch(() => {})
  }, [category, coords])

  const pickLocation = async () => {
    setLocating(true)
    setAutoAddress('')
    try {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ])
      const c: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      setCoords(c)
      // Reverse geocode
      const geo = await reverseGeocode(c[1], c[0])
      if (geo) {
        const parts = [geo.neighbourhood, geo.suburb, geo.city].filter(Boolean)
        setAutoAddress(parts.join(', ') || geo.display.split(',').slice(0, 3).join(','))
      }
    } catch {
      // Fallback Dakar centre (Place de l'Indépendance) — évite de bloquer le flow
      setCoords([-17.4467, 14.6928])
      setAutoAddress('Dakar Centre')
      setErr('Position approximative utilisée (Dakar centre). Précisez votre repère.')
    }
    setLocating(false)
  }

  const addMedia = async () => {
    try {
      const picked = await pickMedia({ maxFiles: 5 })
      if (picked.length) setMedia(prev => [...prev, ...picked].slice(0, 5))
    } catch { setErr('Impossible d\'accéder aux médias') }
  }

  const removeMedia = (idx: number) => {
    setMedia(prev => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    if (!coords) return
    setLoading(true)
    setErr(null)
    try {
      let uploadedMedia: { url: string; type: string }[] = []
      setUploadingMedia(true)
      // Upload photos/videos
      for (const m of media) {
        if (!m?.uri || typeof m.uri !== 'string') continue
        const ct = m.type === 'video' ? 'video/mp4' : 'image/jpeg'
        const res = await apiUpload(m.uri, m.name, ct)
        const uploadedUrl = typeof res?.staticUrl === 'string' && res.staticUrl
          ? res.staticUrl
          : (typeof res?.url === 'string' ? res.url : null)
        if (!uploadedUrl) throw new Error('Réponse upload invalide')
        uploadedMedia.push({ url: uploadedUrl, type: m.type })
      }
      // Upload voice note
      if (voiceNote) {
        const vRes = await apiUpload(voiceNote.uri, 'vocal.m4a', 'audio/mp4')
        const vUrl = typeof vRes?.staticUrl === 'string' && vRes.staticUrl
          ? vRes.staticUrl
          : (typeof vRes?.url === 'string' ? vRes.url : null)
        if (vUrl) uploadedMedia.push({ url: vUrl, type: 'audio' })
      }
      setUploadingMedia(false)
      const res = await apiPostQueued('/api/services/requests', {
        category,
        description,
        media: uploadedMedia,
        location: {
          type: 'Point',
          coordinates: coords,
          address: [landmark, autoAddress].filter(Boolean).join(' — ') || undefined,
        },
        budget: Number(budget.replace(/\s/g, '')) || undefined,
        channel: 'mobile',
      }, 'Demande enregistrée hors ligne — sera publiée dès le retour réseau.')
      await cacheClear('home-requests')
      await cacheClear('my-requests')
      setDone(true)
    } catch (e: any) { setErr(e.message); setUploadingMedia(false) }
    setLoading(false)
  }

  if (done) return (
    <SafeAreaView style={s.safe}>
      <View style={s.successBox}>
        <View style={s.successCheck}><Text style={s.successCheckText}>✓</Text></View>
        <Text style={s.successTitle}>Demande publiée</Text>
        <Text style={s.successSub}>Les prestataires proches vont vous envoyer leurs offres.</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.replace('/my-requests')}>
          <Text style={s.btnText}>Voir mes demandes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setDone(false); setStep(1); setCategory(''); setDescription(''); setBudget(''); setCoords(null); setMedia([]); setLandmark(''); setAutoAddress(''); setVoiceNote(null) }}>
          <Text style={s.link}>Nouvelle demande</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s2 => s2 - 1) : router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nouvelle demande</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* Stepper dots */}
      <View style={s.stepper}>
        {[1,2,3].map(n => (
          <View key={n} style={s.stepperItem}>
            <View style={[
              s.stepperDot,
              step >= n ? s.stepperDotActive : s.stepperDotInactive
            ]} />
            {n < 3 && <View style={[s.stepperLine, step > n ? s.stepperLineActive : s.stepperLineInactive]} />}
          </View>
        ))}
      </View>
      <View style={s.stepperLabels}>
        {['Catégorie','Détails','Lieu'].map((lbl, i) => (
          <Text key={lbl} style={[s.stepperLabel, step === i+1 && s.stepperLabelActive]}>{lbl}</Text>
        ))}
      </View>

      {step === 1 ? (
        <>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.stepTitle}>Choisissez une catégorie</Text>
            <Text style={s.stepSub}>Sélectionnez le type de service</Text>
            <View style={s.catGrid}>
              {cats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catCard, category === c.id && s.catCardActive]}
                  onPress={() => setCategory(c.id)}
                  activeOpacity={0.75}
                >
                  {category === c.id && (
                    <View style={s.checkmark}>
                      <Text style={s.checkmarkText}>✔</Text>
                    </View>
                  )}
                  <View style={[s.catMonogram, { backgroundColor: c.color }]}>
                    <Text style={s.catMonogramText}>{c.abbr}</Text>
                  </View>
                  <Text style={[s.catLabel, category === c.id && s.catLabelActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity
              style={[s.btn, !category && s.btnDisabled]}
              disabled={!category}
              onPress={() => setStep(2)}
              activeOpacity={0.88}
            >
              <Text style={s.btnText}>Continuer →</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 2 && (
          <View style={{ gap: 20 }}>
            <Text style={s.stepTitle}>Décrivez votre besoin</Text>
            <View>
              <Text style={s.label}>Description *</Text>
              <TextInput
                style={s.textarea}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Coupure de courant à l'étage, besoin d'un électricien..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
              />
            </View>
            <View>
              <Text style={s.label}>Message vocal (optionnel)</Text>
              {voiceNote ? (
                <VoicePlayer uri={voiceNote.uri} durationMs={voiceNote.durationMs} onRemove={() => setVoiceNote(null)} />
              ) : (
                <VoiceRecorder onRecorded={setVoiceNote} maxDurationSec={60} />
              )}
            </View>
            <View>
              <Text style={s.label}>Budget estimé (FCFA)</Text>
              {priceEstimate && (
                <View style={s.priceHint}>
                  <Text style={s.priceHintText}>
                    💡 Prix constaté : {priceEstimate.low.toLocaleString('fr-FR')} – {priceEstimate.high.toLocaleString('fr-FR')} FCFA (médiane {priceEstimate.median.toLocaleString('fr-FR')})
                  </Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {BUDGETS.map(b => (
                    <TouchableOpacity key={b} style={[s.budgetChip, budget === b && s.budgetChipActive]} onPress={() => setBudget(b)}>
                      <Text style={[s.budgetChipText, budget === b && s.budgetChipTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TextInput
                style={s.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="Ou saisir un montant"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text style={s.label}>Photos / Vidéos ({media.length}/5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {media.map((m, i) => (
                    <View key={i} style={s.mediaThumbBox}>
                      {isImagePreview(m)
                        ? <Image source={{ uri: m.uri }} style={s.mediaThumb} />
                        : (
                            <View style={s.mediaFileBox}>
                              <Text style={s.mediaFileType}>{mediaLabel(m)}</Text>
                            </View>
                          )}
                      <TouchableOpacity style={s.mediaRemove} onPress={() => removeMedia(i)}>
                        <Text style={s.mediaRemoveText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {media.length < 5 && (
                    <TouchableOpacity style={s.mediaAddBtn} onPress={addMedia}>
                      <Text style={s.mediaAddText}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
            <TouchableOpacity
              style={[s.btn, !description && s.btnDisabled]}
              disabled={!description}
              onPress={() => setStep(3)}
            >
              <Text style={s.btnText}>Continuer →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 20 }}>
            <Text style={s.stepTitle}>Votre position</Text>
            <Text style={s.stepSub}>Les prestataires proches recevront votre demande</Text>

            <TouchableOpacity style={s.locBtn} onPress={pickLocation} disabled={locating}>
              {locating ? <ActivityIndicator color="#F59E0B" /> : <Text style={s.locIcon}>📍</Text>}
              <View style={{ flex: 1 }}>
                <Text style={s.locTitle}>{coords ? 'Position obtenue ✓' : 'Utiliser ma position GPS'}</Text>
                {autoAddress ? <Text style={s.locSub}>{autoAddress}</Text> : coords ? <Text style={s.locSub}>{coords[1].toFixed(4)}, {coords[0].toFixed(4)}</Text> : null}
              </View>
            </TouchableOpacity>

            <View>
              <Text style={s.label}>Repère / Quartier *</Text>
              <TextInput
                style={s.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Ex: Près de la mosquée de Mermoz, à côté de l'école..."
                placeholderTextColor="#9CA3AF"
              />
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Obligatoire — aide le prestataire à vous trouver</Text>
            </View>

            {/* Récap */}
            <View style={s.recap}>
              <RecapRow label="Service" value={cats.find(c => c.id === category)?.label || category} />
              <RecapRow label="Description" value={description.length > 60 ? description.slice(0, 60) + '…' : description} />
              {budget ? <RecapRow label="Budget" value={`${budget} FCFA`} /> : null}
              {media.length ? <RecapRow label="Médias" value={`${media.length} fichier(s)`} /> : null}
              {voiceNote ? <RecapRow label="Vocal" value={`${Math.round(voiceNote.durationMs / 1000)}s enregistré`} /> : null}
            </View>

            {err && <Text style={s.errText}>{err}</Text>}

            <TouchableOpacity
              style={[s.btn, (!coords || !landmark.trim() || loading || uploadingMedia) && s.btnDisabled]}
              disabled={!coords || !landmark.trim() || loading || uploadingMedia}
              onPress={submit}
            >
              {loading || uploadingMedia ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Publier la demande 🚀</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      )}
    </SafeAreaView>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.recapRow}>
      <Text style={s.recapLabel}>{label}</Text>
      <Text style={s.recapValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { fontSize: 18, color: '#111827' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  cancelText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 8 },
  stepperItem: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  stepperDot: { width: 12, height: 12, borderRadius: 6 },
  stepperDotActive: { backgroundColor: '#0F172A' },
  stepperDotInactive: { backgroundColor: '#CBD5E1' },
  stepperLine: { flex: 1, height: 2, marginHorizontal: 4 },
  stepperLineActive: { backgroundColor: '#0F172A' },
  stepperLineInactive: { backgroundColor: '#CBD5E1' },
  stepperLabels: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 6, paddingBottom: 16 },
  stepperLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  stepperLabelActive: { color: '#0F172A', fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6, letterSpacing: -0.3 },
  stepSub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E2E8F0', position: 'relative', gap: 6 },
  catCardActive: { borderColor: '#0F172A', borderWidth: 2 },
  checkmark: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  catMonogram: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  catMonogramText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  catLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  catLabelActive: { color: '#0F172A' },
  catSubLabel: { fontSize: 11, color: '#64748B', textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  textarea: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 15, color: '#111827', minHeight: 110, textAlignVertical: 'top', backgroundColor: '#fff' },
  budgetChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  budgetChipActive: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  budgetChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  budgetChipTextActive: { color: '#B45309' },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, padding: 17, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  locBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  locIcon: { fontSize: 22 },
  locTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  locSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  recap: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recapLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500', flex: 0.4 },
  recapValue: { fontSize: 13, color: '#111827', fontWeight: '600', flex: 0.6, textAlign: 'right' },
  errText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  successCheck: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successCheckText: { fontSize: 32, color: '#fff', fontWeight: '300' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  successSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  link: { color: '#2563EB', fontWeight: '600', fontSize: 14, marginTop: 4 },
  mediaThumbBox: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaThumb: { width: 72, height: 72, borderRadius: 10 },
  mediaFileBox: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  mediaFileType: { fontSize: 11, color: '#334155', fontWeight: '700', textTransform: 'uppercase' },
  mediaRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: '#fff', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  mediaAddBtn: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  mediaAddText: { fontSize: 28, color: '#64748B', fontWeight: '300' },
  priceHint: { backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  priceHintText: { fontSize: 12, color: '#065F46', lineHeight: 18 },
})
