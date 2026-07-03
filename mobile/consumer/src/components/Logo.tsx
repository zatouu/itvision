import { View, StyleSheet } from 'react-native'
import { colors } from '../design'

export default function Logo({ size = 28 }: { size?: number }) {
  const dotSize = size * 0.36
  const barWidth = size * 0.6
  const barHeight = size * 0.14
  return (
    <View style={[s.container, { width: size, height: size }]}>
      <View style={[s.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.primary, top: 0, left: '50%', marginLeft: -dotSize / 2 }]} />
      <View style={[s.bar, { width: barWidth, height: barHeight, borderRadius: barHeight / 2, backgroundColor: colors.navy, top: '50%', left: '50%', marginTop: -barHeight / 2, marginLeft: -barWidth / 2, transform: [{ rotate: '45deg' }] }]} />
      <View style={[s.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.info, bottom: 0, left: '50%', marginLeft: -dotSize / 2 }]} />
    </View>
  )
}

const s = StyleSheet.create({
  container: { position: 'relative' },
  dot: { position: 'absolute' },
  bar: { position: 'absolute' },
})
