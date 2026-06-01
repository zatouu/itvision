import { View, StyleSheet } from 'react-native'

type Props = {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: any
}

export default function Skeleton({ width = '100%', height = 16, radius = 8, style }: Props) {
  return <View style={[s.base, { width, height, borderRadius: radius }, style]} />
}

export function SkeletonCard() {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Skeleton width={42} height={42} radius={12} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="65%" height={14} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <Skeleton width="90%" height={12} />
      <Skeleton width="55%" height={12} />
    </View>
  )
}

const s = StyleSheet.create({
  base: { backgroundColor: '#E2E8F0' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
})
