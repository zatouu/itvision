import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native'
import { colors, radius, typography } from '../design'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
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
    (variant === 'primary' || variant === 'secondary' || variant === 'danger') && !isDisabled && s.elevated,
    isDisabled && s.disabled,
    fullWidth && s.fullWidth,
  ]
  const textStyle = [s.text, variantStyles[variant].text, sizeStyles[size].text, isDisabled && s.textDisabled]

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={containerStyle}
      activeOpacity={0.8}
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
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, minHeight: 44 },
  sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.md },
  md: { paddingVertical: 16, paddingHorizontal: 22, minHeight: 54 },
  lg: { paddingVertical: 18, paddingHorizontal: 26, minHeight: 58 },
  fullWidth: { width: '100%' },
  elevated: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12, elevation: 6 },
  disabled: { opacity: 0.45 },
  text: { fontWeight: typography.weight.bold as any, textAlign: 'center', letterSpacing: 0.2 },
  textDisabled: { opacity: 0.8 },
})

const sizeStyles = {
  sm: StyleSheet.create({ text: { fontSize: typography.sm.fontSize } }),
  md: StyleSheet.create({ text: { fontSize: typography.md.fontSize } }),
  lg: StyleSheet.create({ text: { fontSize: typography.lg.fontSize } }),
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
  danger: {
    container: { backgroundColor: colors.danger },
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
