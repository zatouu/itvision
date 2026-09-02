import { useLocalSearchParams, router } from 'expo-router'
import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import Button from '../../src/components/Button'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import { Minus, Plus, Sparkles } from 'lucide-react-native'
import { apiGet, apiPost, apiPostQueued } from '../../src/api'
import { toast } from '../../src/toast'
import { humanErrorMessage } from '../../src/errorMessages'
import { hapticSuccess, hapticError } from '../../src/haptics'
import { getProviderName } from '../../src/user-profile'
import { withScreenBoundary } from '../../src/components/withScreenBoundary'

const ETA_OPTIONS = [15, 30, 45, 60]

function CreateOffer() {
  const { t } = useTranslation()
  const { requestId } = useLocalSearchParams<{ requestId: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [price, setPrice] = useState(10000)
  const [eta, setEta] = useState(30)
  const [message, setMessage] = useState('')
  const [includesTravel, setIncludesTravel] = useState(true)
  const [includesMaterial, setIncludesMaterial] = useState(false)
  const [availableNow, setAvailableNow] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedPrice: number; suggestedMessage: string; reasoning?: string } | null>(null)
  const [marketPrices, setMarketPrices] = useState<{ count: number; medianPrice: number; avgPrice: number } | null>(null)

  useEffect(() => {
    if (!requestId) {
      setLoading(false)
      return
    }
    apiGet(`/api/services/requests/${requestId}`)
      .then((res: any) => {
        const item = res.item || res
        setRequest(item)
        if (item?.budget && typeof item.budget === 'number') {
          setPrice(item.budget)
        }
      })
      .catch((e: any) => {
        toast.error(t('common.error'), humanErrorMessage(e))
      })
      .finally(() => setLoading(false))
  }, [requestId, t])

  const meta = request ? getCategoryMeta(request.category || '') : getCategoryMeta('')
  const average = Math.round((request?.budget || price) * 0.95)

  const handleAiSuggest = async () => {
    if (aiLoading || !request) return
    setAiLoading(true)
    setAiSuggestion(null)
    try {
      const res = await apiPost('/api/ai/assist', {
        type: 'suggest_offer',
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
    setPrice(aiSuggestion.suggestedPrice)
    setMessage(aiSuggestion.suggestedMessage)
    toast.success('Suggestion appliquée', 'Prix et message mis à jour')
  }

  const handleSendOffer = async () => {
    if (!requestId) return
    setSubmitting(true)
    try {
      await apiPostQueued(
        '/api/services/offers',
        {
          requestId,
          price,
          etaMinutes: eta,
          comment: message,
          validityMinutes: 30,
          providerName: getProviderName(),
          travelIncluded: includesTravel,
          materialIncluded: includesMaterial,
          availableNow,
        },
        t('nearby.offerQueuedOffline')
      )
      hapticSuccess()
      toast.success(t('offers.sentSuccessTitle', 'Offre envoyée !'), t('offers.sentSuccessMsg', 'Votre proposition a été transmise au client.'))
      router.replace('/my-offers')
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
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <AppHeader title={t('providerOffer.title')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
        {request && (
          <View style={s.summaryCard}>
            <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
              <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryTitle}>{meta.label}{request.subCategory ? ` • ${request.subCategory}` : ''}</Text>
              <Text style={s.summarySub}>{request.address || request.locationName || ''}</Text>
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
            <TouchableOpacity style={s.priceBtn} onPress={() => setPrice((p: number) => Math.max(1000, p - 500))}>
              <Minus size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={s.priceDisplay}>
              <Text style={s.priceValue}>{price.toLocaleString('fr-FR').replace(/\s/g, ' ')}</Text>
              <Text style={s.priceCurrency}>FCFA</Text>
            </View>
            <TouchableOpacity style={s.priceBtn} onPress={() => setPrice((p: number) => p + 500)}>
              <Plus size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={s.average}>{t('providerOffer.average', { amount: average.toLocaleString('fr-FR') })}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerOffer.eta')}</Text>
          <View style={s.etaRow}>
            {ETA_OPTIONS.map(min => (
              <TouchableOpacity
                key={min}
                onPress={() => setEta(min)}
                style={[s.etaPill, eta === min && s.etaPillActive]}
                activeOpacity={0.85}
              >
                <Text style={[s.etaText, eta === min && s.etaTextActive]}>{min} min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerOffer.message')}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
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
      </ScrollView>

      <StickyBottomBar>
        <Button
          title={t('providerOffer.sendOffer')}
          onPress={handleSendOffer}
          loading={submitting}
          disabled={submitting}
          fullWidth
          size="lg"
        />
      </StickyBottomBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#CBD5E1', true: colors.primary }}
        thumbColor="#fff"
        ios_backgroundColor="#CBD5E1"
      />
    </View>
  )
}

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
  priceDisplay: { alignItems: 'center', minWidth: 160 },
  priceValue: {
    fontSize: 36,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    letterSpacing: -1,
  },
  priceCurrency: { fontSize: typography.sm.fontSize, color: colors.textSecondary, fontWeight: typography.weight.bold as any },
  average: {
    textAlign: 'center',
    fontSize: typography.sm.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
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
  etaTextActive: { color: colors.primary },
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
    color: '#fff',
  },
})

export default withScreenBoundary(CreateOffer, 'CreateOffer')

