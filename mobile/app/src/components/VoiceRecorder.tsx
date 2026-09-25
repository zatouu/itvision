import { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, Easing } from 'react-native'
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio'
import { Mic, Square, X } from 'lucide-react-native'
import { colors, radius, spacing, typography } from '../design'

export interface VoiceRecording {
  uri: string
  durationMs: number
}

type Props = {
  onRecorded: (rec: VoiceRecording) => void
  maxDurationSec?: number
  /** 'inline' = rangée compacte (défaut) · 'orb' = gros bouton central façon assistant vocal */
  variant?: 'inline' | 'orb'
}

const BAR_COUNT = 7

export default function VoiceRecorder({ onRecorded, maxDurationSec = 60, variant = 'inline' }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recordingActiveRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const pulse = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Anneaux halo (variante orb) + barres de waveform
  const halo = useRef(new Animated.Value(0)).current
  const bars = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.25))).current
  const barAnims = useRef<Animated.CompositeAnimation[]>([])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pulseLoop.current) { pulseLoop.current.stop(); pulseLoop.current = null }
      barAnims.current.forEach(a => a.stop())
      pulse.stopAnimation()
      halo.stopAnimation()
      if (recordingActiveRef.current) {
        recordingActiveRef.current = false
        recorder.stop().catch(() => {})
      }
    }
  }, [])

  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      )
      pulseLoop.current.start()

      // Halo qui s'étend en boucle (variante orb)
      if (variant === 'orb') {
        Animated.loop(
          Animated.timing(halo, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
        ).start()
        // Waveform : barres animées en décalé
        barAnims.current = bars.map((bar, i) => {
          const anim = Animated.loop(
            Animated.sequence([
              Animated.timing(bar, { toValue: 0.5 + Math.random() * 0.5, duration: 220 + i * 40, useNativeDriver: false }),
              Animated.timing(bar, { toValue: 0.15 + Math.random() * 0.2, duration: 220 + i * 40, useNativeDriver: false }),
            ])
          )
          anim.start()
          return anim
        })
      }
    } else {
      if (pulseLoop.current) { pulseLoop.current.stop(); pulseLoop.current = null }
      pulse.setValue(1)
      halo.stopAnimation()
      halo.setValue(0)
      barAnims.current.forEach(a => a.stop())
      barAnims.current = []
      bars.forEach(b => b.setValue(0.25))
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Permission requise', 'Autorisez le microphone pour enregistrer un message vocal.')
        return
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      })
      await recorder.prepareToRecordAsync()
      recorder.record()
      recordingActiveRef.current = true
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
    if (!recordingActiveRef.current) return
    recordingActiveRef.current = false
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    try {
      // Capturer la durée AVANT stop() — currentTime est remis à zéro après.
      const durationMs = Math.round((recorder.currentTime || 0) * 1000)
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      const uri = recorder.uri
      if (uri && durationMs > 500) {
        onRecorded({ uri, durationMs })
      }
    } catch (err) {
      console.error('[VoiceRecorder] stop error:', err)
    }
  }

  const cancelRecording = async () => {
    if (!recordingActiveRef.current) return
    recordingActiveRef.current = false
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    try {
      await recorder.stop()
    } catch { /* ignore */ }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // ── Variante ORB : gros bouton mic central, halo pulsant, waveform ──────
  if (variant === 'orb') {
    const haloScale = halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] })
    const haloOpacity = halo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] })
    return (
      <View style={s.orbWrap}>
        <View style={s.orbStage}>
          <Animated.View style={[s.orbHalo, { transform: [{ scale: haloScale }], opacity: haloOpacity }]} />
          <TouchableOpacity
            style={[s.orbBtn, isRecording && s.orbBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? 'Terminer l\'enregistrement' : 'Enregistrer un message vocal'}
          >
            {isRecording ? (
              <Square size={26} color="#fff" fill="#fff" />
            ) : (
              <Mic size={30} color="#fff" strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>

        {isRecording ? (
          <View style={s.orbRecRow}>
            <View style={s.waveRow}>
              {bars.map((bar, i) => (
                <Animated.View
                  key={i}
                  style={[s.waveBar, { transform: [{ scaleY: bar }] }]}
                />
              ))}
            </View>
            <Text style={s.orbTimer}>{formatTime(elapsed)}</Text>
            <TouchableOpacity
              style={s.orbCancel}
              onPress={cancelRecording}
              accessibilityRole="button"
              accessibilityLabel="Annuler l'enregistrement"
            >
              <X size={16} color={colors.dangerInk} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={s.orbHint}>Appuyer pour parler (Wolof, Français…)</Text>
        )}
      </View>
    )
  }

  // ── Variante INLINE (existante) ────────────────────────────────────────
  return (
    <View style={s.container}>
      {isRecording ? (
        <View style={s.recordingRow}>
          <Animated.View style={[s.redDot, { transform: [{ scale: pulse }] }]} />
          <Text style={s.timer}>{formatTime(elapsed)}</Text>
          <Text style={s.hint}>Enregistrement en cours…</Text>
          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={cancelRecording} accessibilityRole="button" accessibilityLabel="Annuler l'enregistrement">
              <Text style={s.cancelText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stopBtn} onPress={stopRecording} accessibilityRole="button" accessibilityLabel="Terminer l'enregistrement">
              <Text style={s.stopText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.startBtn} onPress={startRecording} accessibilityRole="button" accessibilityLabel="Enregistrer un message vocal">
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
    backgroundColor: '#E6F4EC', borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: '#0F7B4F', borderStyle: 'dashed',
  },
  micIcon: { fontSize: 22 },
  startText: { fontSize: 14, fontWeight: '600', color: '#065F3A' },
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

  // ── Variante orb ────────────────────────────────────────────────────────
  orbWrap: { alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  orbStage: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
  orbHalo: {
    position: 'absolute', width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.primary,
  },
  orbBtn: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: colors.brandSoft,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 8,
  },
  orbBtnActive: { backgroundColor: colors.danger, borderColor: colors.dangerLight, shadowColor: colors.danger },
  orbHint: { fontSize: 13, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  orbRecRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28 },
  waveBar: { width: 4, height: 24, borderRadius: 2, backgroundColor: colors.primary },
  orbTimer: { fontSize: 16, fontWeight: typography.weight.bold as any, color: colors.text, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'center' },
  orbCancel: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.dangerLight,
    alignItems: 'center', justifyContent: 'center',
  },
})
