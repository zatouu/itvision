import { createThemedStyles } from '../theme'
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native'
import { radius, typography, isIOS } from '../design'
import { hapticLight } from '../haptics'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'tinted' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  icon,
  fullWidth,
}: ButtonProps) {
  const { variantStyles } = useStyles()
  const isDisabled = disabled || loading
  const textStyle = [s.text, variantStyles[variant].text, sizeStyles[size].text]

  return (
    <Pressable
      onPress={() => { hapticLight(); onPress() }}
      disabled={isDisabled}
      android_ripple={{ color: variant === 'primary' || variant === 'secondary' ? 'rgba(255,255,255,0.22)' : 'rgba(10,22,40,0.10)' }}
      style={({ pressed }) => [
        s.base,
        s[size],
        variantStyles[variant].container,
        pressed && isIOS && s.pressed,
        isDisabled && s.disabled,
        fullWidth && s.fullWidth,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading && <ActivityIndicator color={variantStyles[variant].text.color} size="small" style={{ marginRight: 8 }} />}
      {!loading && icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={textStyle} numberOfLines={1}>{title}</Text>
    </Pressable>
  )
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: isIOS ? 14 : 999, minHeight: 44, overflow: 'hidden' },
  sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: isIOS ? radius.sm : 999 },
  md: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 50 },
  lg: { paddingVertical: 16, paddingHorizontal: 24, minHeight: 56, borderRadius: isIOS ? radius.md : 999 },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
  text: { fontWeight: typography.weight.bold as any, textAlign: 'center' },
})

const sizeStyles = {
  sm: StyleSheet.create({ text: { fontSize: 14 } }),
  md: StyleSheet.create({ text: { fontSize: 16 } }),
  lg: StyleSheet.create({ text: { fontSize: 17 } }),
}



const useStyles = createThemedStyles(colors => {
  const variantStyles = {
    primary: {
      container: { backgroundColor: colors.primary },
      text: { color: colors.onPrimary },
    },
    secondary: {
      container: { backgroundColor: colors.navy },
      text: { color: colors.onPrimary },
    },
    tinted: {
      container: { backgroundColor: colors.brandSoft },
      text: { color: colors.brandInk },
    },
    danger: {
      container: { backgroundColor: colors.dangerSoft },
      text: { color: colors.dangerInk },
    },
    outline: {
      container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
      text: { color: colors.ink },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: colors.primaryText },
    },
  }
  return { colors, variantStyles }
})
