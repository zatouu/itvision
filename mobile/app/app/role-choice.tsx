import { useState } from 'react'
import { ActivityIndicator } from 'react-native'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { updateAuthUser } from '../src/auth'
import { setMode } from '../src/mode'
import { apiPost } from '../src/api'
import { hapticSelect } from '../src/haptics'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Button from '../src/components/Button'
import { Search, Wrench } from 'lucide-react-native'

type Choice = 'client' | 'provider' | null

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
      <View style={s.body}>
        <Text style={s.title}>{t('roleChoice.title', { defaultValue: 'Comment utiliserez-vous Xeuy Bi ?' })}</Text>
        <Text style={s.sub}>{t('roleChoice.sub', { defaultValue: 'Vous pourrez faire les deux plus tard.' })}</Text>

        <TouchableOpacity
          style={[s.card, choice === 'client' && s.cardActive]}
          activeOpacity={0.8}
          onPress={() => { hapticSelect(); setChoice('client') }}
        >
          <View style={[s.iconBox, { backgroundColor: colors.infoLight }]}>
            <Search size={28} color={colors.info} />
          </View>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>{t('roleChoice.client', { defaultValue: 'Je cherche un service' })}</Text>
            <Text style={s.cardSub}>{t('roleChoice.clientSub', { defaultValue: 'Publiez une demande et choisissez un prestataire.' })}</Text>
          </View>
          {choice === 'client' && <View style={s.check} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.card, choice === 'provider' && s.cardActive]}
          activeOpacity={0.8}
          onPress={() => { hapticSelect(); setChoice('provider') }}
        >
          <View style={[s.iconBox, { backgroundColor: colors.brandSoft }]}>
            <Wrench size={28} color={colors.primary} />
          </View>
          <View style={s.cardText}>
            <Text style={s.cardTitle}>{t('roleChoice.provider', { defaultValue: 'Je propose mes services' })}</Text>
            <Text style={s.cardSub}>{t('roleChoice.providerSub', { defaultValue: 'Recevez des demandes et travaillez près de chez vous.' })}</Text>
          </View>
          {choice === 'provider' && <View style={s.check} />}
        </TouchableOpacity>
      </View>

      <View style={s.footer}>
        <Button
          title={t('common.next', { defaultValue: 'Continuer' })}
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
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  title: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.ink, lineHeight: 32, marginBottom: spacing.sm },
  sub: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.brandTint },
  iconBox: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: typography.weight.bold as any, color: colors.ink, marginBottom: 2 },
  cardSub: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl },
})

export default withScreenBoundary(RoleChoice, 'RoleChoice')
