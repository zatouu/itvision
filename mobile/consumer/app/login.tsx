import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

const base = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export default function Login() {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const sendOtp = async () => {
    setErr(null)
    const cleaned = phone.replace(/[\s\-().]/g, '')
    if (cleaned.length < 9) {
      setErr(t('auth.errorPhone'))
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`${base}/api/auth/mobile/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, role: 'CLIENT' }),
      })
      const data = await r.json()
      if (!r.ok) {
        setErr(data.error || t('auth.errorOtp'))
        setLoading(false)
        return
      }
      router.push({ pathname: '/verify-otp', params: { phone: data.phone, _devCode: data._devCode || '' } })
    } catch (e: any) {
      setErr(t('auth.errorNetwork'))
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.top}>
          <View style={s.logo}>
            <Text style={s.logoText}>X</Text>
          </View>
          <Text style={s.title}>Xeuy Bi</Text>
          <Text style={s.subtitle}>{t('auth.loginSub')}</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>{t('auth.phoneLabel')}</Text>
          <View style={s.phoneRow}>
            <View style={s.prefix}>
              <Text style={s.prefixText}>+221</Text>
            </View>
            <TextInput
              style={s.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={15}
              autoFocus
            />
          </View>
          <Text style={s.hint}>{t('auth.hint')}</Text>

          {err && <Text style={s.errText}>{err}</Text>}

          <TouchableOpacity
            style={[s.btn, (loading || phone.replace(/\s/g, '').length < 9) && s.btnDisabled]}
            disabled={loading || phone.replace(/\s/g, '').length < 9}
            onPress={sendOtp}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{t('auth.sendCode')}</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.legal}>
          {t('auth.legal')}
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  top: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: '800', color: '#F59E0B' },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  form: { gap: 16 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneRow: { flexDirection: 'row', gap: 10 },
  prefix: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16, justifyContent: 'center', borderWidth: 1.5, borderColor: '#E2E8F0' },
  prefixText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  phoneInput: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, fontSize: 18, fontWeight: '600', color: '#0F172A', backgroundColor: '#fff', letterSpacing: 1 },
  hint: { fontSize: 12, color: '#9CA3AF' },
  errText: { fontSize: 13, color: '#DC2626', textAlign: 'center' },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  legal: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 32, lineHeight: 16 },
})
