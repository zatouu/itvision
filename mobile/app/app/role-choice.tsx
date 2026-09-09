import { useState } from 'react'
import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, typography, shadows, cat } from '../src/design'
import { updateAuthUser } from '../src/auth'
import { setMode } from '../src/mode'
import { apiPost } from '../src/api'
import { hapticSelect } from '../src/haptics'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Button from '../src/components/Button'
import Logo from '../src/components/Logo'
import { Search, Wrench, Check, ArrowLeftRight } from 'lucide-react-native'

type Choice = 'client' | 'provider' | null

function RoleCard({
  role,
  active,
  onPress,
}: {
  role: 'client' | 'provider'
  active: boolean
  onPress: () => void
}) {
  const { t } = useTranslation()
  const isClient = role === 'client'
  const theme = isClient
    ? { bg: cat.electricite.bg, soft: cat.electricite.soft, ink: cat.electricite.ink }
    : { bg: colors.primary, soft: colors.brandSoft, ink: colors.brandInk }
  const Icon = isClient ? Search : Wrench

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: theme.bg }, active && s.cardActive]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={s.cardPattern} />
      <View style={s.cardPatternSmall} />
      <View style={[s.iconBox, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Icon size={32} color="#fff" strokeWidth={2.2} />
      </View>
      <View style={s.cardText}>
        <Text style={s.cardTitle}>
          {isClient ? t('roleChoice.client') : t('roleChoice.provider')}
        </Text>
        <Text style={s.cardSub}>
          {isClient ? t('roleChoice.clientSub') : t('roleChoice.providerSub')}
        </Text>
      </View>
      {active && (
        <View style={s.check}>
          <Check size={16} color={theme.bg} strokeWidth={3} />
        </View>
      )}
    </TouchableOpacity>
  )
}

function RoleChoice() {
  const { t } = useTranslation()
  const [choice, setChoice] = useState<Choice>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!choice) return
    hapticSelect()
    setSubmitting(true)
    try {
      if (choice === 'provider') {
        const r: any = await apiPost('/api/users/me/provider', {})
        updateAuthUser({ role: 'PROVIDER', providerProfileId: r?.providerProfileId })
        setMode('provider')
        router.replace('/onboarding-provider' as any)
      } else {
        updateAuthUser({ role: 'CLIENT' })
        setMode('client')
        router.replace('/setup-profile' as any)
      }
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wordmark}>
        <Logo size={16} />
      </View>

      <View style={s.body}>
        <Text style={s.title}>{t('roleChoice.title')}</Text>
        <Text style={s.sub}>{t('roleChoice.sub')}</Text>

        <View style={s.cards}>
          <RoleCard
            role="client"
            active={choice === 'client'}
            onPress={() => { hapticSelect(); setChoice('client') }}
          />
          <RoleCard
            role="provider"
            active={choice === 'provider'}
            onPress={() => { hapticSelect(); setChoice('provider') }}
          />
        </View>

        <View style={s.hint}>
          <View style={s.hintIcon}>
            <ArrowLeftRight size={18} color={colors.ink} />
          </View>
          <Text style={s.hintText}>{t('roleChoice.sub')}</Text>
        </View>
      </View>

      <View style={s.footer}>
        <Button
          title={t('common.next')}
          onPress={submit}
          fullWidth
          disabled={!choice || submitting}
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  wordmark: { paddingTop: spacing.lg, alignItems: 'center' },
  body: { flex: 1, padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  title: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.ink, lineHeight: 32, letterSpacing: -0.6 },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  cards: { gap: spacing.md },
  card: {
    height: 140,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  cardActive: { borderWidth: 3, borderColor: colors.surface, shadowColor: colors.shadow },
  cardPattern: { position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  cardPatternSmall: { position: 'absolute', right: 20, bottom: -50, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  iconBox: { width: 68, height: 68, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 19, fontWeight: typography.weight.extrabold as any, color: '#fff', letterSpacing: -0.4, lineHeight: 24 },
  cardSub: { fontSize: 12.5, fontWeight: typography.weight.medium as any, color: 'rgba(255,255,255,0.85)', marginTop: 6, lineHeight: 18 },
  check: { position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: spacing.md, marginTop: 4 },
  hintIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  hintText: { flex: 1, fontSize: 13, fontWeight: typography.weight.semibold as any, color: colors.text },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
})

export default withScreenBoundary(RoleChoice, 'RoleChoice')
