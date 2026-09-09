import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { User, Briefcase, Wrench, ArrowLeftRight, LayoutGrid, MapPin, Receipt, Wallet, ChevronRight } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows, cat } from '../design'
import { getMode, setMode, isProviderCapable, homeRouteForMode, subscribeMode, AppMode } from '../mode'
import { hapticSelect } from '../haptics'
import BottomSheet from './BottomSheet'
import Button from './Button'

interface ModePillProps {
  style?: any
  size?: 'sm' | 'md'
}

export function ModePill({ style, size = 'md' }: ModePillProps) {
  const { t } = useTranslation()
  const [mode, setModeState] = useState<AppMode>(getMode())
  const capable = isProviderCapable()
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => subscribeMode(setModeState), [])

  if (!capable) return null

  const dims = size === 'sm'
    ? { h: 28, seg: 22, fs: 11, px: 10 }
    : { h: 32, seg: 26, fs: 12, px: 14 }

  const segments: { key: AppMode; label: string; icon: any; ink: string }[] = [
    { key: 'client', label: t('mode.client'), icon: User, ink: cat.electricite.ink },
    { key: 'provider', label: t('mode.provider'), icon: Briefcase, ink: colors.brandInk },
  ]

  return (
    <>
      <TouchableOpacity
        style={[s.pill, { height: dims.h, backgroundColor: colors.bgDeep, padding: 3 }, style]}
        activeOpacity={0.8}
        onPress={() => { hapticSelect(); setSheetOpen(true) }}
        accessibilityRole="button"
        accessibilityLabel={t('mode.switchLabel')}
      >
        {segments.map(({ key, label, icon: Icon, ink }) => {
          const active = mode === key
          return (
            <View key={key} style={[s.pillSeg, { height: dims.seg, paddingHorizontal: dims.px, borderRadius: radius.pill, backgroundColor: active ? '#fff' : 'transparent' }, active && { ...shadows.sm }]}>
              {active && <View style={[s.dot, { backgroundColor: ink }]} />}
              <Icon size={12} color={active ? ink : colors.textMuted} />
              <Text style={[s.pillText, { fontSize: dims.fs }, active ? { color: ink, fontWeight: typography.weight.extrabold as any } : { color: colors.textMuted }]}>{label}</Text>
            </View>
          )
        })}
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

  const config = next === 'provider'
    ? {
        title: t('mode.switchToProviderTitle'),
        color: colors.brandInk,
        bg: colors.brandSoft,
        lines: [
          { icon: LayoutGrid, text: t('mode.proBenefit1') },
          { icon: MapPin, text: t('mode.proBenefit2') },
        ],
        action: t('mode.switchToProviderCta'),
      }
    : {
        title: t('mode.switchToClientTitle'),
        color: cat.electricite.ink,
        bg: cat.electricite.soft,
        lines: [
          { icon: Receipt, text: t('mode.clientBenefit1') },
          { icon: Wallet, text: t('mode.clientBenefit2') },
        ],
        action: t('mode.switchToClientCta'),
      }

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
    <BottomSheet visible={visible} onClose={onClose} maxHeight={360} borderRadius={28}>
      <View style={s.sheet}>
        <View style={s.handle} />

        <View style={s.sheetHeader}>
          <View style={[s.sheetIcon, { backgroundColor: config.bg }]}>
            <ArrowLeftRight size={24} color={config.color} />
          </View>
          <Text style={s.sheetTitle}>{config.title}</Text>
        </View>

        <View style={s.benefits}>
          {config.lines.map(({ icon: Icon, text }, i) => (
            <View key={i} style={s.benefit}>
              <View style={s.benefitIcon}>
                <Icon size={16} color={colors.ink} />
              </View>
              <Text style={s.benefitText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={s.sheetActions}>
          <Button
            title={config.action}
            onPress={handleSwitch}
            loading={busy}
            fullWidth
          />
          <TouchableOpacity style={s.cancel} onPress={onClose} activeOpacity={0.7}>
            <Text style={s.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  )
}

export function CrossModeBanner({
  variant,
  onPress,
}: {
  variant: 'toPro' | 'toClient'
  onPress?: () => void
}) {
  const { t } = useTranslation()
  const config = variant === 'toPro'
    ? { bg: colors.brandSoft, fg: colors.brandInk, icon: Wrench, label: t('banner.toProLabel'), text: t('banner.toProText'), action: t('banner.toProAction') }
    : { bg: cat.electricite.soft, fg: cat.electricite.ink, icon: Receipt, label: t('banner.toClientLabel'), text: t('banner.toClientText'), action: t('banner.toClientAction') }

  // icons are in a typed const, but we didn't import Wrench/Receipt for each
  const Icon = config.icon

  return (
    <TouchableOpacity style={[b.banner, { backgroundColor: config.bg }]} onPress={onPress} activeOpacity={0.85}>
      <View style={b.iconCircle}>
        <Icon size={20} color={config.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[b.label, { color: config.fg }]}>{config.label}</Text>
        <Text style={[b.text, { color: config.fg }]} numberOfLines={1}>{config.text}</Text>
      </View>
      <View style={[b.action, { backgroundColor: '#fff' }]}>
        <Text style={[b.actionText, { color: config.fg }]}>{config.action}</Text>
        <ChevronRight size={14} color={config.fg} />
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: radius.pill },
  pillSeg: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 12, fontWeight: typography.weight.bold as any, letterSpacing: 0.2 },
  sheet: { paddingTop: 8, paddingBottom: spacing.md, gap: spacing.md },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 2 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.4, lineHeight: 24 },
  benefits: { gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  benefitIcon: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 13.5, fontWeight: typography.weight.medium as any, color: colors.text },
  sheetActions: { gap: 8, marginTop: 'auto' },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.textMuted },
})

const b = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, padding: 14, marginHorizontal: spacing.lg, marginTop: spacing.md },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: typography.weight.bold as any, opacity: 0.7, letterSpacing: 0.4, textTransform: 'uppercase' },
  text: { fontSize: 13.5, fontWeight: typography.weight.extrabold as any, lineHeight: 19, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  actionText: { fontSize: 12, fontWeight: typography.weight.extrabold as any },
})
