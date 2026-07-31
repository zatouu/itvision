import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native'
import { colors, radius, typography } from '../design'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
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
  const isDisabled = disabled || loading
  const containerStyle = [
    s.base,
    s[size],
    variantStyles[variant].container,
    isDisabled && s.disabled,
    fullWidth && s.fullWidth,
  ]
  const textStyle = [s.text, variantStyles[variant].text, sizeStyles[size].text, isDisabled && s.textDisabled]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyle}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading && <ActivityIndicator color={variantStyles[variant].text.color} size="small" style={{ marginRight: 8 }} />}
      {!loading && icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, minHeight: 44 },
  sm: { paddingVertical: 8, paddingHorizontal: 12 },
  md: { paddingVertical: 14, paddingHorizontal: 20 },
  lg: { paddingVertical: 17, paddingHorizontal: 24 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  text: { fontWeight: typography.weight.bold as any, textAlign: 'center' },
  textDisabled: { opacity: 0.8 },
})

const sizeStyles = {
  sm: StyleSheet.create({ text: { fontSize: typography.sm.fontSize } }),
  md: StyleSheet.create({ text: { fontSize: typography.base.fontSize } }),
  lg: StyleSheet.create({ text: { fontSize: typography.md.fontSize } }),
}

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.surface },
  },
  secondary: {
    container: { backgroundColor: colors.navy },
    text: { color: colors.surface },
  },
  outline: {
    container: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
    text: { color: colors.primary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.textSecondary },
  },
}
