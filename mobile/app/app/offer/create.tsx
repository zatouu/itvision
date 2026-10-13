import { createThemedStyles } from '../../src/theme'
import { useLocalSearchParams, router } from 'expo-router'
import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import Toggle from '../../src/components/Toggle'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import Button from '../../src/components/Button'
import { getCategoryMeta, spacing, radius, shadows, typography } from '../../src/design'
import { Minus, Plus, Sparkles, CalendarClock, Check, X } from 'lucide-react-native'
import { apiGet, apiPost, apiPostQueued } from '../../src/api'
import SchedulePicker, { formatSlot } from '../../src/components/SchedulePicker'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { hapticSuccess, hapticError } from '../../src/haptics'
import { getProviderName } from '../../src/user-profile'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'

const ETA_OPTIONS = [15, 30, 45, 60]

function CreateOffer() {
  const { colors, s } = useStyles()
  const { t, i18n } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [priceText, setPriceText] = useState('10000')
  const [result, setResult] = useState<'sent' | 'queued' | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [eta, setEta] = useState(30)
  const [message, setMessage] = useState('')
  const [includesTravel, setIncludesTravel] = useState(true)
  const [includesMaterial, setIncludesMaterial] = useState(false)
  const [materials, setMaterials] = useState<Array<{ name: string; qty: number }>>([])
  const [materialInput, setMaterialInput] = useState('')
  const [availableNow, setAvailableNow] = useState(true)
  const [timeMode, setTimeMode] = useState<'commit' | 'propose'>('commit')
  const [proposedTime, setProposedTime] = useState<Date | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedPrice: number; suggestedMessage: string; reasoning?: string } | null>(null)
  const [marketPrices, setMarketPrices] = useState<{ count: number; medianPrice: number; avgPrice: number } | null>(null)

  useEffect(() => {
    if (!requestId) {
      setLoading(false)
      return
    }
    setLoading(true)
    apiGet(`/api/services/requests/${requestId}`)
      .then((res: any) => {
        const item = res.item || res
        setRequest(item)
        if (item?.budget && typeof item.budget === 'number') {
          setPriceText(String(item.budget))
        }
      })
      .catch((e: any) => {
        toast.error(t('common.error'), humanErrorMessage(e))
      })
      .finally(() => setLoading(false))
  }, [requestId, t, reloadToken])

  const meta = request ? getCategoryMeta(request.category || '') : getCategoryMeta('')
  const price = Number(priceText.replace(/\s/g, ''))
  const validPrice = Number.isFinite(price) && price > 0 && price <= 50_000_000
  const requestOpen = !!request && ['created', 'broadcasted', 'pending_offers'].includes(request.status)
  const needsTime = request?.scheduledFor ? timeMode === 'propose' : !availableNow
  const validTime = !needsTime || (!!proposedTime && proposedTime.getTime() > Date.now() && proposedTime.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000)
  const canSend = requestOpen && validPrice && validTime && message.length <= 1000
  // Fournitures repérées par l'analyse IA de la demande (noms génériques)
  const suggestedMaterials: string[] = (Array.isArray(request?.aiBrief?.materialProducts)
    ? request.aiBrief.materialProducts.map((m: any) => m?.term)
    : Array.isArray(request?.aiBrief?.advice?.materials) ? request.aiBrief.advice.materials : []
  ).filter((n: unknown): n is string => typeof n === 'string' && !!n.trim()).slice(0, 8)

  const addMaterial = (raw: string) => {
    const name = raw.trim().slice(0, 80)
    if (!name) return
    setMaterials(list => list.some(m => m.name.toLowerCase() === name.toLowerCase()) || list.length >= 10 ? list : [...list, { name, qty: 1 }])
    setMaterialInput('')
  }

  const handleAiSuggest = async () => {
    if (aiLoading || !request) return
    setAiLoading(true)
    setAiSuggestion(null)
    try {
      const res = await apiPost('/api/ai/assist', {
        type: 'suggest_offer',
        requestId,
        category: request.category,
        description: request.description,
        requestBudget: request.budget,
      })
      if (res.suggestedPrice && res.suggestedMessage) {
        setAiSuggestion({
          suggestedPrice: res.suggestedPrice,
          suggestedMessage: res.suggestedMessage,
          reasoning: res.reasoning,
        })
        if (res.marketPrices) {
          setMarketPrices(res.marketPrices)
        }
      } else {
        toast.error('IA', 'Aucune suggestion disponible')
      }
    } catch (e: any) {
      toast.error('IA indisponible', humanErrorMessage(e))
    } finally {
      setAiLoading(false)
    }
  }

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return
    setPriceText(String(aiSuggestion.suggestedPrice))
    setMessage(aiSuggestion.suggestedMessage)
    toast.success('Suggestion appliquée', 'Prix et message mis à jour')
  }

  const handleSendOffer = async () => {
    if (!requestId || submitting || !canSend) return
    setSubmitting(true)
    try {
      const response = await apiPostQueued(
        '/api/services/offers',
        {
          requestId,
          price,
          etaMinutes: eta,
          comment: message.trim(),
          validityMinutes: 30,
          providerName: getProviderName(),
          travelIncluded: includesTravel,
          materialIncluded: includesMaterial,
          materials: includesMaterial ? [] : materials.map(m => ({ name: m.name, qty: m.qty, byClient: true })),
          availableNow,
          // Contre-proposition horaire : soit le prestataire s'engage sur le
          // créneau demandé (pas de proposedTime), soit il en propose un autre.
          proposedTime: request?.scheduledFor
            ? (timeMode === 'propose' && proposedTime ? proposedTime.toISOString() : undefined)
            : (!availableNow && proposedTime ? proposedTime.toISOString() : undefined),
        },
        t('nearby.offerQueuedOffline')
      )
      if (response !== null) hapticSuccess()
      setResult(response === null ? 'queued' : 'sent')
    } catch (e: any) {
      hapticError()
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primaryText} />
      </SafeAreaView>
    )
  }

  if (result || !request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('providerOffer.title')} onBack={() => router.replace('/nearby-requests')} />
        <ScrollView contentContainerStyle={s.section}>
          <Text style={s.summaryTitle}>{result === 'sent' ? t('offers.sentSuccessTitle') : result === 'queued' ? t('request.queuedTitle') : t('journey.requestLoadError')}</Text>
          <Text style={s.summarySub}>{result === 'sent' ? t('journey.offerWaiting') : result === 'queued' ? t('nearby.offerQueuedOffline') : t('journey.requestRetry')}</Text>
        </ScrollView>
        <StickyBottomBar>
          <Button title={result ? t('journey.myOffers') : t('common.retry')} onPress={() => result ? router.replace('/my-offers') : setReloadToken(value => value + 1)} fullWidth size="lg" />
        </StickyBottomBar>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <AppHeader title={t('providerOffer.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }} keyboardShouldPersistTaps="handled">
        {!requestOpen && <Text style={[s.section, { color: colors.dangerInk }]} accessibilityRole="alert">{t('journey.requestClosed')}</Text>}
        {request && (
          <View style={s.summaryCard}>
            <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
              <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryTitle}>{meta.label}{request.subCategory ? ` • ${request.subCategory}` : ''}</Text>
              <Text style={s.summarySub}>{request.location?.address || request.address || request.locationName || ''}</Text>
              <Text style={s.summarySub}>{request.description}</Text>
            </View>
          </View>
        )}

        {/* AI Suggest Offer */}
        <View style={s.aiSection}>
          <TouchableOpacity
            style={s.aiSuggestBtn}
            onPress={handleAiSuggest}
            disabled={aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading ? (
              <ActivityIndicator size={18} color={colors.info} />
            ) : (
              <Sparkles size={18} color={colors.info} />
            )}
            <Text style={s.aiSuggestBtnText}>
              {aiLoading ? 'Analyse en cours…' : 'Suggérer un prix + message (IA)'}
            </Text>
          </TouchableOpacity>
          {marketPrices && (
            <Text style={s.marketInfo}>
              📊 {marketPrices.count} mission(s) complétée(s) · Médian: {marketPrices.medianPrice.toLocaleString('fr-FR')} FCFA · Moyen: {marketPrices.avgPrice.toLocaleString('fr-FR')} FCFA
            </Text>
          )}
          {aiSuggestion && (
            <View style={s.aiSuggestionCard}>
              <View style={s.aiSuggestionHeader}>
                <Sparkles size={14} color={colors.info} />
                <Text style={s.aiSuggestionTitle}>Suggestion IA</Text>
              </View>
              <Text style={s.aiSuggestionPrice}>
                {aiSuggestion.suggestedPrice.toLocaleString('fr-FR')} FCFA
              </Text>
              <Text style={s.aiSuggestionMessage}>{aiSuggestion.suggestedMessage}</Text>
              {aiSuggestion.reasoning && (
                <Text style={s.aiSuggestionReasoning}>💡 {aiSuggestion.reasoning}</Text>
              )}
              <TouchableOpacity style={s.applyBtn} onPress={applyAiSuggestion} activeOpacity={0.85}>
                <Text style={s.applyBtnText}>✓ Appliquer cette suggestion</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.priceSection}>
          <Text style={s.priceLabel}>{t('providerOffer.yourPrice')}</Text>
          <View style={s.priceInputRow}>
            <TouchableOpacity style={s.priceBtn} onPress={() => setPriceText(String(Math.max(500, (Number.isFinite(price) ? price : 1000) - 500)))} accessibilityRole="button" accessibilityLabel={t('journey.priceLess')}>
              <Minus size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={s.priceDisplay}>
              <TextInput style={s.priceValue} value={priceText} onChangeText={setPriceText} keyboardType="numeric" accessibilityLabel={t('providerOffer.yourPrice')} maxLength={12} selectTextOnFocus />
              <Text style={s.priceCurrency}>FCFA</Text>
            </View>
            <TouchableOpacity style={s.priceBtn} onPress={() => setPriceText(String(Math.min(50_000_000, (Number.isFinite(price) ? price : 0) + 500)))} accessibilityRole="button" accessibilityLabel={t('journey.priceMore')}>
              <Plus size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          {request.budget > 0 && <Text style={s.average}>{t('journey.clientBudget', { amount: Number(request.budget).toLocaleString('fr-FR') })}</Text>}
          {!validPrice && <Text style={[s.average, { color: colors.dangerInk }]} accessibilityRole="alert">{t('journey.invalidPrice')}</Text>}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerOffer.eta')}</Text>
          <View style={s.etaRow}>
            {ETA_OPTIONS.map(min => (
              <TouchableOpacity
                key={min}
                onPress={() => setEta(min)}
                style={[s.etaPill, eta === min && s.etaPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: eta === min }}
                aria-selected={eta === min}
                activeOpacity={0.85}
              >
                <Text style={[s.etaText, eta === min && s.etaTextActive]}>{min} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Créneau : engagement sur l'horaire demandé ou contre-proposition */}
        {request?.scheduledFor ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('schedule.slotTitle')}</Text>
            <View style={s.slotAskedRow}>
              <CalendarClock size={15} color={colors.info} />
              <Text style={s.slotAskedText}>
                {t('schedule.clientAsks', { slot: formatSlot(request.scheduledFor, i18n.language) })}
              </Text>
            </View>
            <View style={s.slotChoiceRow}>
              <TouchableOpacity
                style={[s.slotChoice, timeMode === 'commit' && s.slotChoiceActive]}
                onPress={() => setTimeMode('commit')}
                activeOpacity={0.8}
              >
                {timeMode === 'commit' && <Check size={14} color={colors.primaryText} />}
                <Text style={[s.slotChoiceText, timeMode === 'commit' && s.slotChoiceTextActive]}>
                  {t('schedule.iCommit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.slotChoice, timeMode === 'propose' && s.slotChoiceActive]}
                onPress={() => setTimeMode('propose')}
                activeOpacity={0.8}
              >
                <Text style={[s.slotChoiceText, timeMode === 'propose' && s.slotChoiceTextActive]}>
                  {t('schedule.proposeOther')}
                </Text>
              </TouchableOpacity>
            </View>
            {timeMode === 'propose' && (
              <SchedulePicker value={proposedTime} onChange={setProposedTime} />
            )}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerOffer.message')}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            accessibilityLabel={t('providerOffer.message')}
            maxLength={1000}
            placeholder={t('providerOffer.messagePlaceholder')}
            multiline
            numberOfLines={3}
            style={s.textArea}
            textAlignVertical="top"
          />
        </View>

        <View style={s.section}>
          <ToggleRow label={t('providerOffer.includesTravel')} value={includesTravel} onValueChange={setIncludesTravel} />
          <ToggleRow label={t('providerOffer.includesMaterial')} value={includesMaterial} onValueChange={setIncludesMaterial} />
          <ToggleRow label={t('providerOffer.availableNow')} value={availableNow} onValueChange={setAvailableNow} />
        </View>

        {/* Matériel non compris : le client sait quoi prévoir (achat où il veut, DDM+ en option) */}
        {!includesMaterial && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('providerOffer.materialsTitle')}</Text>
            <Text style={s.materialsHint}>{t('providerOffer.materialsHint')}</Text>
            {suggestedMaterials.length > 0 && (
              <>
                <Text style={s.materialsHint}>{t('providerOffer.materialsSuggested')}</Text>
                <View style={s.chipsRow}>
                  {suggestedMaterials.filter(n => !materials.some(m => m.name.toLowerCase() === n.toLowerCase())).map(n => (
                    <TouchableOpacity key={n} style={s.chip} onPress={() => addMaterial(n)} activeOpacity={0.8} accessibilityRole="button">
                      <Plus size={12} color={colors.primaryText} />
                      <Text style={s.chipText} numberOfLines={1}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={s.materialInputRow}>
              <TextInput
                value={materialInput}
                onChangeText={setMaterialInput}
                placeholder={t('providerOffer.materialsPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={s.materialInput}
                maxLength={80}
                returnKeyType="done"
                onSubmitEditing={() => addMaterial(materialInput)}
              />
              <TouchableOpacity style={s.materialAddBtn} onPress={() => addMaterial(materialInput)} disabled={!materialInput.trim()} accessibilityRole="button">
                <Text style={s.materialAddText}>{t('providerOffer.materialsAdd')}</Text>
              </TouchableOpacity>
            </View>
            {materials.map(m => (
              <View key={m.name} style={s.materialRow}>
                <Text style={s.materialName} numberOfLines={1}>{m.name}</Text>
                <TouchableOpacity onPress={() => setMaterials(list => list.map(x => x.name === m.name ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} style={s.qtyBtn} accessibilityRole="button" accessibilityLabel="-1">
                  <Minus size={14} color={colors.text} />
                </TouchableOpacity>
                <Text style={s.qtyText}>{m.qty}</Text>
                <TouchableOpacity onPress={() => setMaterials(list => list.map(x => x.name === m.name ? { ...x, qty: Math.min(99, x.qty + 1) } : x))} style={s.qtyBtn} accessibilityRole="button" accessibilityLabel="+1">
                  <Plus size={14} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMaterials(list => list.filter(x => x.name !== m.name))} style={s.qtyBtn}
                  accessibilityRole="button" accessibilityLabel={t('providerOffer.materialsRemove', { name: m.name })}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Pas dispo maintenant → proposer un horaire précis */}
        {!request?.scheduledFor && !availableNow && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('schedule.proposeTimeTitle')}</Text>
            <SchedulePicker value={proposedTime} onChange={setProposedTime} />
          </View>
        )}
      </ScrollView>

      <StickyBottomBar>
        <Button
          title={t('providerOffer.sendOffer')}
          onPress={handleSendOffer}
          loading={submitting}
          disabled={submitting || !canSend}
          fullWidth
          size="lg"
        />
      </StickyBottomBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { s } = useStyles()
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Toggle
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
      />
    </View>
  )
}



export default withScreenBoundary(CreateOffer, 'CreateOffer')


const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryAbbr: { fontSize: 16, fontWeight: typography.weight.extrabold as any },
    summaryTitle: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
    summarySub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
    priceSection: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    priceLabel: {
      fontSize: typography.sm.fontSize,
      fontWeight: typography.weight.extrabold as any,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.md,
    },
    priceInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    priceBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    priceBtnText: { color: colors.text },
    priceDisplay: { alignItems: 'center', flex: 1, minWidth: 0 },
    priceValue: {
      width: '100%',
      minHeight: 44,
      textAlign: 'center',
      fontSize: 24,
      fontWeight: typography.weight.extrabold as any,
      color: colors.text,
      letterSpacing: 0,
    },
    priceCurrency: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.bold as any },
    average: {
      textAlign: 'center',
      fontSize: typography.sm.fontSize,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
    materialsHint: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginBottom: spacing.sm },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, minHeight: 36 },
    chipText: { fontSize: typography.sm.fontSize, color: colors.text, flexShrink: 1 },
    materialInputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
    materialInput: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, color: colors.text },
    materialAddBtn: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    materialAddText: { color: colors.onPrimary, fontWeight: typography.weight.bold as any },
    materialRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, paddingVertical: spacing.xs },
    materialName: { flex: 1, fontSize: typography.sm.fontSize, color: colors.text },
    qtyBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
    qtyText: { minWidth: 20, textAlign: 'center', fontWeight: typography.weight.bold as any, color: colors.text },
    sectionTitle: {
      fontSize: typography.sm.fontSize,
      fontWeight: typography.weight.extrabold as any,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.md,
    },
    etaRow: { flexDirection: 'row', gap: spacing.md },
    etaPill: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    etaPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    etaText: { fontSize: typography.base.fontSize, color: colors.textSecondary, fontWeight: typography.weight.bold as any },
    etaTextActive: { color: colors.primaryText },
    textArea: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: typography.base.fontSize,
      color: colors.text,
      minHeight: 90,
    },
    slotAskedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.infoLight,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginBottom: spacing.md,
    },
    slotAskedText: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.bold as any, color: colors.infoInk, flex: 1 },
    slotChoiceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    slotChoice: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    slotChoiceActive: { borderColor: colors.primary, backgroundColor: colors.brandSoft },
    slotChoiceText: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.textSecondary },
    slotChoiceTextActive: { color: colors.brandInk },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    toggleLabel: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.bold as any },
    aiSection: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    aiSuggestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.infoLight || '#E0F2FE',
      borderRadius: radius.xl,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.info,
    },
    aiSuggestBtnText: {
      fontSize: typography.base.fontSize,
      fontWeight: typography.weight.bold as any,
      color: colors.info,
    },
    marketInfo: {
      fontSize: typography.sm.fontSize,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    aiSuggestionCard: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.info,
      ...shadows.sm,
    },
    aiSuggestionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacing.sm,
    },
    aiSuggestionTitle: {
      fontSize: typography.sm.fontSize,
      fontWeight: typography.weight.extrabold as any,
      color: colors.info,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    aiSuggestionPrice: {
      fontSize: 28,
      fontWeight: typography.weight.extrabold as any,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    aiSuggestionMessage: {
      fontSize: typography.base.fontSize,
      color: colors.text,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    aiSuggestionReasoning: {
      fontSize: typography.sm.fontSize,
      color: colors.textSecondary,
      fontStyle: 'italic',
      marginBottom: spacing.md,
    },
    applyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.info,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
    },
    applyBtnText: {
      fontSize: typography.base.fontSize,
      fontWeight: typography.weight.bold as any,
      color: colors.onPrimary,
    },
  })
  return { colors, s }
})
