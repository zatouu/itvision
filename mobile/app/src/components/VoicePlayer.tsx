import { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import { resolveMediaUrl } from '../media'

type Props = {
  uri: string
  durationMs?: number
  onRemove?: () => void
}

export default function VoicePlayer({ uri, durationMs, onRemove }: Props) {
  const [error, setError] = useState(false)
  const fullUri = useMemo(() => resolveMediaUrl(uri), [uri])
  const player = useAudioPlayer(fullUri ? { uri: fullUri } : null)
  const status = useAudioPlayerStatus(player)

  const playing = status.playing
  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0

  // Revenir au début après la fin — permet de relancer.
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0).catch(() => {})
    }
  }, [status.didJustFinish])

  // Si l'uri change (remontage partiel), recharger la source.
  useEffect(() => {
    if (fullUri) player.replace({ uri: fullUri })
  }, [fullUri])

  const formatTime = (ms: number) => {
    const sec = Math.round(ms / 1000)
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const toggle = async () => {
    if (!fullUri) {
      setError(true)
      return
    }
    try {
      setError(false)
      if (playing) {
        player.pause()
        await player.seekTo(0).catch(() => {})
      } else {
        await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
        await player.seekTo(0).catch(() => {})
        player.play()
      }
    } catch (err: any) {
      console.error('[VoicePlayer] play error:', err)
      setError(true)
    }
  }

  return (
    <View style={[s.container, error && s.containerError]}>
      <TouchableOpacity style={[s.playBtn, error && s.playBtnError]} onPress={toggle}>
        <Text style={s.playIcon}>{error ? '!' : playing ? '⏸' : '▶'}</Text>
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
  containerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  playBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnError: { backgroundColor: '#DC2626' },
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
