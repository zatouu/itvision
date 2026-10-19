import { createThemedStyles } from '../../theme'
import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { Image } from 'expo-image'
import { Home } from 'lucide-react-native'


const SIZE = 200
const RING_COUNT = 4
const MAX_VIEWERS = 4
const MAX_NEARBY_DOTS = 8

export type RadarViewer = {
  providerId: string
  name?: string
  avatarUrl?: string | null
  distanceKm?: number | null
  etaMinutes?: number | null
  /** Le prestataire est en train de rédiger une offre */
  typing?: boolean
}

type Props = {
  /** Prestataires qui consultent réellement la demande (aucun profil fictif) */
  viewers?: RadarViewer[]
  /** Prestataires disponibles à proximité : affichés en points anonymes */
  nearbyCount?: number
}

const VIEWER_POSITIONS = [
  { x: -70, y: -55, size: 38 },
  { x: 62, y: -42, size: 36 },
  { x: -52, y: 62, size: 36 },
  { x: 58, y: 54, size: 34 },
]

const AVATAR_COLORS = ['#1D4ED8', '#0369A1', '#6D28D9', '#0891B2', '#065F46', '#92400E', '#B45309', '#7C2D12']

function getInitials(name?: string): string {
  if (!name || typeof name !== 'string') return '?'
  const parts = name.replace(/\./g, '').trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getColorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Point anonyme sur l'anneau extérieur (angle réparti, décalé pour ne pas croiser les avatars). */
function nearbyDotPosition(index: number, total: number) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + Math.PI / 8
  const r = 88
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
}

function TypingBubble() {
  const { s } = useStyles()
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current
  useEffect(() => {
    const anim = Animated.loop(Animated.stagger(160, dots.map(d => Animated.sequence([
      Animated.timing(d, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0.3, duration: 260, useNativeDriver: true }),
    ]))))
    anim.start()
    return () => anim.stop()
  }, [dots])
  return (
    <View style={s.typingBubble}>
      {dots.map((d, i) => <Animated.View key={i} style={[s.typingDot, { opacity: d }]} />)}
    </View>
  )
}

export default function RadarPulseIllustration({ viewers = [], nearbyCount = 0 }: Props) {
  const { colors, s } = useStyles()
  const shown = viewers.slice(0, MAX_VIEWERS)
  const dots = Math.min(Math.max(nearbyCount, 0), MAX_NEARBY_DOTS)

  const pulseAnims = useRef(Array.from({ length: RING_COUNT }, () => new Animated.Value(0))).current
  const floatAnims = useRef(Array.from({ length: MAX_VIEWERS }, () => new Animated.Value(0))).current
  const appearAnims = useRef(new Map<string, Animated.Value>()).current

  useEffect(() => {
    const animations = pulseAnims.map((anim, i) =>
      Animated.loop(Animated.timing(anim, { toValue: 1, duration: 3000, delay: i * 750, easing: Easing.out(Easing.ease), useNativeDriver: true }))
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [pulseAnims])

  useEffect(() => {
    const animations = floatAnims.map((anim, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration: 2000 + i * 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000 + i * 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]))
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [floatAnims])

  // Apparition en fondu de chaque nouveau prestataire qui consulte
  const appearFor = (id: string) => {
    let v = appearAnims.get(id)
    if (!v) {
      v = new Animated.Value(0)
      appearAnims.set(id, v)
      Animated.spring(v, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start()
    }
    return v
  }

  return (
    <View style={[s.container, { width: SIZE, height: SIZE }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pulseAnims.map((anim, i) => {
        const ringSize = 60 + i * 35
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] })
        const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] })
        return (
          <Animated.View
            key={`ring-${i}`}
            style={[s.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, transform: [{ scale }], opacity }]}
          />
        )
      })}

      {Array.from({ length: dots }, (_, i) => {
        const pos = nearbyDotPosition(i, dots)
        return <View key={`dot-${i}`} style={[s.nearbyDot, { left: SIZE / 2 + pos.x - 5, top: SIZE / 2 + pos.y - 5 }]} />
      })}

      <View style={s.innerCircle}>
        <Home size={28} color={colors.primaryText} />
      </View>

      {shown.map((viewer, i) => {
        const pos = VIEWER_POSITIONS[i]
        const appear = appearFor(viewer.providerId)
        return (
          <Animated.View
            key={viewer.providerId}
            style={[
              s.avatarWrap,
              {
                width: pos.size,
                height: pos.size,
                borderRadius: pos.size / 2,
                left: SIZE / 2 + pos.x - pos.size / 2,
                top: SIZE / 2 + pos.y - pos.size / 2,
                transform: [{ translateY: floatAnims[i] }, { scale: appear }],
                opacity: appear,
                backgroundColor: viewer.avatarUrl ? colors.surface : getColorForId(viewer.providerId),
                borderColor: viewer.typing ? colors.success : colors.primaryLight,
              },
            ]}
          >
            {viewer.avatarUrl ? (
              <Image source={{ uri: viewer.avatarUrl }} style={{ width: pos.size - 4, height: pos.size - 4, borderRadius: (pos.size - 4) / 2 }} contentFit="cover" />
            ) : (
              <Text style={s.avatarText}>{getInitials(viewer.name)}</Text>
            )}
            {viewer.typing ? <TypingBubble /> : <View style={s.onlineDot} />}
          </Animated.View>
        )
      })}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      position: 'absolute',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    innerCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      zIndex: 2,
    },
    nearbyDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
      opacity: 0.55,
      borderWidth: 2,
      borderColor: colors.primaryLight,
    },
    avatarWrap: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      zIndex: 3,
    },
    avatarText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.success,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    typingBubble: {
      position: 'absolute',
      top: -14,
      right: -12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 5,
      paddingVertical: 4,
      borderRadius: 9,
      backgroundColor: colors.success,
    },
    typingDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#FFFFFF',
    },
  })
  return { colors, s }
})
