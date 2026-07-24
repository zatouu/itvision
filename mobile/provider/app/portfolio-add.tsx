import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Switch, ActivityIndicator, Image, Platform, Alert } from 'react-native'

const uid = () => Math.random().toString(36).slice(2, 9)

type ImageItem = { id: string; url: string; fromDevice: boolean }
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '../src/design'
import { ArrowLeft, Plus, X, Image as ImageIcon, Camera } from 'lucide-react-native'
import { apiPost, apiUpload } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { pickMedia, captureMedia, resolveMediaUrl } from '../src/media'

const TYPES = [
  { id: 'realisation', label: 'Réalisation' },
  { id: 'certification', label: 'Certification' },
  { id: 'diplome', label: 'Diplôme' },
]

function PortfolioAdd() {
  const [type, setType] = useState('realisation')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [images, setImages] = useState<ImageItem[]>([{ id: uid(), url: '', fromDevice: false }])
  const [featured, setFeatured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const setImage = (index: number, value: string) => {
    const copy = [...images]
    copy[index] = { ...copy[index], url: value }
    setImages(copy)
  }

  const addImage = () => setImages([...images, { id: uid(), url: '', fromDevice: false }])
  const removeImage = (index: number) => {
    const copy = images.filter((_, i) => i !== index)
    setImages(copy.length ? copy : [{ id: uid(), url: '', fromDevice: false }])
  }

  const appendUrls = (urls: string[]) => {
    setImages((prev) => {
      const items = urls.map((url) => ({ id: uid(), url, fromDevice: true }))
      const withoutEmpty = prev.filter((it) => it.url.trim())
      const next = [...withoutEmpty, ...items]
      return next.length ? next : [{ id: uid(), url: '', fromDevice: false }]
    })
  }

  const uploadAndAppend = async (assets: { uri: string; name: string }[]) => {
    const urls: string[] = []
    for (const file of assets) {
      try {
        const uploaded = await apiUpload(file.uri, file.name, 'image/jpeg', 'portfolio')
        const url = uploaded.url || uploaded.staticUrl
        if (url) urls.push(url)
      } catch (e: any) {
        console.warn('Upload portfolio failed:', e?.message)
      }
    }
    if (urls.length) appendUrls(urls)
    return urls.length
  }

  const promptSource = async (): Promise<'camera' | 'gallery' | null> => {
    return new Promise((resolve) => {
      const options = ['Appareil photo', 'Galerie', 'Annuler']
      if (Platform.OS === 'ios') {
        const ActionSheetIOS = require('react-native').ActionSheetIOS
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: 2, title: 'Ajouter une photo' },
          (idx: number) => resolve(idx === 0 ? 'camera' : idx === 1 ? 'gallery' : null)
        )
      } else {
        Alert.alert('Ajouter une photo', '', [
          { text: options[0], onPress: () => resolve('camera') },
          { text: options[1], onPress: () => resolve('gallery') },
          { text: options[2], style: 'cancel', onPress: () => resolve(null) },
        ])
      }
    })
  }

  const addMedia = async () => {
    try {
      const source = await promptSource()
      if (!source) return
      setUploading(true)
      const assets = source === 'camera'
        ? await captureMedia()
        : await pickMedia({ maxFiles: 5 })
      if (assets.length) {
        const added = await uploadAndAppend(assets)
        if (!added) setError('Aucune image n\'a pu être uploadée')
      }
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sélection des images')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!title.trim()) { setError('Le titre est requis'); return }
    setSaving(true)
    setError('')
    try {
      const imageList = images.filter((it) => it.url.trim()).map((it) => ({ url: it.url.trim() }))
      await apiPost('/api/provider/portfolio', {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        type,
        images: imageList,
        isFeatured: featured,
      })
      router.back()
    } catch (e: any) {
      setError(e.message || 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Ajouter au portfolio</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.label}>Type</Text>
        <View style={s.typeRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[s.typeBtn, type === t.id && s.typeBtnActive]}
              onPress={() => setType(t.id)}
            >
              <Text style={[s.typeText, type === t.id && s.typeTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Titre *</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Ex: Installation cuisine" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Catégorie</Text>
        <TextInput style={s.input} value={category} onChangeText={setCategory} placeholder="Ex: Électricité" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.textarea]} multiline numberOfLines={4} value={description} onChangeText={setDescription} placeholder="Décrivez la mission, le client, les résultats…" placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>Photos</Text>
        {images.map((img, i) => (
          <View key={img.id} style={s.imageRow}>
            {img.url.trim() ? (
              <Image source={{ uri: resolveMediaUrl(img.url) }} style={s.imagePreview} />
            ) : null}
            {!img.fromDevice ? (
              <TextInput
                style={[s.input, s.imageInput]}
                value={img.url}
                onChangeText={(v) => setImage(i, v)}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            ) : (
              <View style={s.imageNameBox}>
                <Text style={s.imageName} numberOfLines={1} ellipsizeMode="tail">Image</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => removeImage(i)} style={s.removeBtn}>
              <X size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={s.mediaBtnRow}>
          <TouchableOpacity onPress={addImage} style={s.addBtn}>
            <Plus size={18} color={colors.primary} />
            <Text style={s.addText}>URL</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addMedia} style={[s.addBtn, uploading && { opacity: 0.6 }]} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Camera size={18} color={colors.primary} />}
            <Text style={s.addText}>Galerie</Text>
          </TouchableOpacity>
        </View>

        <View style={s.featuredRow}>
          <View>
            <Text style={s.label}>Mettre en avant</Text>
            <Text style={s.hint}>Cet élément apparaîtra en tête du portfolio.</Text>
          </View>
          <Switch value={featured} onValueChange={setFeatured} trackColor={{ false: colors.border, true: colors.success }} thumbColor="#fff" />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={[s.cta, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Enregistrer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  body: { padding: spacing.lg, paddingBottom: 100 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: spacing.md },
  typeBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  typeTextActive: { color: '#fff' },
  imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  imagePreview: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bg, marginRight: spacing.sm },
  imageInput: { flex: 1, marginBottom: 0 },
  imageNameBox: { flex: 1, justifyContent: 'center' },
  imageName: { fontSize: 14, color: colors.textSecondary },
  removeBtn: { padding: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: radius.md },
  mediaBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, alignSelf: 'flex-start' },
  addText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  featuredRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg, ...shadows.sm },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  error: { color: colors.danger, marginTop: spacing.md, fontSize: 14 },
  cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})

export default withScreenBoundary(PortfolioAdd, 'PortfolioAdd')
