import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'
import { Image } from 'expo-image'
import { Home } from 'lucide-react-native'
import { colors } from '../../design'

const SIZE = 200
const RING_COUNT = 4

// Sample avatar positions around the radar
const AVATARS = [
  { x: -70, y: -55, size: 36, uri: 'https://i.pravatar.cc/100?img=11' },
  { x: 60, y: -40, size: 32, uri: 'https://i.pravatar.cc/100?img=12' },
  { x: -50, y: 60, size: 34, uri: 'https://i.pravatar.cc/100?img=13' },
  { x: 55, y: 50, size: 30, uri: 'https://i.pravatar.cc/100?img=14' },
]

export default function RadarPulseIllustration() {
  const pulseAnims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0))
  ).current
  const avatarAnims = useRef(
    AVATARS.map(() => ({
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

      {/* Floating avatars */}
      {AVATARS.map((avatar, i) => (
        <Animated.View
          key={`avatar-${i}`}
          style={[
            s.avatarWrap,
            {
              width: avatar.size,
              height: avatar.size,
              borderRadius: avatar.size / 2,
              left: SIZE / 2 + avatar.x - avatar.size / 2,
              top: SIZE / 2 + avatar.y - avatar.size / 2,
              transform: [{ translateY: avatarAnims[i].translateY }],
              opacity: avatarAnims[i].opacity,
            },
          ]}
        >
          <Image
            source={{ uri: avatar.uri }}
            style={{ width: avatar.size - 4, height: avatar.size - 4, borderRadius: (avatar.size - 4) / 2 }}
            contentFit="cover"
          />
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
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    zIndex: 3,
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
