import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'
import { Image } from 'expo-image'
import { Home } from 'lucide-react-native'
import { colors } from '../../design'

const SIZE = 200
const RING_COUNT = 4

export type RadarViewer = {
  providerId: string
  name?: string
  avatarUrl?: string | null
  distanceKm?: number | null
  etaMinutes?: number | null
}

type Props = {
  viewers?: RadarViewer[]
}

// Fallback generic positions around the radar (used when no real viewers)
const FALLBACK_POSITIONS = [
  { x: -70, y: -55, size: 36 },
  { x: 60, y: -40, size: 32 },
  { x: -50, y: 60, size: 34 },
  { x: 55, y: 50, size: 30 },
]

const AVATAR_COLORS = ['#1D4ED8', '#0369A1', '#6D28D9', '#0891B2', '#065F46', '#92400E', '#B45309', '#7C2D12']

function getInitials(name?: string): string {
  if (!name || typeof name !== 'string') return 'PR'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getColorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function RadarPulseIllustration({ viewers = [] }: Props) {
  // Build display items: real viewers first, then fallback slots to fill up to 4
  const items = useRef<{ id: string; name?: string; avatarUrl?: string | null; x: number; y: number; size: number }[]>([]).current
  items.length = 0
  const realViewers = viewers.slice(0, 4)
  for (let i = 0; i < realViewers.length; i++) {
    const pos = FALLBACK_POSITIONS[i]
    items.push({ id: realViewers[i].providerId, name: realViewers[i].name, avatarUrl: realViewers[i].avatarUrl, x: pos.x, y: pos.y, size: pos.size })
  }
  // Fill remaining slots with generic placeholders (no fake white faces)
  for (let i = realViewers.length; i < 4; i++) {
    const pos = FALLBACK_POSITIONS[i]
    items.push({ id: `fallback-${i}`, name: undefined, x: pos.x, y: pos.y, size: pos.size })
  }

  const pulseAnims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0))
  ).current
  const avatarAnims = useRef(
    items.map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0.7),
    }))
  ).current

  // Pulse rings
  useEffect(() => {
    const animations = pulseAnims.map((anim, i) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000,
          delay: i * 750,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [pulseAnims])

  // Floating avatars
  useEffect(() => {
    const animations = avatarAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim.translateY, {
            toValue: -6,
            duration: 2000 + i * 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 2000 + i * 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    )
    animations.forEach(a => a.start())
    return () => animations.forEach(a => a.stop())
  }, [avatarAnims])

  return (
    <View style={[s.container, { width: SIZE, height: SIZE }]}>
      {/* Concentric rings */}
      {pulseAnims.map((anim, i) => {
        const ringSize = 60 + i * 35
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.2] })
        const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] })
        return (
          <Animated.View
            key={`ring-${i}`}
            style={[
              s.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        )
      })}

      {/* Static inner circle */}
      <View style={s.innerCircle}>
        <Home size={28} color={colors.primary} />
      </View>

      {/* Floating avatars — real viewers (photo or initials) or generic placeholders */}
      {items.map((item, i) => (
        <Animated.View
          key={`avatar-${i}`}
          style={[
            s.avatarWrap,
            {
              width: item.size,
              height: item.size,
              borderRadius: item.size / 2,
              left: SIZE / 2 + item.x - item.size / 2,
              top: SIZE / 2 + item.y - item.size / 2,
              transform: [{ translateY: avatarAnims[i].translateY }],
              opacity: avatarAnims[i].opacity,
              backgroundColor: item.avatarUrl ? colors.surface : getColorForId(item.id),
            },
          ]}
        >
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{ width: item.size - 4, height: item.size - 4, borderRadius: (item.size - 4) / 2 }}
              contentFit="cover"
            />
          ) : (
            <Text style={s.avatarText}>{getInitials(item.name)}</Text>
          )}
          <View style={s.onlineDot} />
        </Animated.View>
      ))}
    </View>
  )
}

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
  avatarWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    zIndex: 3,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
})
