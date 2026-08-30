import { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { setAuth } from '../src/auth'
import { resetSocket } from '../src/socket'
import { apiPost } from '../src/api'
import { humanErrorMessage } from '../src/errorMessages'
import * as Constants from 'expo-constants'
import * as Device from 'expo-device'
import { ArrowLeft, FlaskConical, ShieldCheck } from 'lucide-react-native'
import { hapticSuccess, hapticError, hapticSelect } from '../src/haptics'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import Button from '../src/components/Button'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const CODE_LENGTH = 6

function VerifyOtp() {
  const { t } = useTranslation()
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
      const deviceId = Device.osBuildId || Device.modelName || Constants.default?.expoConfig?.slug || 'unknown-device'
      const data = await apiPost('/api/auth/mobile/verify-otp', { phone, code, role: 'CLIENT', referralCode: referralCode || undefined, deviceId })
      await setAuth(data.accessToken || data.token, data.user, data.refreshToken, deviceId)
      resetSocket()
      hapticSuccess()
      router.replace(data.user?.isNew ? '/setup-profile' : '/')
    } catch (e: any) {
      hapticError()
      console.error('[verify-otp] Erreur:', e)
      setErr(humanErrorMessage(e))
    }
    setLoading(false)
  }

  const resend = () => {
    router.replace({ pathname: '/login' })
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.6}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={s.title}>{t('auth.verifyTitle')}</Text>
        <Text style={s.subtitle}>
          {t('auth.verifySubPre')}<Text style={s.phoneBold}>{phone}</Text>
        </Text>

        {_devCode ? (
          <View style={s.devBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FlaskConical size={16} color={colors.warning} />
              <Text style={s.devText}>{t('auth.devCode')}: {_devCode}</Text>
            </View>
          </View>
        ) : null}

        <View style={s.codeBox}>
          <TextInput
            ref={inputRef}
            style={s.codeInput}
            value={code}
            onChangeText={txt => { setCode(txt.replace(/\D/g, '').slice(0, CODE_LENGTH)); if (txt.length === CODE_LENGTH) hapticSelect() }}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            placeholder={t('auth.codePlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoComplete="one-time-code"
          />
        </View>

        {err && <Text style={s.errText}>{err}</Text>}

        <TextInput
          style={s.referralInput}
          value={referralCode}
          onChangeText={txt => setReferralCode(txt.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder={t('auth.referralPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={6}
        />

        <Button
          title={t('auth.verify')}
          onPress={verify}
          loading={loading}
          disabled={code.length !== CODE_LENGTH}
          fullWidth
        />

        <TouchableOpacity onPress={resend} style={s.resendBtn} activeOpacity={0.6}>
          <Text style={s.resendText}>{t('auth.resend')}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: spacing.xxl, paddingTop: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl, ...shadows.sm },
  backIcon: { color: colors.text },
  title: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xxl, lineHeight: 22 },
  phoneBold: { fontWeight: typography.weight.bold as any, color: colors.text },
  devBanner: { backgroundColor: colors.warningLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl },
  devText: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.warning, textAlign: 'center' },
  codeBox: { marginBottom: spacing.xxl },
  codeInput: {
    borderWidth: 2, borderColor: colors.border, borderRadius: radius.lg, padding: 20,
    fontSize: 32, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center',
    letterSpacing: 12, backgroundColor: colors.surface, ...shadows.sm,
  },
  errText: { fontSize: 13, color: colors.danger, textAlign: 'center', marginBottom: spacing.md, fontWeight: typography.weight.semibold as any },
  btn: { backgroundColor: colors.navy, borderRadius: radius.md, paddingVertical: 17, alignItems: 'center', ...shadows.sm },
  btnDisabled: { opacity: 0.35 },
  btnText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
  referralInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 14,
    fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center',
    backgroundColor: colors.surface, letterSpacing: 4, marginBottom: spacing.lg,
  },
  resendBtn: { alignItems: 'center', marginTop: spacing.xl },
  resendText: { fontSize: 14, color: colors.info, fontWeight: typography.weight.semibold as any },
})

export default withScreenBoundary(VerifyOtp, 'VerifyOtp')

