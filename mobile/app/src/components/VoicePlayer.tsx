import { createThemedStyles } from '../theme'
import { useState, useRef, useEffect } from 'react'
import { logError } from '../log'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Audio } from 'expo-av'
import { resolveMediaUrl } from '../media'

type Props = {
  uri: string
  durationMs?: number
  onRemove?: () => void
}

export default function VoicePlayer({ uri, durationMs, onRemove }: Props) {
  const { s } = useStyles()
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(false)
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
      setError(false)
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      })
      const fullUri = resolveMediaUrl(uri)
      if (!fullUri) {
        setError(true)
        return
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullUri },
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
    } catch (err: any) {
      logError('VoicePlayer.play', err)
      setError(true)
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
    <View style={[s.container, error && s.containerError]}>
      <TouchableOpacity style={[s.playBtn, error && s.playBtnError]} onPress={playing ? stop : play}
        accessibilityRole="button" accessibilityLabel={error ? t('common.retry') : playing ? t('a11y.pause') : t('a11y.play')}>
        <Text style={s.playIcon} importantForAccessibility="no">{error ? '!' : playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={s.waveContainer}>
        <View style={s.waveTrack}>
          <View style={[s.waveFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={s.duration}>{durationMs ? formatTime(durationMs) : '—'}</Text>
      </View>
      {onRemove && (
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} accessibilityRole="button" accessibilityLabel={t('a11y.removeVoice')}>
          <Text style={s.removeText} importantForAccessibility="no">×</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    container: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: colors.brandTint, borderRadius: 12, padding: 10,
      borderWidth: 1, borderColor: '#86EFAC',
    },
    containerError: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' },
    playBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: '#059669',
      alignItems: 'center', justifyContent: 'center',
    },
    playBtnError: { backgroundColor: '#DC2626' },
    playIcon: { fontSize: 16, color: colors.onPrimary },
    waveContainer: { flex: 1, gap: 4 },
    waveTrack: {
      height: 6, borderRadius: 3, backgroundColor: colors.successLight, overflow: 'hidden',
    },
    waveFill: {
      height: '100%', borderRadius: 3, backgroundColor: '#059669',
    },
    duration: { fontSize: 11, color: colors.successInk, fontVariant: ['tabular-nums'] },
    removeBtn: {
      width: 28, height: 28, borderRadius: 14, backgroundColor: colors.dangerSoft,
      alignItems: 'center', justifyContent: 'center',
    },
    removeText: { fontSize: 16, color: colors.dangerInk, fontWeight: '700' },
  })
  return { colors, s }
})
