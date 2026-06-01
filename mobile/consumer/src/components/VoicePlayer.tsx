import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'

type Props = {
  uri: string
  durationMs?: number
  onRemove?: () => void
}

export default function VoicePlayer({ uri, durationMs, onRemove }: Props) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const soundRef = useRef<Audio.Sound | null>(null)

  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {})
    }
  }, [])

  const formatTime = (ms: number) => {
    const sec = Math.round(ms / 1000)
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const play = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true })
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return
          if (status.durationMillis) {
            setProgress(status.positionMillis / status.durationMillis)
          }
          if (status.didJustFinish) {
            setPlaying(false)
            setProgress(0)
          }
        }
      )
      soundRef.current = sound
      setPlaying(true)
    } catch (err) {
      console.error('[VoicePlayer] play error:', err)
    }
  }

  const stop = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync()
      setPlaying(false)
      setProgress(0)
    }
  }

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.playBtn} onPress={playing ? stop : play}>
        <Text style={s.playIcon}>{playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={s.waveContainer}>
        <View style={s.waveTrack}>
          <View style={[s.waveFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={s.duration}>{durationMs ? formatTime(durationMs) : '—'}</Text>
      </View>
      {onRemove && (
        <TouchableOpacity style={s.removeBtn} onPress={onRemove}>
          <Text style={s.removeText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F0FDF4', borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  playBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  playIcon: { fontSize: 16, color: '#fff' },
  waveContainer: { flex: 1, gap: 4 },
  waveTrack: {
    height: 6, borderRadius: 3, backgroundColor: '#D1FAE5', overflow: 'hidden',
  },
  waveFill: {
    height: '100%', borderRadius: 3, backgroundColor: '#059669',
  },
  duration: { fontSize: 11, color: '#065F46', fontVariant: ['tabular-nums'] },
  removeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center',
  },
  removeText: { fontSize: 16, color: '#DC2626', fontWeight: '700' },
})
