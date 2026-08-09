import { useEffect, useRef, useState } from 'react'
import { Animated, Platform, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native'
import { colors, spacing, radius, typography, shadows } from './design'

type ToastType = 'success' | 'error' | 'info'
type ToastItem = { id: number; type: ToastType; title: string; message?: string }

type Listener = (t: ToastItem) => void
const listeners = new Set<Listener>()
let seq = 0

function emit(type: ToastType, title: string, message?: string) {
  const item = { id: ++seq, type, title, message }
  listeners.forEach((l) => l(item))
  if (Platform.OS === 'web' && listeners.size === 0 && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title)
  }
}

export const toast = {
  success: (title: string, message?: string) => emit('success', title, message),
  error: (title: string, message?: string) => emit('error', title, message),
  info: (title: string, message?: string) => emit('info', title, message),
}

const CONFIG: Record<ToastType, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: colors.success, bg: colors.successLight },
  error: { icon: AlertCircle, color: colors.danger, bg: colors.dangerLight },
  info: { icon: Info, color: colors.info, bg: colors.infoLight },
}

const DURATION = 3200

export function ToastHost() {
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState<ToastItem | null>(null)
  const translateY = useRef(new Animated.Value(-120)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const listener: Listener = (item) => {
      if (timer.current) clearTimeout(timer.current)
      setCurrent(item)
      translateY.setValue(-120)
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start()
      timer.current = setTimeout(() => {
        Animated.timing(translateY, { toValue: -120, duration: 220, useNativeDriver: true }).start(() => setCurrent(null))
      }, DURATION)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [translateY])

  if (!current) return null
  const cfg = CONFIG[current.type]
  const Icon = cfg.icon

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      <Animated.View style={[s.wrap, { top: insets.top + spacing.sm, transform: [{ translateY }] }]}>
        <View style={[s.toast, shadows.lg]}>
          <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
            <Icon size={20} color={cfg.color} />
          </View>
          <View style={s.texts}>
            <Text style={s.title} numberOfLines={1}>{current.title}</Text>
            {current.message ? <Text style={s.message} numberOfLines={2}>{current.message}</Text> : null}
          </View>
          <View style={[s.bar, { backgroundColor: cfg.color }]} />
        </View>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  texts: { flex: 1 },
  title: { ...typography.body, fontWeight: typography.weight.semibold, color: colors.text },
  message: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
})
