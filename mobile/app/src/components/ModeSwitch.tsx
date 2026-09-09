import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, Briefcase, Home, MapPin, Wallet2 } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../design'
import { getMode, setMode, isProviderCapable, homeRouteForMode, subscribeMode, AppMode } from '../mode'
import { hapticSelect } from '../haptics'
import BottomSheet from './BottomSheet'
import Button from './Button'

interface ModePillProps {
  style?: any
}

export function ModePill({ style }: ModePillProps) {
  const { t } = useTranslation()
  const [mode, setModeState] = useState<AppMode>(getMode())
  const capable = isProviderCapable()
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    return subscribeMode(setModeState)
  }, [])

  if (!capable) return null

  return (
    <>
      <TouchableOpacity
        style={[s.pill, style]}
        activeOpacity={0.8}
        onPress={() => { hapticSelect(); setSheetOpen(true) }}
        accessibilityRole="button"
        accessibilityLabel={t('mode.switchLabel', { defaultValue: 'Changer de mode' })}
      >
        <View style={[s.pillSegment, mode === 'client' && s.pillSegmentActive]}>
          <Text style={[s.pillText, mode === 'client' && s.pillTextActive]}>{t('mode.client', { defaultValue: 'Client' })}</Text>
        </View>
        <View style={[s.pillSegment, mode === 'provider' && s.pillSegmentActive]}>
          <Text style={[s.pillText, mode === 'provider' && s.pillTextActive]}>{t('mode.provider', { defaultValue: 'Pro' })}</Text>
        </View>
      </TouchableOpacity>

      <ModeSwitchSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  )
}

interface ModeSwitchSheetProps {
  visible: boolean
  onClose: () => void
}

export function ModeSwitchSheet({ visible, onClose }: ModeSwitchSheetProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const current = getMode()
  const [busy, setBusy] = useState(false)
  const next: AppMode = current === 'client' ? 'provider' : 'client'

  const handleSwitch = async () => {
    if (busy) return
    setBusy(true)
    try {
      await setMode(next)
      hapticSelect()
      onClose()
      router.replace(homeRouteForMode(next) as any)
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={360} borderRadius={24}>
      <View style={s.sheet}>
        <Text style={s.sheetTitle}>
          {next === 'provider'
            ? t('mode.switchToProviderTitle', { defaultValue: 'Passer en mode Prestataire ?' })
            : t('mode.switchToClientTitle', { defaultValue: 'Passer en mode Client ?' })}
        </Text>

        <View style={s.benefits}>
          {next === 'provider' ? (
            <>
              <Benefit icon={Home} text={t('mode.proBenefit1', { defaultValue: 'Accueil avec les demandes proches' })} />
              <Benefit icon={MapPin} text={t('mode.proBenefit2', { defaultValue: 'Votre position partagée pendant les missions' })} />
            </>
          ) : (
            <>
              <Benefit icon={Wallet2} text={t('mode.clientBenefit1', { defaultValue: 'Voir vos demandes et paiements' })} />
              <Benefit icon={Briefcase} text={t('mode.clientBenefit2', { defaultValue: 'Suivi client de vos missions' })} />
            </>
          )}
        </View>

        <Button
          title={next === 'provider'
            ? t('mode.switchToProviderCta', { defaultValue: 'Passer en mode Pro' })
            : t('mode.switchToClientCta', { defaultValue: 'Passer en mode Client' })}
          onPress={handleSwitch}
          loading={busy}
          fullWidth
          icon={<ArrowLeftRight size={18} color="#fff" />}
        />
        <TouchableOpacity style={s.cancel} onPress={onClose} activeOpacity={0.7}>
          <Text style={s.cancelText}>{t('common.cancel', { defaultValue: 'Annuler' })}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  )
}

function Benefit({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <View style={s.benefit}>
      <View style={s.benefitIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <Text style={s.benefitText}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.bgDeep,
    padding: 2,
  },
  pillSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    borderRadius: radius.pill,
  },
  pillSegmentActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  pillText: {
    fontSize: 12,
    fontWeight: typography.weight.bold as any,
    color: colors.textMuted,
  },
  pillTextActive: {
    color: colors.ink,
  },
  sheet: {
    paddingTop: 8,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: typography.weight.extrabold as any,
    color: colors.ink,
    textAlign: 'center',
  },
  benefits: { gap: spacing.sm },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: typography.weight.medium as any,
    color: colors.text,
  },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: {
    fontSize: 14,
    fontWeight: typography.weight.semibold as any,
    color: colors.textMuted,
  },
})
