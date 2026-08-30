import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Image } from 'expo-image'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPostQueued, apiPost, apiUpload, apiGetRetry } from '../src/api'
import { cacheClear } from '../src/storage'
import { humanErrorMessage } from '../src/errorMessages'
import { pickMedia, PickedMedia } from '../src/media'
import { reverseGeocode } from '../src/geocode'
import VoiceRecorder, { VoiceRecording } from '../src/components/VoiceRecorder'
import VoicePlayer from '../src/components/VoicePlayer'
import { loadCategories, getCategoryLabel, getSubCategoryLabel, getAttributeLabel, ServiceCategory, SubCategory, Attribute } from '../src/categories'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, Check, MapPin, Plus, HelpCircle, ChevronDown, Sparkles } from 'lucide-react-native'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { getCategoryIcon } from '../src/categoryIcons'
import { hapticSelect, hapticSuccess, hapticLight } from '../src/haptics'
import { colors, radius, spacing, typography, shadows } from '../src/design'

const FALLBACK_CATS = [
  { id: 'electricite', label: 'Électricité', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Sécurité', abbr: 'SE', color: '#065F46' },
  { id: 'maconnerie', label: 'Maçonnerie', abbr: 'MA', color: '#78350F' },
  { id: 'nettoyage', label: 'Nettoyage', abbr: 'NE', color: '#0D9488' },
  { id: 'autre', label: 'Autre', abbr: 'AU', color: '#6B7280' },
]

const BUDGETS = ['5 000', '10 000', '25 000', '50 000', '100 000']

function isImagePreview(media: PickedMedia): boolean {
  return media.type === 'image' && typeof media.uri === 'string' && media.uri.trim().length > 0
}

function mediaLabel(media: PickedMedia): string {
  if (media.type === 'video') return 'Vidéo'
  return 'Fichier'
}

function CreateRequest() {
  const params = useLocalSearchParams<{ category?: string; subcategory?: string }>()
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
  const [cats, setCats] = useState<{ id: string; label: string; abbr: string; color: string; requiredAttributes?: Attribute[]; optionalAttributes?: Attribute[]; subCategories?: SubCategory[] }[]>(FALLBACK_CATS)
  const [subcategory, setSubcategory] = useState(params.subcategory || '')
  const [showSubcats, setShowSubcats] = useState(false)
  const [priceEstimate, setPriceEstimate] = useState<{ median: number; low: number; high: number } | null>(null)
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const { t, i18n } = useTranslation()

  useEffect(() => {
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({
        id: c.slug,
        label: getCategoryLabel(c, i18n.language),
        abbr: c.abbr,
        color: c.color,
        requiredAttributes: c.requiredAttributes,
        optionalAttributes: c.optionalAttributes,
        subCategories: c.subCategories,
      })))
    }).catch(() => {})
    Location.requestForegroundPermissionsAsync()
  }, [i18n.language])

  // Fetch price estimate when category + coords are ready
  useEffect(() => {
    if (!category || !coords) { setPriceEstimate(null); return }
    const [lng, lat] = coords
    apiGetRetry(`/api/services/price-estimate?category=${category}&lng=${lng}&lat=${lat}`)
      .then((res: any) => { if (res.estimate) setPriceEstimate(res.estimate) })
      .catch(() => {})
  }, [category, coords])

  // Reset dynamic attributes and subcategory when category changes
  useEffect(() => {
    setAttributes({})
    setSubcategory('')
    setShowSubcats(false)
  }, [category])

  const areRequiredAttributesFilled = () => {
    const required = cats.find(c => c.id === category)?.requiredAttributes || []
    return required.every(attr => {
      const value = attributes[attr.slug]
      return value !== undefined && value !== '' && value !== false
    })
  }

  const pickLocation = async () => {
    setLocating(true)
    setAutoAddress('')
    try {
      let pos: any = null
      try {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000)),
        ])
      } catch {
        pos = await Location.getLastKnownPositionAsync()
      }
      if (!pos) throw new Error('no location')
      const c: [number, number] = [pos.coords.longitude, pos.coords.latitude]
      setCoords(c)
      // Reverse geocode
      const geo = await reverseGeocode(c[1], c[0])
      if (geo) {
        const parts = [geo.neighbourhood, geo.suburb, geo.city].filter(Boolean)
        setAutoAddress(parts.join(', ') || geo.display.split(',').slice(0, 3).join(','))
      }
    } catch {
      // GPS obligatoire — guide l'utilisateur à l'activer
      setErr(t('request.gpsRequired'))
    }
    setLocating(false)
  }

  const addMedia = async () => {
    try {
      const picked = await pickMedia({ maxFiles: 5 })
      if (picked.length) setMedia(prev => [...prev, ...picked].slice(0, 5))
    } catch { setErr(t('request.mediaError')) }
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
        if (!uploadedUrl) throw new Error(t('request.uploadError'))
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
        subcategory: subcategory || undefined,
        description,
        media: uploadedMedia,
        location: coords ? {
          type: 'Point',
          coordinates: coords,
          address: [landmark, autoAddress].filter(Boolean).join(' — ') || undefined,
        } : {
          type: 'Point',
          coordinates: [0, 0],
          address: landmark,
        },
        budget: Number(budget.replace(/\s/g, '')) || undefined,
        channel: 'mobile',
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      }, t('request.queuedOffline'))
      await cacheClear('home-requests')
      await cacheClear('my-requests')
      hapticSuccess()
      setDone(true)
    } catch (e: any) { setErr(humanErrorMessage(e)); setUploadingMedia(false) }
    setLoading(false)
  }

  if (done) return (
    <SafeAreaView style={s.safe}>
      <View style={s.successBox}>
        <View style={s.successCheck}><Check size={40} color={colors.surface} /></View>
        <Text style={s.successTitle}>{t('request.published')}</Text>
        <Text style={s.successSub}>{t('request.publishedSub')}</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.replace('/my-requests')} activeOpacity={0.8}>
          <Text style={s.btnText}>{t('request.viewRequests')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setDone(false); setStep(1); setCategory(''); setSubcategory(''); setDescription(''); setBudget(''); setCoords(null); setMedia([]); setLandmark(''); setAutoAddress(''); setVoiceNote(null) }}>
          <Text style={s.link}>{t('request.newOne')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s2 => s2 - 1) : router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('request.createTitle')}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.cancelText}>{t('common.cancel')}</Text>
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
        {['request.stepCategory','request.stepDetails','request.stepLocation'].map((lbl, i) => (
          <Text key={lbl} style={[s.stepperLabel, step === i+1 && s.stepperLabelActive]}>{t(lbl)}</Text>
        ))}
      </View>

      {step === 1 ? (
        <>
          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            <Text style={s.stepTitle}>{t('request.chooseCategory')}</Text>
            <Text style={s.stepSub}>{t('request.chooseCategorySub')}</Text>
            <View style={s.catGrid}>
              {cats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catCard, category === c.id && s.catCardActive]}
                  onPress={() => { hapticSelect(); setCategory(c.id) }}
                  activeOpacity={0.75}
                >
                  {category === c.id && (
                    <View style={s.checkmark}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                  <View style={[s.catMonogram, { backgroundColor: c.color }]}>
                    {(() => { const Icon = getCategoryIcon(c.id); return <Icon size={22} color="#fff" /> })()}
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
              <Text style={s.btnText}>{t('request.continueBtn')}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {step === 2 && (
          <View style={{ gap: 20 }}>
            <Text style={s.stepTitle}>{t('request.describeNeed')}</Text>
            
            {/* Sous-catégorie (optionnelle) */}
            {(() => {
              const selectedCat = cats.find(c => c.id === category)
              const subs = selectedCat?.subCategories || []
              if (subs.length === 0) return null
              return (
                <View>
                  <Text style={s.label}>{t('request.subcategory')}</Text>
                  <TouchableOpacity
                    style={s.subcatDropdown}
                    onPress={() => setShowSubcats(!showSubcats)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.subcatText, !subcategory && { color: colors.textMuted }]}>
                      {subcategory
                        ? getSubCategoryLabel(subs.find(s => s.slug === subcategory)!, i18n.language)
                        : t('request.subcategoryPlaceholder')}
                    </Text>
                    <ChevronDown size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  {showSubcats && (
                    <View style={s.subcatList}>
                      <TouchableOpacity
                        style={[s.subcatItem, !subcategory && s.subcatItemActive]}
                        onPress={() => { setSubcategory(''); setShowSubcats(false); hapticLight() }}
                      >
                        <Text style={[s.subcatItemText, !subcategory && s.subcatItemTextActive]}>{t('request.subcategoryNone')}</Text>
                      </TouchableOpacity>
                      {subs.map(sub => (
                        <TouchableOpacity
                          key={sub.slug}
                          style={[s.subcatItem, subcategory === sub.slug && s.subcatItemActive]}
                          onPress={() => { setSubcategory(sub.slug); setShowSubcats(false); hapticLight() }}
                        >
                          <Text style={[s.subcatItemText, subcategory === sub.slug && s.subcatItemTextActive]}>
                            {getSubCategoryLabel(sub, i18n.language)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )
            })()}

            <View>
              <Text style={s.label}>
                {t('request.description')} {category === 'autre' ? '*' : ''}
              </Text>
              <TextInput
                style={s.textarea}
                value={description}
                onChangeText={setDescription}
                placeholder={category === 'autre' ? t('request.descPlaceholderAutre') : t('request.descPlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
              {category === 'autre' && description.trim().length < 10 && description.length > 0 && (
                <Text style={s.descHint}>{t('request.descMinChars', { count: 10 })}</Text>
              )}
              {/* AI Enhance button */}
              <TouchableOpacity
                style={[s.aiBtn, aiLoading && { opacity: 0.6 }]}
                onPress={async () => {
                  if (aiLoading) return
                  setAiLoading(true)
                  setAiResult(null)
                  try {
                    const res = await apiPost('/api/ai/assist', {
                      type: 'enhance_request',
                      category,
                      description,
                      attributes,
                    })
                    if (res.text) {
                      setAiResult(res.text)
                      setDescription(res.text)
                      hapticSuccess()
                    }
                  } catch (e: any) {
                    setErr(humanErrorMessage(e))
                  }
                  setAiLoading(false)
                }}
                disabled={aiLoading || !category}
                activeOpacity={0.8}
              >
                <Sparkles size={16} color={colors.primary} />
                <Text style={s.aiBtnText}>
                  {aiLoading ? t('request.aiLoading', { defaultValue: 'Analyse…' }) : t('request.aiEnhance', { defaultValue: 'Améliorer ma description' })}
                </Text>
              </TouchableOpacity>
            </View>
            <DynamicAttributes
              category={cats.find(c => c.id === category)}
              values={attributes}
              onChange={setAttributes}
              lang={i18n.language}
            />
            <View>
              <Text style={s.label}>{t('request.voiceNote')}</Text>
              {voiceNote ? (
                <VoicePlayer uri={voiceNote.uri} durationMs={voiceNote.durationMs} onRemove={() => setVoiceNote(null)} />
              ) : (
                <VoiceRecorder onRecorded={setVoiceNote} maxDurationSec={60} />
              )}
            </View>
            <View>
              <Text style={s.label}>{t('request.budget')}</Text>
              {priceEstimate && (
                <View style={s.priceHint}>
                  <Text style={s.priceHintText}>
                    {t('request.priceHint', { low: priceEstimate.low.toLocaleString('fr-FR'), high: priceEstimate.high.toLocaleString('fr-FR'), median: priceEstimate.median.toLocaleString('fr-FR') })}
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
                placeholder={t('request.budgetCustom')}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text style={s.label}>{t('request.media')} ({media.length}/5)</Text>
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
                      <TouchableOpacity style={s.mediaRemove} onPress={() => removeMedia(i)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t('common.delete', { defaultValue: 'Supprimer' })}>
                        <X size={12} color={colors.surface} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {media.length < 5 && (
                    <TouchableOpacity style={s.mediaAddBtn} onPress={addMedia}>
                      <Plus size={32} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            </View>
            <TouchableOpacity
              style={[s.btn, (!description || !areRequiredAttributesFilled() || (category === 'autre' && description.trim().length < 10)) && s.btnDisabled]}
              disabled={!description || !areRequiredAttributesFilled() || (category === 'autre' && description.trim().length < 10)}
              onPress={() => setStep(3)}
            >
              <Text style={s.btnText}>{t('request.continueBtn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 20 }}>
            <Text style={s.stepTitle}>{t('request.location')}</Text>
            <Text style={s.stepSub}>{t('request.locationSub')}</Text>

            <TouchableOpacity style={s.locBtn} onPress={pickLocation} disabled={locating}>
              {locating ? <ActivityIndicator color={colors.warning} /> : <MapPin size={22} color={colors.warning} />}
              <View style={{ flex: 1 }}>
                <Text style={s.locTitle}>{coords ? t('request.positionOk') : t('request.useGps')}</Text>
                {autoAddress ? <Text style={s.locSub}>{autoAddress}</Text> : coords ? <Text style={s.locSub}>{coords[1].toFixed(4)}, {coords[0].toFixed(4)}</Text> : null}
              </View>
            </TouchableOpacity>

            <View>
              <Text style={s.label}>{t('request.landmark')} *</Text>
              <TextInput
                style={s.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder={t('request.landmarkPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{t('request.landmarkHint')}</Text>
            </View>

            {/* Récap */}
            <View style={s.recap}>
              <RecapRow label={t('request.recapService')} value={cats.find(c => c.id === category)?.label || category} />
              {subcategory && (() => {
                const selectedCat = cats.find(c => c.id === category)
                const sub = selectedCat?.subCategories?.find(s => s.slug === subcategory)
                return sub ? <RecapRow label={t('request.subcategory')} value={getSubCategoryLabel(sub, i18n.language)} /> : null
              })()}
              <RecapRow label={t('request.recapDescription')} value={description.length > 60 ? description.slice(0, 60) + '…' : description} />
              {budget ? <RecapRow label={t('request.recapBudget')} value={`${budget} FCFA`} /> : null}
              {media.length ? <RecapRow label={t('request.recapMedia')} value={t('request.recapMediaValue', { count: media.length })} /> : null}
              {voiceNote ? <RecapRow label={t('request.recapVoice')} value={t('request.recapVoiceValue', { sec: Math.round(voiceNote.durationMs / 1000) })} /> : null}
            </View>

            {err && <Text style={s.errText}>{err}</Text>}

            <TouchableOpacity
              style={[s.btn, (!coords || loading || uploadingMedia) && s.btnDisabled]}
              disabled={!coords || loading || uploadingMedia}
              onPress={submit}
            >
              {loading || uploadingMedia ? <ActivityIndicator color={colors.surface} /> : <Text style={s.btnText}>{t('request.publish')}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      )}
      </KeyboardAvoidingView>
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

function DynamicAttributes({
  category,
  values,
  onChange,
  lang,
}: {
  category?: { id: string; requiredAttributes?: Attribute[]; optionalAttributes?: Attribute[] }
  values: Record<string, string | number | boolean>
  onChange: (v: Record<string, string | number | boolean>) => void
  lang: string
}) {
  const { t } = useTranslation()
  const all = [
    ...(category?.requiredAttributes || []),
    ...(category?.optionalAttributes || []),
  ]
  if (all.length === 0) return null

  const setValue = (slug: string, value: string | number | boolean) => {
    onChange({ ...values, [slug]: value })
  }

  return (
    <View style={{ gap: 16 }}>
      <Text style={s.label}>{t('request.details')}</Text>
      {all.map(attr => {
        const label = getAttributeLabel(attr, lang)
        const value = values[attr.slug]
        return (
          <View key={attr.slug}>
            <Text style={s.attrLabel}>{label}{attr.required ? ' *' : ''}</Text>
            {attr.type === 'select' ? (
              <View style={s.attrOptions}>
                {(attr.options || []).map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[s.attrOption, value === opt && s.attrOptionActive]}
                    onPress={() => setValue(attr.slug, opt)}
                  >
                    <Text style={[s.attrOptionText, value === opt && s.attrOptionTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : attr.type === 'boolean' ? (
              <TouchableOpacity
                style={[s.attrToggle, value === true && s.attrToggleActive]}
                onPress={() => setValue(attr.slug, value !== true)}
              >
                <Text style={[s.attrToggleText, value === true && s.attrToggleTextActive]}>
                  {value === true ? t('common.yes') : t('common.no')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={s.attrInput}
                value={value !== undefined ? String(value) : ''}
                onChangeText={text => setValue(attr.slug, attr.type === 'number' ? Number(text.replace(/\s/g, '')) : text)}
                keyboardType={attr.type === 'number' ? 'numeric' : 'default'}
                placeholder={label}
                placeholderTextColor={colors.textMuted}
              />
            )}
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 14 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, ...shadows.sm },
  backIcon: { color: colors.text },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  cancelText: { fontSize: 14, color: colors.textSecondary, fontWeight: typography.weight.medium as any },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: spacing.sm },
  stepperItem: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  stepperDot: { width: 12, height: 12, borderRadius: 6 },
  stepperDotActive: { backgroundColor: colors.navy },
  stepperDotInactive: { backgroundColor: colors.border },
  stepperLine: { flex: 1, height: 2, marginHorizontal: spacing.xs },
  stepperLineActive: { backgroundColor: colors.navy },
  stepperLineInactive: { backgroundColor: colors.border },
  stepperLabels: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingTop: 6, paddingBottom: spacing.lg },
  stepperLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: colors.textMuted, fontWeight: typography.weight.medium as any },
  stepperLabelActive: { color: colors.text, fontWeight: typography.weight.bold as any },
  body: { padding: spacing.xl, paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 6, letterSpacing: -0.3 },
  stepSub: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.xxl },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  catCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xxl, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, position: 'relative', gap: 6, ...shadows.sm },
  catCardActive: { borderColor: colors.navy, borderWidth: 2, ...shadows.md },
  checkmark: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  checkmarkText: { color: colors.surface },
  catMonogram: { width: 52, height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  catMonogramText: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  catLabel: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text },
  catLabelActive: { color: colors.navy },
  catSubLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, paddingBottom: spacing.xxl, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.text, marginBottom: spacing.sm },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  textarea: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, minHeight: 110, textAlignVertical: 'top', backgroundColor: colors.surface },
  budgetChip: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  budgetChipActive: { backgroundColor: colors.warningLight, borderColor: colors.warning },
  budgetChipText: { fontSize: 13, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  budgetChipTextActive: { color: colors.warning },
  btn: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: 17, minHeight: 54, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: colors.surface, fontSize: 15, fontWeight: typography.weight.bold as any, letterSpacing: 0.2 },
  locBtn: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: colors.border, ...shadows.sm },
  locIcon: { color: colors.warning },
  locTitle: { fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text },
  locSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  recap: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  recapLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.medium as any, flex: 0.4 },
  recapValue: { fontSize: 13, color: colors.text, fontWeight: typography.weight.semibold as any, flex: 0.6, textAlign: 'right' },
  errText: { color: colors.danger, fontSize: 13, textAlign: 'center', fontWeight: typography.weight.semibold as any },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: spacing.lg },
  successCheck: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, ...shadows.md },
  successCheckText: { color: colors.surface },
  successTitle: { fontSize: 22, fontWeight: typography.weight.bold as any, color: colors.text },
  successSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  link: { color: colors.info, fontWeight: typography.weight.semibold as any, fontSize: 14, marginTop: spacing.xs },
  mediaThumbBox: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden', position: 'relative' },
  mediaThumb: { width: 72, height: 72, borderRadius: radius.sm },
  mediaFileBox: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  mediaFileType: { fontSize: 11, color: colors.text, fontWeight: typography.weight.bold as any, textTransform: 'uppercase' },
  mediaRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: colors.surface },
  mediaAddBtn: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  mediaAddText: { color: colors.textSecondary },
  priceHint: { backgroundColor: colors.successLight, borderRadius: radius.sm, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  priceHintText: { fontSize: 12, color: colors.primaryDark, lineHeight: 18 },
  attrLabel: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.text, marginBottom: spacing.sm },
  attrInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  attrOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attrOption: { paddingVertical: spacing.sm, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  attrOptionActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  attrOptionText: { fontSize: 13, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  attrOptionTextActive: { color: colors.success },
  attrToggle: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent', alignSelf: 'flex-start' },
  attrToggleActive: { backgroundColor: colors.successLight, borderColor: colors.success },
  attrToggleText: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  attrToggleTextActive: { color: colors.success },
  subcatDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, backgroundColor: colors.surface },
  subcatText: { fontSize: 15, color: colors.text },
  subcatList: { marginTop: 8, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  subcatItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  subcatItemActive: { backgroundColor: colors.successLight },
  subcatItemText: { fontSize: 14, color: colors.textSecondary },
  subcatItemTextActive: { color: colors.success, fontWeight: typography.weight.bold as any },
  descHint: { fontSize: 12, color: colors.warning, marginTop: 4 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight || '#E8F0FE',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  aiBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
})

export default withScreenBoundary(CreateRequest, 'CreateRequest')
