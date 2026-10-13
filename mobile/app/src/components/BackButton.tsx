import { Pressable, StyleSheet, Platform } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft } from 'lucide-react-native'
import { touch } from '../design'
import { useTheme } from '../theme'

type Props = { onPress?: () => void; color?: string }

type IconProps = { size?: number; color?: string; strokeWidth?: number }

/** Icône de retour seule, pour les boutons existants : chevron iOS, flèche Android. */
export function BackIcon({ size = 22, color: suppliedColor, strokeWidth }: IconProps) {
  const { colors } = useTheme()
  const color = suppliedColor ?? colors.ink
  return Platform.OS === 'ios'
    ? <ChevronLeft size={size + 4} color={color} strokeWidth={strokeWidth ?? 2.2} />
    : <ArrowLeft size={size} color={color} strokeWidth={strokeWidth} />
}

/** Retour plateforme : chevron iOS, flèche Material avec ripple sur Android. */
export default function BackButton({ onPress, color: suppliedColor }: Props) {
  const { colors } = useTheme()
  const color = suppliedColor ?? colors.ink
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onPress || (() => router.back())}
      hitSlop={touch.hitSlop}
      android_ripple={touch.rippleRound}
      style={({ pressed }) => [s.btn, Platform.OS === 'ios' && pressed && { opacity: 0.5 }]}
      accessibilityRole="button"
      accessibilityLabel={t('common.back', { defaultValue: 'Retour' })}
    >
      {Platform.OS === 'ios'
        ? <ChevronLeft size={28} color={color} strokeWidth={2.2} />
        : <ArrowLeft size={24} color={color} />}
    </Pressable>
  )
}

const s = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
})
