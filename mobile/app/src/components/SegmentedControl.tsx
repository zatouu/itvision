import { createThemedStyles } from '../theme'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { shadows, isIOS } from '../design'
import { hapticSelect } from '../haptics'

type Segment<K extends string> = { key: K; label: string; count?: number }

type Props<K extends string> = {
  segments: Segment<K>[]
  value: K
  onChange: (key: K) => void
}

/** Contrôle segmenté (2 à 4 options). Au-delà, préférer une liste de filtres défilante. */
export default function SegmentedControl<K extends string>({ segments, value, onChange }: Props<K>) {
  const { s } = useStyles()
  return (
    <View style={[s.track, !isIOS && s.trackAndroid]} accessibilityRole="tablist">
      {segments.map((seg, i) => {
        const active = seg.key === value
        return (
          <Pressable
            key={seg.key}
            onPress={() => { if (!active) { hapticSelect(); onChange(seg.key) } }}
            android_ripple={{ color: 'rgba(10,22,40,0.08)' }}
            style={[
              s.segment,
              isIOS ? active && s.segmentActive : [s.segmentAndroid, i > 0 && s.segmentDivider, active && s.segmentAndroidActive],
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            aria-selected={active}
            accessibilityLabel={seg.count ? `${seg.label}, ${seg.count}` : seg.label}
          >
            <Text style={[s.label, active && s.labelActive]} numberOfLines={1}>{seg.label}</Text>
            {!!seg.count && (
              <View style={[s.count, active && s.countActive]}>
                <Text style={[s.countText, active && s.countTextActive]}>{seg.count > 99 ? '99+' : seg.count}</Text>
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    track: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 10, padding: 2 },
    segment: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 6 },
    segmentActive: { backgroundColor: colors.surface, ...shadows.sm },
    trackAndroid: { backgroundColor: 'transparent', borderRadius: 999, padding: 0, borderWidth: 1, borderColor: colors.textMuted, overflow: 'hidden' },
    segmentAndroid: { borderRadius: 0, minHeight: 44 },
    segmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.textMuted },
    segmentAndroidActive: { backgroundColor: colors.brandSoft },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    labelActive: { color: colors.ink, fontWeight: '700' },
    count: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fillStrong },
    countActive: { backgroundColor: colors.primary },
    countText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
    countTextActive: { color: colors.onPrimary },
  })
  return { colors, s }
})
