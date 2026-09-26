import { useEffect, useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import { Play, Pause } from 'lucide-react-native'
import { resolveMediaUrl } from '../../media'
import { colors, spacing, radius, typography } from '../../design'

// Static waveform bars for display (real waveform v2)
const BAR_COUNT = 32

function generateBars(seed: number): number[] {
  const bars: number[] = []
  for (let i = 0; i < BAR_COUNT; i++) {
    const base = Math.sin(i * 0.5 + seed) * 0.4 + 0.5
    const noise = Math.sin(i * 1.3 + seed * 2) * 0.3
    bars.push(Math.max(0.15, Math.min(1, base + noise)))
  }
  return bars
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type Props = {
  uri: string
  durationSeconds?: number
}

export default function VoiceMessagePill({ uri, durationSeconds }: Props) {
  const bars = useMemo(() => generateBars(uri.length), [uri])
  const fullUri = useMemo(() => resolveMediaUrl(uri), [uri])
  const player = useAudioPlayer(fullUri ? { uri: fullUri } : null)
  const status = useAudioPlayerStatus(player)

  const playing = status.playing
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {})
    }
  }, [status.didJustFinish])

  useEffect(() => {
    if (fullUri) player.replace({ uri: fullUri })
  }, [fullUri])

  const toggle = async () => {
    if (!fullUri) return
    try {
      if (playing) {
        player.pause()
        await player.seekTo(0).catch(() => {})
        return
      }
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      await player.seekTo(0).catch(() => {})
      player.play()
    } catch { /* silencieux — pill compacte */ }
  }

  return (
    <View style={s.pill}>
      <TouchableOpacity style={s.playBtn} onPress={toggle} activeOpacity={0.8}>
        {playing
          ? <Pause size={16} color={colors.surface} fill={colors.surface} />
          : <Play size={16} color={colors.surface} fill={colors.surface} />
        }
      </TouchableOpacity>
      <View style={s.waveWrap}>
        {bars.map((h, i) => {
          const played = i / BAR_COUNT <= progress
          return (
            <View
              key={i}
              style={[
                s.bar,
                { height: Math.round(h * 28) },
                played ? s.barPlayed : s.barDefault,
              ]}
            />
          )
        })}
      </View>
      <Text style={s.duration}>{durationSeconds ? formatDuration(durationSeconds) : status.duration > 0 ? formatDuration(status.duration) : '—'}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FDF4',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
    height: 28,
  },
  bar: {
    width: 2.5,
    borderRadius: 1.25,
  },
  barDefault: { backgroundColor: '#86EFAC' },
  barPlayed: { backgroundColor: colors.primary },
  duration: {
    fontSize: typography.xs.fontSize,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
    fontWeight: typography.weight.semibold as any,
  },
})
