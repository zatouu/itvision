import { createThemedStyles } from '../src/theme'
import { useState } from 'react'
import { logError } from '../src/log'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, Image, Platform, KeyboardAvoidingView } from 'react-native'
import Toggle from '../src/components/Toggle'

const uid = () => Math.random().toString(36).slice(2, 9)

type ImageItem = { id: string; url: string; fromDevice: boolean }
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { spacing, radius, shadows } from '../src/design'
import { Plus, X, Image as ImageIcon, Camera } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { apiPost, apiUpload } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { pickMedia, captureMedia, resolveMediaUrl } from '../src/media'
import { pickOption } from '../src/option-sheet'
import { useTranslation } from 'react-i18next'

const TYPES = [
  { id: 'realisation', labelKey: 'portfolioAddScreen.types.realisation' },
  { id: 'certification', labelKey: 'portfolioAddScreen.types.certification' },
  { id: 'diplome', labelKey: 'portfolioAddScreen.types.diplome' },
]

function PortfolioAdd() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
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
        logError('Portfolio.upload', e)
      }
    }
    if (urls.length) appendUrls(urls)
    return urls.length
  }

  const promptSource = async (): Promise<'camera' | 'gallery' | null> => {
    const key = await pickOption(t('portfolioAddScreen.addPhoto'), [
      { key: 'camera', label: t('portfolioAddScreen.camera') },
      { key: 'gallery', label: t('portfolioAddScreen.gallery') },
    ])
    return key === 'camera' || key === 'gallery' ? key : null
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
        if (!added) setError(t('portfolioAddScreen.uploadFailed'))
      }
    } catch (e: any) {
      setError(e.message || t('portfolioAddScreen.pickError'))
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    if (!title.trim()) { setError(t('portfolioAddScreen.titleRequired')); return }
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
      setError(e.message || t('portfolioAddScreen.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <BackIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('portfolioAddScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <Text style={s.label}>{t('portfolioAddScreen.type')}</Text>
        <View style={s.typeRow}>
          {TYPES.map((typ) => (
            <TouchableOpacity
              key={typ.id}
              style={[s.typeBtn, type === typ.id && s.typeBtnActive]}
              onPress={() => setType(typ.id)}
            >
              <Text style={[s.typeText, type === typ.id && s.typeTextActive]}>{t(typ.labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>{t('portfolioAddScreen.titleLabel')}</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder={t('portfolioAddScreen.titlePlaceholder')} placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>{t('portfolioAddScreen.category')}</Text>
        <TextInput style={s.input} value={category} onChangeText={setCategory} placeholder={t('portfolioAddScreen.categoryPlaceholder')} placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>{t('portfolioAddScreen.description')}</Text>
        <TextInput style={[s.input, s.textarea]} multiline numberOfLines={4} value={description} onChangeText={setDescription} placeholder={t('portfolioAddScreen.descriptionPlaceholder')} placeholderTextColor={colors.textMuted} />

        <Text style={s.label}>{t('portfolioAddScreen.photos')}</Text>
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
                <Text style={s.imageName} numberOfLines={1} ellipsizeMode="tail">{t('portfolioAddScreen.image')}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => removeImage(i)} style={s.removeBtn}>
              <X size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <View style={s.mediaBtnRow}>
          <TouchableOpacity onPress={addImage} style={s.addBtn}>
            <Plus size={18} color={colors.primaryText} />
            <Text style={s.addText}>URL</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addMedia} style={[s.addBtn, uploading && { opacity: 0.6 }]} disabled={uploading}>
            {uploading ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Camera size={18} color={colors.primaryText} />}
            <Text style={s.addText}>{t('portfolioAddScreen.gallery')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.featuredRow}>
          <View>
            <Text style={s.label}>{t('portfolioAddScreen.feature')}</Text>
            <Text style={s.hint}>{t('portfolioAddScreen.featureHint')}</Text>
          </View>
          <Toggle value={featured} onValueChange={setFeatured} />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={[s.cta, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.ctaText}>{t('portfolioAddScreen.save')}</Text>}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(PortfolioAdd, 'PortfolioAdd')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
    back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '600', color: colors.text },
    body: { padding: spacing.lg, paddingBottom: 100 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
    input: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border },
    textarea: { minHeight: 80, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', gap: spacing.md },
    typeBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeText: { fontSize: 14, color: colors.text, fontWeight: '500' },
    typeTextActive: { color: colors.onPrimary },
    imageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    imagePreview: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.bg, marginRight: spacing.sm },
    imageInput: { flex: 1, marginBottom: 0 },
    imageNameBox: { flex: 1, justifyContent: 'center' },
    imageName: { fontSize: 14, color: colors.textSecondary },
    removeBtn: { padding: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: radius.md },
    mediaBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, alignSelf: 'flex-start' },
    addText: { fontSize: 14, color: colors.primaryText, fontWeight: '600' },
    featuredRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg, ...shadows.sm },
    hint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    error: { color: colors.danger, marginTop: spacing.md, fontSize: 14 },
    cta: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
    ctaText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
  })
  return { colors, s }
})
