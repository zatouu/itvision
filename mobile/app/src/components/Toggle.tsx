import { Switch, Platform } from 'react-native'
import { useTheme } from '../theme'
import { hapticSelect } from '../haptics'

type Props = {
  value: boolean
  onValueChange?: (v: boolean) => void
  disabled?: boolean
  accessibilityLabel?: string
  /** Couleur « activé » (par défaut : vert de marque). */
  tint?: string
}

/** Interrupteur natif unique : rendu iOS ou Material selon la plateforme, couleurs de marque, retour haptique. */
export default function Toggle({ value, onValueChange, disabled, accessibilityLabel, tint: suppliedTint }: Props) {
  const { colors, isDark } = useTheme()
  const tint = suppliedTint ?? (isDark ? colors.primaryText : colors.primary)
  const trackOff = isDark ? colors.border : '#E3DED3'
  return (
    <Switch
      value={value}
      onValueChange={onValueChange ? (v) => { hapticSelect(); onValueChange(v) } : undefined}
      disabled={disabled || !onValueChange}
      trackColor={{ false: trackOff, true: Platform.OS === 'android' ? `${tint}99` : tint }}
      thumbColor={Platform.OS === 'android' ? (value ? tint : '#FFFFFF') : '#FFFFFF'}
      ios_backgroundColor={trackOff}
      accessibilityRole={Platform.OS === 'web' ? undefined : 'switch'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled: disabled || !onValueChange }}
    />
  )
}
