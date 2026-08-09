import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiPost } from '../src/api'
import { hapticSelect, hapticError } from '../src/haptics'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { ArrowRight, Phone, ShieldCheck } from 'lucide-react-native'
import Button from '../src/components/Button'

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
      hapticError()
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/api/auth/mobile/send-otp', { phone: cleaned, role: 'CLIENT' })
      hapticSelect()
      router.push({ pathname: '/verify-otp', params: { phone: data.phone, _devCode: data._devCode || '' } })
    } catch (e: any) {
      setErr(e.message || t('auth.errorOtp'))
      hapticError()
    }
    setLoading(false)
  }

  const canSubmit = phone.replace(/\s/g, '').length >= 9

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
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={15}
              autoFocus
            />
          </View>
          <Text style={s.hint}>{t('auth.hint')}</Text>

          {err && <Text style={s.errText}>{err}</Text>}

          <Button
            title={t('auth.sendCode')}
            onPress={sendOtp}
            loading={loading}
            disabled={!canSubmit}
            icon={<ArrowRight size={18} color={colors.surface} />}
            fullWidth
          />
        </View>

        <View style={s.trust}>
          <ShieldCheck size={14} color={colors.textMuted} />
          <Text style={s.legal}>{t('auth.legal')}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', padding: spacing.xxl },
  top: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadows.md },
  logoText: { fontSize: 32, fontWeight: typography.weight.extrabold as any, color: colors.warning },
  title: { fontSize: 28, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  form: { gap: spacing.lg },
  label: { fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  prefix: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 16, justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border },
  prefixText: { fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text },
  phoneInput: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 16, fontSize: 18, fontWeight: typography.weight.semibold as any, color: colors.text, backgroundColor: colors.surface, letterSpacing: 1 },
  hint: { fontSize: 12, color: colors.textMuted },
  errText: { fontSize: 13, color: colors.danger, textAlign: 'center', fontWeight: typography.weight.semibold as any },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 },
  legal: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 16, flex: 1 },
})
