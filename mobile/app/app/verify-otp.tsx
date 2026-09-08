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
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('auth.verification', { defaultValue: 'Vérification' })}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={s.title}>{t('auth.verifyTitle')}</Text>
        <Text style={s.subtitle}>
          {t('auth.verifySubPre')}<Text style={s.phoneBold}>{phone}</Text>
          {' · '}
          <Text style={s.modifyLink} onPress={() => router.back()}>{t('auth.modify', { defaultValue: 'Modifier' })}</Text>
        </Text>

        {_devCode ? (
          <View style={s.devBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FlaskConical size={16} color={colors.warning} />
              <Text style={s.devText}>{t('auth.devCode')}: {_devCode}</Text>
            </View>
          </View>
        ) : null}

        {/* Cellules du code */}
        <TouchableOpacity style={s.cells} activeOpacity={1} onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const filled = i < code.length
            const active = i === code.length
            return (
              <View key={i} style={[s.cell, filled && s.cellFilled, active && s.cellActive]}>
                <Text style={s.cellText}>{code[i] || ''}</Text>
              </View>
            )
          })}
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={s.hiddenInput}
          value={code}
          onChangeText={txt => { setCode(txt.replace(/\D/g, '').slice(0, CODE_LENGTH)); if (txt.length === CODE_LENGTH) hapticSelect() }}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoComplete="one-time-code"
          autoFocus
        />

        {err && <Text style={s.errText}>{err}</Text>}

        {/* Code parrainage */}
        <TextInput
          style={s.referralInput}
          value={referralCode}
          onChangeText={txt => setReferralCode(txt.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder={t('auth.referralPlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={6}
        />

        {/* Renvoi */}
        <View style={s.resendRow}>
          <Text style={s.resendLabel}>{t('auth.notReceived', { defaultValue: "Vous n'avez rien reçu ?" })}</Text>
          <TouchableOpacity onPress={resend} activeOpacity={0.7}>
            <Text style={s.resendText}>{t('auth.resend')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />
        <Button
          title={t('auth.verify')}
          onPress={verify}
          loading={loading}
          disabled={code.length !== CODE_LENGTH}
          fullWidth
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 22, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, marginTop: 10, lineHeight: 30 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  phoneBold: { fontWeight: '700', color: colors.ink },
  modifyLink: { color: colors.primary, fontWeight: '700' },
  devBanner: { backgroundColor: colors.warningLight, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  devText: { fontSize: 14, fontWeight: '700', color: colors.warning, textAlign: 'center' },
  cells: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 32 },
  cell: { width: 46, height: 56, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cellFilled: { backgroundColor: colors.brandSoft, borderColor: colors.primary },
  cellActive: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  cellText: { fontSize: 24, fontWeight: '800', color: colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  errText: { fontSize: 13, color: colors.danger, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },
  referralInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 13,
    fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'center',
    backgroundColor: colors.surface, letterSpacing: 4, marginTop: 26,
  },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 22 },
  resendLabel: { fontSize: 13, color: colors.textMuted },
  resendText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
})

export default withScreenBoundary(VerifyOtp, 'VerifyOtp')

