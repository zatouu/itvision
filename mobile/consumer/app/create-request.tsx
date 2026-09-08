import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Image } from 'expo-image'
import * as Location from 'expo-location'
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiPostQueued, apiPost, apiUpload, apiGetRetry } from '../src/api'
import { cacheClear } from '../src/storage'
import { humanErrorMessage } from '../src/errorMessages'
import { pickMedia, PickedMedia } from '../src/media'
import { reverseGeocode } from '../src/geocode'
import VoiceRecorder, { VoiceRecording } from '../src/components/VoiceRecorder'
import VoicePlayer from '../src/components/VoicePlayer'
import { loadCategories, getCategoryLabel, getSubCategoryLabel, getAttributeLabel, SubCategory, Attribute } from '../src/categories'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, X, Check, MapPin, ChevronDown, Sparkles, Zap, Search, Camera, Send, Navigation, Receipt, Info, Image as ImageIcon } from 'lucide-react-native'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import AiClarifyModal, { ClarifyQuestion, ClarifyAnswer } from '../src/components/AiClarifyModal'
import { getCategoryIcon } from '../src/categoryIcons'
import SchedulePicker, { formatSlot } from '../src/components/SchedulePicker'
import { hapticSelect, hapticSuccess, hapticLight } from '../src/haptics'
import { colors, radius, spacing, typography, shadows, cat } from '../src/design'

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
const MAX_MEDIA = 5
const DAKAR_REGION = { latitude: 14.7167, longitude: -17.4677, latitudeDelta: 0.08, longitudeDelta: 0.08 }

function isImagePreview(media: PickedMedia): boolean {
  return media.type === 'image' && typeof media.uri === 'string' && media.uri.trim().length > 0
}

function mediaLabel(media: PickedMedia): string {
  if (media.type === 'video') return 'Vidéo'
  return 'Fichier'
}

type CatEntry = { id: string; label: string; abbr: string; color: string; requiredAttributes?: Attribute[]; optionalAttributes?: Attribute[]; subCategories?: SubCategory[] }

function CreateRequest() {
  const params = useLocalSearchParams<{ category?: string; subcategory?: string; urgent?: string }>()
  const isUrgent = params.urgent === 'true' || params.urgent === '1'
  const [step, setStep] = useState(isUrgent && params.category ? 2 : 1)
  const [category, setCategory] = useState(params.category || '')
  const [catSearch, setCatSearch] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [createdId, setCreatedId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [media, setMedia] = useState<PickedMedia[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [landmark, setLandmark] = useState('')
  const [autoAddress, setAutoAddress] = useState('')
  const [when, setWhen] = useState<'asap' | 'today' | 'later'>('asap')
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null)
  const [voiceNote, setVoiceNote] = useState<VoiceRecording | null>(null)
  const [cats, setCats] = useState<CatEntry[]>(FALLBACK_CATS)
  const [subcategory, setSubcategory] = useState(params.subcategory || '')
  const [showSubcats, setShowSubcats] = useState(false)
  const [priceEstimate, setPriceEstimate] = useState<{ median: number; low: number; high: number } | null>(null)
  const [attributes, setAttributes] = useState<Record<string, string | number | boolean>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiApplying, setAiApplying] = useState(false)
  const [aiQuestions, setAiQuestions] = useState<ClarifyQuestion[]>([])
  const [aiModalVisible, setAiModalVisible] = useState(false)
  const { t, i18n } = useTranslation()
  const mapRef = useRef<MapView | null>(null)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const accent = isUrgent ? colors.danger : colors.primary
  const accentInk = isUrgent ? colors.dangerInk : colors.brandInk
  const accentSoft = isUrgent ? colors.dangerSoft : colors.brandSoft

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
    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current) }
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

  const applyGeocode = (lng: number, lat: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(async () => {
      const geo = await reverseGeocode(lat, lng)
      if (geo) {
        const parts = [geo.neighbourhood, geo.suburb, geo.city].filter(Boolean)
        setAutoAddress(parts.join(', ') || geo.display.split(',').slice(0, 3).join(','))
      }
    }, 900)
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
      mapRef.current?.animateToRegion({ latitude: c[1], longitude: c[0], latitudeDelta: 0.015, longitudeDelta: 0.015 }, 400)
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

  const onRegionChange = (r: { latitude: number; longitude: number }) => {
    setCoords([r.longitude, r.latitude])
    applyGeocode(r.longitude, r.latitude)
  }

  const addMedia = async () => {
    try {
      const picked = await pickMedia({ maxFiles: MAX_MEDIA })
      if (picked.length) setMedia(prev => [...prev, ...picked].slice(0, MAX_MEDIA))
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
        urgent: isUrgent,
        scheduledFor: !isUrgent && scheduledFor ? scheduledFor.toISOString() : undefined,
      }, t('request.queuedOffline'))
      const newId = (res as any)?.item?._id || (res as any)?.item?.id || ''
      setCreatedId(newId)
      await cacheClear('home-requests')
      await cacheClear('my-requests')
      hapticSuccess()
      setDone(true)
    } catch (e: any) { setErr(humanErrorMessage(e)); setUploadingMedia(false) }
    setLoading(false)
  }

  const selectedCat = cats.find(c => c.id === category)
  const filteredCats = catSearch.trim()
    ? cats.filter(c => c.label.toLowerCase().includes(catSearch.trim().toLowerCase()) || c.id.includes(catSearch.trim().toLowerCase()))
    : cats

  // ── Success (published) ─────────────────────────────────────────────
  if (done) return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.successScroll} showsVerticalScrollIndicator={false}>
        <View style={s.checkWrap}>
          <View style={s.haloOuter} />
          <View style={s.haloInner} />
          <View style={s.checkHero}><Check size={44} color={colors.surface} strokeWidth={3} /></View>
        </View>
        <Text style={s.successTitle}>{t('request.publishedTitle')}</Text>
        <Text style={s.successSub}>{t('request.publishedSubNew')}</Text>
        {createdId ? (
          <View style={s.refChip}>
            <Receipt size={14} color={colors.textMuted} />
            <Text style={s.refLabel}>{t('request.ref')}</Text>
            <Text style={s.refValue}>{createdId.slice(-6).toUpperCase()}</Text>
          </View>
        ) : null}
        <View style={s.nextCard}>
          <Text style={s.nextTitle}>{t('request.nextSteps')}</Text>
          {[
            { title: t('request.nextNotified'), sub: t('request.nextNotifiedSub'), state: 'done' },
            { title: t('request.nextOffers'), sub: t('request.nextOffersSub'), state: 'active' },
            { title: t('request.nextChoose'), sub: t('request.nextChooseSub'), state: 'todo' },
          ].map((st, i, arr) => (
            <View key={i} style={s.nextRow}>
              <View style={s.nextRail}>
                <View style={[s.nextDot, st.state === 'done' && s.nextDotDone, st.state === 'active' && s.nextDotActive]}>
                  {st.state === 'done' && <Check size={11} color="#fff" strokeWidth={3} />}
                  {st.state === 'active' && <View style={s.nextDotCore} />}
                </View>
                {i < arr.length - 1 && <View style={s.nextLine} />}
              </View>
              <View style={s.nextBody}>
                <Text style={s.nextLabel}>{st.title}</Text>
                <Text style={s.nextSub}>{st.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <TouchableOpacity
          style={s.btn}
          onPress={() => createdId ? router.push(`/offers/${createdId}` as any) : router.replace('/my-requests')}
          activeOpacity={0.88}
        >
          <Text style={s.btnText}>{createdId ? t('request.viewOffers') : t('request.viewRequests')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnGhost} onPress={() => router.replace('/')} activeOpacity={0.85}>
          <Text style={s.btnGhostText}>{t('request.backHome')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  const step2Valid = !!description && areRequiredAttributesFilled() && !(category === 'autre' && description.trim().length < 10)

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {/* Bandeau urgent pleine largeur */}
      {isUrgent && (
        <View style={s.urgentStrip}>
          <Zap size={14} color="#fff" fill="#fff" />
          <Text style={s.urgentStripText}>{t('request.urgentBannerFull')}</Text>
          <View style={s.urgentStripBadge}><Text style={s.urgentStripBadgeText}>{t('request.urgentActive')}</Text></View>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s2 => s2 - 1) : router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t('request.createTitle')}</Text>
          <Text style={s.headerSub}>{t('request.stepOf', { n: step, total: 3 })}</Text>
        </View>
        {isUrgent ? (
          <View style={s.urgentBadge}><Zap size={18} color={colors.danger} fill={colors.danger} /></View>
        ) : (
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stepper numerote */}
      <View style={s.stepperRow}>
        {[t('request.stepCategory'), t('request.stepDetails'), t('request.stepLocation')].map((label, i) => {
          const doneStep = i < step - 1
          const active = i === step - 1
          return (
            <React.Fragment key={i}>
              <View style={s.stepperNode}>
                <View style={[s.stepDot, (doneStep || active) && { backgroundColor: accent }, active && { borderWidth: 4, borderColor: isUrgent ? colors.dangerSoft : colors.brandSoft }]}>
                  {doneStep ? <Check size={13} color="#fff" strokeWidth={3} /> : <Text style={[s.stepNum, (doneStep || active) && { color: '#fff' }]}>{i + 1}</Text>}
                </View>
                {active && <Text style={s.stepLabelActive}>{label}</Text>}
              </View>
              {i < 2 && <View style={[s.stepLine, doneStep && { backgroundColor: accent }]} />}
            </React.Fragment>
          )
        })}
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* ── ETAPE 1 : categorie ─────────────────────────────── */}
      {step === 1 && (
        <View style={{ gap: 0 }}>
          <Text style={s.stepTitle}>{t('request.needService')}</Text>
          <Text style={s.stepSub}>{t('request.needServiceSub')}</Text>

          <View style={s.searchBox}>
            <Search size={17} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder={t('request.searchService')}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={s.catGrid}>
            {filteredCats.map(c => {
              const IconC = getCategoryIcon(c.id)
              const selected = category === c.id
              return (
                <TouchableOpacity key={c.id} style={s.tile} onPress={() => { hapticSelect(); setCategory(c.id) }} activeOpacity={0.8}>
                  <View style={[s.tileRing, selected && { borderColor: c.color }]}>
                    <View style={[s.tileIcon, { backgroundColor: c.color }]}>
                      <IconC size={26} color="#fff" />
                    </View>
                    {selected && (
                      <View style={s.tileCheck}><Check size={12} color={c.color} strokeWidth={3} /></View>
                    )}
                  </View>
                  <Text style={s.tileLabel} numberOfLines={2}>{c.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          {filteredCats.length === 0 && <Text style={s.noCat}>{t('request.noCatFound')}</Text>}
        </View>
      )}

      {/* ── ETAPE 2 : details ─────────────────────────────── */}
      {step === 2 && (
        <View style={{ gap: 20 }}>
          <View>
            <Text style={s.stepTitle}>{t('request.describeNeed')}</Text>
            <Text style={s.stepSub}>{t('request.describeNeedSub')}</Text>
          </View>

          {/* Chip categorie selectionnee */}
          {selectedCat && (() => {
            const cc = cat[selectedCat.id]
            const IconC = getCategoryIcon(selectedCat.id)
            return (
              <View style={[s.catChip, { backgroundColor: cc?.soft || colors.bgDeep }]}>
                <View style={[s.catChipIcon, { backgroundColor: selectedCat.color }]}><IconC size={17} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.catChipLabel}>{selectedCat.label}</Text>
                </View>
                <TouchableOpacity onPress={() => setStep(1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.catChipChange}>{t('request.change')}</Text>
                </TouchableOpacity>
              </View>
            )
          })()}

          {/* Sous-catégorie (optionnelle) */}
          {(() => {
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
                      ? getSubCategoryLabel(subs.find(s2 => s2.slug === subcategory)!, i18n.language)
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
            <Text style={s.fieldHint}>{t('request.descHint')}</Text>
            {/* AI guided clarification */}
            <TouchableOpacity
              style={[s.aiBtn, aiLoading && { opacity: 0.6 }]}
              onPress={async () => {
                if (aiLoading) return
                if (description.trim().length < 10) {
                  setErr(t('request.aiNeedDescription'))
                  return
                }
                setErr(null)
                setAiLoading(true)
                try {
                  const res = await apiPost('/api/ai/assist', {
                    type: 'clarify_request',
                    category,
                    description,
                    attributes,
                  })
                  if (Array.isArray(res.questions) && res.questions.length > 0) {
                    setAiQuestions(res.questions)
                    setAiModalVisible(true)
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
                {aiLoading ? t('request.aiLoading') : t('request.aiClarify')}
              </Text>
            </TouchableOpacity>
            <AiClarifyModal
              visible={aiModalVisible}
              questions={aiQuestions}
              applying={aiApplying}
              onClose={() => setAiModalVisible(false)}
              onApply={async (answers: ClarifyAnswer[]) => {
                setAiApplying(true)
                const composeFallback = () => {
                  const lines = answers.map(a => `- ${a.question} ${a.answer}`)
                  return `${description.trim()}\n\nPrécisions :\n${lines.join('\n')}`
                }
                try {
                  const res = await apiPost('/api/ai/assist', {
                    type: 'enhance_request',
                    category,
                    description,
                    attributes,
                    answers,
                  })
                  setDescription(res.text?.trim() ? res.text.trim() : composeFallback())
                } catch {
                  setDescription(composeFallback())
                }
                setAiApplying(false)
                setAiModalVisible(false)
                hapticSuccess()
              }}
            />
          </View>
          <DynamicAttributes
            category={selectedCat}
            values={attributes}
            onChange={setAttributes}
            lang={i18n.language}
          />

          {/* Photos */}
          <View>
            <View style={s.fieldLabelRow}>
              <Text style={s.labelInline}>{t('request.photosLabel')} <Text style={s.labelCount}>({media.length}/{MAX_MEDIA})</Text></Text>
              <Text style={s.labelOptional}>{t('request.optional')}</Text>
            </View>
            <View style={s.mediaRow}>
              {media.map((m, i) => (
                <View key={i} style={s.mediaSlot}>
                  {isImagePreview(m)
                    ? <Image source={{ uri: m.uri }} style={s.mediaThumb} contentFit="cover" />
                    : (
                        <View style={s.mediaFileBox}>
                          <ImageIcon size={20} color={colors.textDim} />
                          <Text style={s.mediaFileType}>{mediaLabel(m)}</Text>
                        </View>
                      )}
                  <TouchableOpacity style={s.mediaRemove} onPress={() => removeMedia(i)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t('common.delete', { defaultValue: 'Supprimer' })}>
                    <X size={11} color={colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}
              {media.length < MAX_MEDIA && (
                <TouchableOpacity style={s.mediaAddBtn} onPress={addMedia} activeOpacity={0.7}>
                  <Camera size={22} color={colors.textDim} />
                  <Text style={s.mediaAddText}>{t('request.add')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Message vocal */}
          <View>
            <Text style={s.label}>{t('request.voiceNoteLabel')}</Text>
            {voiceNote ? (
              <VoicePlayer uri={voiceNote.uri} durationMs={voiceNote.durationMs} onRemove={() => setVoiceNote(null)} />
            ) : (
              <VoiceRecorder onRecorded={setVoiceNote} maxDurationSec={60} />
            )}
          </View>

          {/* Budget */}
          <View>
            <Text style={s.label}>{t('request.budgetLabel')}</Text>
            <View style={s.chipRow}>
              {BUDGETS.map(b => (
                <TouchableOpacity key={b} style={[s.budgetChip, budget === b && s.budgetChipActive]} onPress={() => { hapticLight(); setBudget(b) }} activeOpacity={0.75}>
                  <Text style={[s.budgetChipText, budget === b && s.budgetChipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.input}
              value={budget}
              onChangeText={setBudget}
              placeholder={t('request.budgetCustom')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            {priceEstimate && (
              <View style={s.priceHint}>
                <Text style={s.priceHintText}>
                  {t('request.priceHint', { low: priceEstimate.low.toLocaleString('fr-FR'), high: priceEstimate.high.toLocaleString('fr-FR'), median: priceEstimate.median.toLocaleString('fr-FR') })}
                </Text>
              </View>
            )}
            <View style={s.warnCallout}>
              <Info size={14} color={colors.warnInk} />
              <Text style={s.warnCalloutText}>{t('request.budgetDisclaimer')}</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── ETAPE 3 : lieu ─────────────────────────────── */}
      {step === 3 && (
        <View style={{ gap: 18 }}>
          <View>
            <Text style={s.stepTitle}>{t('request.whereIntervene')}</Text>
            <Text style={s.stepSub}>{t('request.whereInterveneSub')}</Text>
          </View>

          {/* Carte */}
          <View style={s.mapBox}>
            {Platform.OS === 'web' ? (
              <View style={s.mapPlaceholder}>
                <MapPin size={28} color={colors.textDim} />
                <Text style={s.mapPlaceholderText}>{autoAddress || t('request.useGps')}</Text>
              </View>
            ) : (
              <MapView
                ref={mapRef}
                provider={PROVIDER_DEFAULT}
                style={StyleSheet.absoluteFill}
                initialRegion={coords
                  ? { latitude: coords[1], longitude: coords[0], latitudeDelta: 0.015, longitudeDelta: 0.015 }
                  : DAKAR_REGION}
                onRegionChangeComplete={onRegionChange}
                pitchEnabled={false}
                rotateEnabled={false}
              />
            )}
            {/* Pin central fixe */}
            <View style={s.mapPinWrap} pointerEvents="none">
              <View style={[s.mapPin, { backgroundColor: accent }]}>
                <MapPin size={15} color="#fff" />
              </View>
            </View>
            <TouchableOpacity style={s.mapLocateBtn} onPress={pickLocation} disabled={locating} activeOpacity={0.85}>
              {locating ? <ActivityIndicator size="small" color={colors.primary} /> : <Navigation size={13} color={colors.primary} />}
              <Text style={s.mapLocateText}>{t('request.myPosition')}</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={s.label}>{t('request.address')}</Text>
            <View style={s.inputIconWrap}>
              <MapPin size={17} color={colors.textMuted} style={{ marginLeft: 14 }} />
              <TextInput
                style={s.inputIcon}
                value={autoAddress}
                onChangeText={setAutoAddress}
                placeholder={t('request.addressPlaceholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View>
            <Text style={s.label}>{t('request.landmark')} *</Text>
            <TextInput
              style={s.input}
              value={landmark}
              onChangeText={setLandmark}
              placeholder={t('request.landmarkPlaceholder')}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={s.fieldHint}>{t('request.landmarkHint')}</Text>
          </View>

          {/* Quand ? — réservation de créneau (masqué en mode urgent) */}
          {!isUrgent && (
            <View>
              <Text style={s.label}>{t('schedule.whenLabel')}</Text>
              <View style={s.chipRow}>
                {(['asap', 'today', 'later'] as const).map(mode => {
                  const labels = { asap: t('schedule.asap'), today: t('schedule.today'), later: t('schedule.later') }
                  const sel = when === mode
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[s.budgetChip, sel && s.budgetChipActive]}
                      onPress={() => { hapticLight(); setWhen(mode); setScheduledFor(null) }}
                      activeOpacity={0.75}
                    >
                      <Text style={[s.budgetChipText, sel && s.budgetChipTextActive]}>{labels[mode]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
              {when === 'today' && (
                <SchedulePicker todayOnly value={scheduledFor} onChange={setScheduledFor} />
              )}
              {when === 'later' && (
                <SchedulePicker value={scheduledFor} onChange={setScheduledFor} />
              )}
              {when !== 'asap' && (
                <Text style={s.fieldHint}>{t('schedule.hint')}</Text>
              )}
            </View>
          )}

          {/* Récap */}
          <View style={s.recap}>
            <Text style={s.nextTitle}>{t('request.recapTitle')}</Text>
            <RecapRow label={t('request.recapService')} value={selectedCat?.label || category} />
            {subcategory && (() => {
              const sub = selectedCat?.subCategories?.find(s2 => s2.slug === subcategory)
              return sub ? <RecapRow label={t('request.subcategory')} value={getSubCategoryLabel(sub, i18n.language)} /> : null
            })()}
            <RecapRow label={t('request.recapDescription')} value={description.length > 60 ? description.slice(0, 60) + '…' : description} />
            {budget ? <RecapRow label={t('request.recapBudget')} value={`${budget} FCFA`} /> : null}
            {media.length ? <RecapRow label={t('request.recapMedia')} value={t('request.recapMediaValue', { count: media.length })} /> : null}
            {voiceNote ? <RecapRow label={t('request.recapVoice')} value={t('request.recapVoiceValue', { sec: Math.round(voiceNote.durationMs / 1000) })} /> : null}
            <RecapRow
              label={t('schedule.whenLabel')}
              value={isUrgent ? t('schedule.asap') : scheduledFor ? formatSlot(scheduledFor, i18n.language) : t('schedule.asap')}
            />
          </View>

          {err && <Text style={s.errText}>{err}</Text>}
        </View>
      )}
      </ScrollView>

      {/* Footer sticky */}
      <View style={s.footer}>
        {step === 3 && (
          <View style={s.footerMeta}>
            <Text style={s.footerMetaText}>
              {selectedCat?.label || ''}{budget ? ` · ${budget} FCFA` : ''}{scheduledFor && !isUrgent ? ` · ${formatSlot(scheduledFor, i18n.language)}` : ''}
            </Text>
            {isUrgent && (
              <View style={s.urgentPill}>
                <View style={s.urgentPillDot} />
                <Text style={s.urgentPillText}>URGENT</Text>
              </View>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[s.btn, { backgroundColor: accent },
            ((step === 1 && !category) || (step === 2 && !step2Valid) || (step === 3 && (!coords || !landmark.trim() || (when !== 'asap' && !scheduledFor) || loading || uploadingMedia))) && s.btnDisabled]}
          disabled={(step === 1 && !category) || (step === 2 && !step2Valid) || (step === 3 && (!coords || !landmark.trim() || (when !== 'asap' && !scheduledFor) || loading || uploadingMedia))}
          onPress={() => step === 1 ? setStep(2) : step === 2 ? setStep(3) : submit()}
          activeOpacity={0.88}
        >
          {step === 3 && (loading || uploadingMedia) ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.btnText}>
                {step === 1
                  ? `${t('request.continue')} · ${selectedCat?.label || ''}`
                  : step === 2
                    ? t('request.continueAddress')
                    : isUrgent ? t('request.publishUrgent') : t('request.publishAction')}
              </Text>
              {step < 3 && <ArrowLeft size={17} color="#fff" style={{ transform: [{ rotate: '180deg' }] }} />}
              {step === 3 && (isUrgent ? <Zap size={16} color="#fff" fill="#fff" /> : <Send size={15} color="#fff" />)}
            </View>
          )}
        </TouchableOpacity>
      </View>
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
  // Bandeau urgent
  urgentStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.danger, paddingHorizontal: 16, paddingVertical: 9 },
  urgentStripText: { flex: 1, color: '#fff', fontSize: 12, fontWeight: typography.weight.bold as any },
  urgentStripBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  urgentStripBadgeText: { color: '#fff', fontSize: 10, fontWeight: typography.weight.extrabold as any, letterSpacing: 0.4 },
  urgentBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 14, paddingBottom: 6, gap: spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  headerTitle: { fontSize: 17, fontWeight: typography.weight.extrabold as any, color: colors.text },
  headerSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  cancelText: { fontSize: 13.5, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  // Stepper numerote
  stepperRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 6, paddingBottom: spacing.lg },
  stepperNode: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.textMuted },
  stepLabelActive: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.text },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.bgDeep, borderRadius: 1, marginHorizontal: 6 },
  body: { padding: spacing.xl, paddingTop: 4, paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.4, lineHeight: 28 },
  stepSub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: 18, lineHeight: 19 },
  // Step 1 — recherche + grille
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text, paddingVertical: 0 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 20 },
  tile: { width: '30%', flexGrow: 1, alignItems: 'center', gap: 8 },
  tileRing: { borderRadius: 20, borderWidth: 2.5, borderColor: 'transparent', padding: 3, position: 'relative' },
  tileIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tileCheck: { position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  tileLabel: { fontSize: 12.5, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },
  noCat: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 20 },
  // Step 2 — chip categorie
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14 },
  catChipIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catChipLabel: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.ink },
  catChipChange: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.primary },
  // Champs
  label: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text, marginBottom: 8 },
  labelInline: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  labelCount: { color: colors.textDim, fontWeight: typography.weight.medium as any },
  labelOptional: { fontSize: 11.5, color: colors.textMuted, fontWeight: typography.weight.medium as any },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  fieldHint: { fontSize: 11.5, color: colors.textMuted, marginTop: 6, lineHeight: 16 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  inputIcon: { flex: 1, padding: 14, paddingLeft: 10, fontSize: 15, color: colors.text },
  textarea: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, minHeight: 110, textAlignVertical: 'top', backgroundColor: colors.surface },
  // Photos
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaSlot: { width: 84, height: 84, borderRadius: 14, overflow: 'visible', position: 'relative' },
  mediaThumb: { width: 84, height: 84, borderRadius: 14 },
  mediaFileBox: { width: 84, height: 84, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mediaFileType: { fontSize: 10, color: colors.textDim, fontWeight: typography.weight.bold as any, textTransform: 'uppercase' },
  mediaRemove: { position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  mediaAddBtn: { width: 84, height: 84, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  mediaAddText: { fontSize: 10, fontWeight: typography.weight.semibold as any, color: colors.textDim },
  // Budget
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  budgetChip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  budgetChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  budgetChipText: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  budgetChipTextActive: { color: '#fff' },
  priceHint: { backgroundColor: colors.successSoft, borderRadius: radius.md, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  priceHintText: { fontSize: 12, color: colors.brandInk, lineHeight: 18 },
  warnCallout: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.warnSoft, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10 },
  warnCalloutText: { flex: 1, fontSize: 11.5, color: colors.warnInk, lineHeight: 16.5 },
  // Step 3 — carte
  mapBox: { height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.bgDeep, ...shadows.md },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  mapPlaceholderText: { fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
  mapPinWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', marginTop: -16 },
  mapPin: { width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.md },
  mapLocateBtn: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, ...shadows.sm },
  mapLocateText: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.ink },
  // Récap
  recap: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: spacing.md, borderWidth: 1, borderColor: colors.borderSoft },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  recapLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.medium as any, flex: 0.4 },
  recapValue: { fontSize: 13, color: colors.text, fontWeight: typography.weight.semibold as any, flex: 0.6, textAlign: 'right' },
  errText: { color: colors.danger, fontSize: 13, textAlign: 'center', fontWeight: typography.weight.semibold as any },
  // Footer
  footer: { paddingHorizontal: spacing.xl, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  footerMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  footerMetaText: { flex: 1, fontSize: 10.5, color: colors.textMuted, fontWeight: typography.weight.bold as any, letterSpacing: 0.4, textTransform: 'uppercase' },
  urgentPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.dangerSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  urgentPillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  urgentPillText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.dangerInk, letterSpacing: 0.2 },
  btn: { backgroundColor: colors.primary, borderRadius: 16, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, ...shadows.md },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: colors.surface, fontSize: 15.5, fontWeight: typography.weight.bold as any, letterSpacing: 0.2 },
  btnGhost: { backgroundColor: colors.surface, borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginTop: 10 },
  btnGhostText: { color: colors.ink, fontSize: 14, fontWeight: typography.weight.bold as any },
  // Succes (publiee)
  successScroll: { padding: 24, paddingTop: 48, alignItems: 'center' },
  checkWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  haloOuter: { position: 'absolute', width: 148, height: 148, borderRadius: 74, backgroundColor: colors.primary, opacity: 0.08 },
  haloInner: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: colors.primary, opacity: 0.15 },
  checkHero: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.hero },
  successTitle: { fontSize: 24, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.5, textAlign: 'center', lineHeight: 30 },
  successSub: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', lineHeight: 21, maxWidth: 300, marginTop: 10 },
  refChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 999, borderWidth: 1, borderColor: colors.border },
  refLabel: { fontSize: 12, color: colors.textMuted, fontWeight: typography.weight.semibold as any },
  refValue: { fontSize: 12.5, color: colors.ink, fontWeight: typography.weight.extrabold as any, letterSpacing: 0.5 },
  nextCard: { width: '100%', marginTop: 28, backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.borderSoft },
  nextTitle: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  nextRow: { flexDirection: 'row', gap: 12 },
  nextRail: { alignItems: 'center', width: 22 },
  nextDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  nextDotDone: { backgroundColor: colors.primary },
  nextDotActive: { backgroundColor: '#fff', borderWidth: 2.5, borderColor: colors.primary },
  nextDotCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  nextLine: { flex: 1, width: 2, backgroundColor: colors.bgDeep, marginVertical: 2 },
  nextBody: { paddingBottom: 18 },
  nextLabel: { fontSize: 13.5, fontWeight: typography.weight.bold as any, color: colors.ink },
  nextSub: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  // Attributs dynamiques
  attrLabel: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text, marginBottom: 8 },
  attrInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, backgroundColor: colors.surface },
  attrOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  attrOption: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  attrOptionActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  attrOptionText: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  attrOptionTextActive: { color: '#fff' },
  attrToggle: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  attrToggleActive: { backgroundColor: colors.brandSoft, borderColor: colors.primary },
  attrToggleText: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  attrToggleTextActive: { color: colors.brandInk },
  subcatDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: 14, backgroundColor: colors.surface },
  subcatText: { fontSize: 15, color: colors.text },
  subcatList: { marginTop: 8, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSoft, overflow: 'hidden' },
  subcatItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  subcatItemActive: { backgroundColor: colors.brandSoft },
  subcatItemText: { fontSize: 14, color: colors.textSecondary },
  subcatItemTextActive: { color: colors.brandInk, fontWeight: typography.weight.bold as any },
  descHint: { fontSize: 12, color: colors.warning, marginTop: 4 },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  aiBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
})

export default withScreenBoundary(CreateRequest, 'CreateRequest')
