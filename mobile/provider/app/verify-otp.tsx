import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { setAuth } from '../src/auth'
import { resetSocket } from '../src/socket'

const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'
const CODE_LENGTH = 6

export default function VerifyOtp() {
  const { phone, _devCode } = useLocalSearchParams<{ phone: string; _devCode?: string }>()
  const [code, setCode] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [])

  const verify = async () => {
    if (code.length !== CODE_LENGTH) return
    setErr(null)
    setLoading(true)
    try {
      const r = await fetch(`${base}/api/auth/mobile/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, role: 'PROVIDER', referralCode: referralCode || undefined }),
      })
      const data = await r.json()
      if (!r.ok) {
        setErr(data.error || 'Erreur vérification')
        setLoading(false)
        return
      }
      await setAuth(data.token, data.user)
      resetSocket()
      router.replace('/')
    } catch (e: any) {
      setErr('Réseau indisponible')
    }
    setLoading(false)
  }

  const resend = () => {
    router.replace({ pathname: '/login' })
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={s.title}>Vérification</Text>
        <Text style={s.subtitle}>
          Code envoyé au <Text style={s.phoneBold}>{phone}</Text>
        </Text>

        {_devCode ? (
          <View style={s.devBanner}>
            <Text style={s.devText}>🧪 DEV — Code : {_devCode}</Text>
          </View>
        ) : null}

        <View style={s.codeBox}>
          <TextInput
            ref={inputRef}
            style={s.codeInput}
            value={code}
            onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            placeholder="• • • • • •"
            placeholderTextColor="#CBD5E1"
            autoComplete="one-time-code"
          />
        </View>

        {err && <Text style={s.errText}>{err}</Text>}

        <TextInput
          style={s.referralInput}
          value={referralCode}
          onChangeText={t => setReferralCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="Code de parrainage (optionnel)"
          placeholderTextColor="#94A3B8"
          autoCapitalize="characters"
          maxLength={6}
        />

        <TouchableOpacity
          style={[s.btn, (loading || code.length !== CODE_LENGTH) && s.btnDisabled]}
          disabled={loading || code.length !== CODE_LENGTH}
          onPress={verify}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Vérifier</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={resend} style={s.resendBtn}>
          <Text style={s.resendText}>Renvoyer un code</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, padding: 24, paddingTop: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  backIcon: { fontSize: 20, color: '#111827' },
  title: { fontSize: 26, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', marginBottom: 24, lineHeight: 22 },
  phoneBold: { fontWeight: '700', color: '#0F172A' },
  devBanner: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 20 },
  devText: { fontSize: 14, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  codeBox: { marginBottom: 24 },
  codeInput: {
    borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 16, padding: 20,
    fontSize: 32, fontWeight: '800', color: '#0F172A', textAlign: 'center',
    letterSpacing: 12, backgroundColor: '#fff',
  },
  errText: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  btn: { backgroundColor: '#F59E0B', borderRadius: 12, padding: 17, alignItems: 'center' },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  referralInput: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14,
    fontSize: 15, fontWeight: '600', color: '#0F172A', textAlign: 'center',
    backgroundColor: '#fff', letterSpacing: 4, marginBottom: 16,
  },
  resendBtn: { alignItems: 'center', marginTop: 20 },
  resendText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
})
