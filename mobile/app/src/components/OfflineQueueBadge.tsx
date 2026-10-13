import { createThemedStyles } from '../theme'
import { View, Text, StyleSheet } from 'react-native'
import { useOfflineQueueSize } from '../offlineQueue'

export default function OfflineQueueBadge() {
  const { s } = useStyles()
  const size = useOfflineQueueSize()
  if (size === 0) return null

  return (
    <View style={s.container}>
      <View style={s.dot} />
      <Text style={s.text}>{size} action{size > 1 ? 's' : ''} en attente</Text>
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.brandSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#0F7B4F',
    },
    text: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primaryText,
    },
  })
  return { colors, s }
})
