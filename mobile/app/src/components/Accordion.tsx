import { useState, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { colors, radius, spacing, typography, shadows } from '../design'

type Props = {
  title: string
  /** Badge numérique à droite du titre (nombre d'items). */
  count?: number
  defaultOpen?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Carte de section repliable — utilisée par les profils client et prestataire.
 * Simple état local : le contenu n'est monté que lorsque la section est ouverte.
 */
export default function Accordion({ title, count, defaultOpen = false, style, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={[s.card, style]}>
      <TouchableOpacity
        style={s.head}
        onPress={() => setOpen(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
      >
        <Text style={s.title}>{title}</Text>
        {typeof count === 'number' && <Text style={s.count}>{count}</Text>}
        <ChevronDown
          size={18}
          color={colors.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>
      {open && <View style={s.body}>{children}</View>}
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: { flex: 1, fontSize: 16, fontWeight: typography.weight.semibold as any, color: colors.text },
  count: {
    fontSize: 12,
    fontWeight: typography.weight.semibold as any,
    color: colors.textSecondary,
    backgroundColor: colors.bgGlobal,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
})
