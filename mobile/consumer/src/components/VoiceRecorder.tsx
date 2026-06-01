import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native'
import { Audio } from 'expo-av'

export interface VoiceRecording {
  uri: string
  durationMs: number
}

type Props = {
  onRecorded: (rec: VoiceRecording) => void
  maxDurationSec?: number
}

export default function VoiceRecorder({ onRecorded, maxDurationSec = 60 }: Props) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const pulse = useRef(new Animated.Value(1)).current
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start()
    } else {
      pulse.setValue(1)
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez le microphone pour enregistrer un message vocal.')
        return
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      setRecording(rec)
      recordingRef.current = rec
      setIsRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= maxDurationSec) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('[VoiceRecorder] start error:', err)
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.')
    }
  }

  const stopRecording = async () => {
    const rec = recordingRef.current
    if (!rec) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    try {
      await rec.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = rec.getURI()
      const status = await rec.getStatusAsync()
      setRecording(null)
      recordingRef.current = null
      if (uri && status.durationMillis && status.durationMillis > 500) {
        onRecorded({ uri, durationMs: status.durationMillis })
      }
    } catch (err) {
      console.error('[VoiceRecorder] stop error:', err)
      setRecording(null)
      recordingRef.current = null
    }
  }

  const cancelRecording = async () => {
    const rec = recordingRef.current
    if (!rec) return
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    try {
      await rec.stopAndUnloadAsync()
    } catch { /* ignore */ }
    setRecording(null)
    recordingRef.current = null
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <View style={s.container}>
      {isRecording ? (
        <View style={s.recordingRow}>
          <Animated.View style={[s.redDot, { transform: [{ scale: pulse }] }]} />
          <Text style={s.timer}>{formatTime(elapsed)}</Text>
          <Text style={s.hint}>Enregistrement en cours…</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={cancelRecording}>
              <Text style={s.cancelText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stopBtn} onPress={stopRecording}>
              <Text style={s.stopText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.startBtn} onPress={startRecording}>
          <Text style={s.micIcon}>🎙</Text>
          <Text style={s.startText}>Message vocal (Wolof, Français…)</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { marginVertical: 4 },
  startBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#F59E0B', borderStyle: 'dashed',
  },
  micIcon: { fontSize: 22 },
  startText: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  recordingRow: {
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14,
    gap: 8, alignItems: 'center',
  },
  redDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: '#DC2626',
  },
  timer: { fontSize: 24, fontWeight: '700', color: '#DC2626', fontVariant: ['tabular-nums'] },
  hint: { fontSize: 12, color: '#991B1B' },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  cancelBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FCA5A5',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { fontSize: 18, color: '#7F1D1D', fontWeight: '700' },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669',
    alignItems: 'center', justifyContent: 'center',
  },
  stopText: { fontSize: 18, color: '#fff', fontWeight: '700' },
})
