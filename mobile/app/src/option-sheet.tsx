import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, radius, typography, shadows } from './design'

export type SheetOption = { key: string; label: string; destructive?: boolean }

type Request = { title: string; subtitle?: string; options: SheetOption[]; resolve: (key: string | null) => void }

type Listener = (r: Request) => void
const listeners = new Set<Listener>()

export function pickOption(title: string, options: SheetOption[], subtitle?: string): Promise<string | null> {
  return new Promise((resolve) => {
    const req: Request = { title, subtitle, options, resolve }
    if (listeners.size === 0) { resolve(null); return }
    listeners.forEach((l) => l(req))
  })
}

export function OptionSheetHost() {
  const insets = useSafeAreaInsets()
  const [current, setCurrent] = useState<Request | null>(null)
  const translateY = useRef(new Animated.Value(400)).current

  useEffect(() => {
    const listener: Listener = (req) => {
      setCurrent(req)
      translateY.setValue(400)
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 260 }).start()
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [translateY])

  const close = (key: string | null) => {
    if (!current) return
    const req = current
    Animated.timing(translateY, { toValue: 400, duration: 180, useNativeDriver: true }).start(() => {
      setCurrent(null)
      req.resolve(key)
    })
  }

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => close(null)}>
      <Pressable style={s.backdrop} onPress={() => close(null)}>
        <Pressable style={{ width: '100%' }} onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[s.sheet, shadows.xl, { paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY }] }]}>
            <View style={s.handle} />
            <Text style={s.title}>{current?.title}</Text>
            {current?.subtitle ? <Text style={s.subtitle}>{current.subtitle}</Text> : null}
            {current?.options.map((opt) => (
              <TouchableOpacity key={opt.key} style={s.option} onPress={() => close(opt.key)} activeOpacity={0.7}>
                <Text style={[s.optionText, opt.destructive && { color: colors.danger }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancel} onPress={() => close(null)} activeOpacity={0.7}>
              <Text style={s.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(9,26,47,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'], padding: spacing.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.lg, fontWeight: typography.weight.bold, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  option: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  optionText: { ...typography.button, fontWeight: typography.weight.medium, color: colors.text },
  cancel: { marginTop: spacing.md, backgroundColor: colors.slate100, borderRadius: radius.xl, paddingVertical: spacing.lg, alignItems: 'center' },
  cancelText: { ...typography.button, fontWeight: typography.weight.semibold, color: colors.textSecondary },
})
