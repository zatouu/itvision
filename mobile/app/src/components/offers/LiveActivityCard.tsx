import { createThemedStyles } from '../../theme'
import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Eye, PenLine, Send } from 'lucide-react-native'

export type LiveActivity = {
  id: string
  kind: 'viewing' | 'typing' | 'offer'
  name?: string
  at: number
}

type Props = {
  items: LiveActivity[]
  now: number
}

function LiveDot() {
  const { s } = useStyles()
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]))
    anim.start()
    return () => anim.stop()
  }, [pulse])
  return (
    <View style={s.liveDotWrap}>
      <Animated.View style={[s.liveDotHalo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} />
      <View style={s.liveDot} />
    </View>
  )
}

/** Fil « en direct » : ce que font les prestataires sur la demande (consultation, rédaction, envoi). */
export default function LiveActivityCard({ items, now }: Props) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  if (items.length === 0) return null

  const ago = (at: number) => {
    const minutes = Math.floor((now - at) / 60000)
    return minutes < 1 ? t('clientOffers.justNow') : t('clientOffers.minutesAgo', { count: minutes })
  }
  const label = (item: LiveActivity) => {
    const name = item.name || t('clientOffers.aProvider')
    if (item.kind === 'typing') return t('clientOffers.activityTyping', { name })
    if (item.kind === 'offer') return t('clientOffers.activityOffer', { name })
    return t('clientOffers.activityViewing', { name })
  }
  const icon = (item: LiveActivity) => {
    if (item.kind === 'typing') return <PenLine size={14} color={colors.successInk} />
    if (item.kind === 'offer') return <Send size={14} color={colors.primaryText} />
    return <Eye size={14} color={colors.infoInk} />
  }

  return (
    <View style={s.card} accessibilityLiveRegion="polite">
      <View style={s.header}>
        <LiveDot />
        <Text style={s.headerText}>{t('clientOffers.liveTitle')}</Text>
      </View>
      {items.map(item => (
        <View key={item.id} style={s.row}>
          <View style={[s.iconWrap, item.kind === 'typing' ? s.iconTyping : item.kind === 'offer' ? s.iconOffer : s.iconViewing]}>{icon(item)}</View>
          <Text style={s.rowText} numberOfLines={2}>{label(item)}</Text>
          <Text style={s.rowTime}>{ago(item.at)}</Text>
        </View>
      ))}
    </View>
  )
}

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginTop: 12,
      padding: 14,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSecondary },
    liveDotWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
    liveDotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: colors.danger },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    iconViewing: { backgroundColor: colors.infoLight },
    iconTyping: { backgroundColor: colors.successLight },
    iconOffer: { backgroundColor: colors.primaryLight },
    rowText: { flex: 1, fontSize: 14, color: colors.text },
    rowTime: { fontSize: 12, color: colors.textMuted },
  })
  return { colors, s }
})
