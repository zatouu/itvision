import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { getAuthUser, updateAuthUser } from '../src/auth'
import { apiPatch } from '../src/api'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSuccess, hapticError } from '../src/haptics'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { User, Phone, Check } from 'lucide-react-native'

export default function SetupProfile() {
  const { t } = useTranslation()
  const user = getAuthUser()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState(user?.phone || '')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setErr(t('setup.nameRequired'))
      hapticError()
      return
    }
    setErr(null)
    setLoading(true)
    try {
      const body: Record<string, string> = { name: trimmedName }
      if (phone.trim()) body.phone = phone.trim()
      await apiPatch('/api/users/me', body)
      await updateAuthUser({ name: trimmedName, phone: phone.trim(), isNew: false })
      hapticSuccess()
      router.replace('/')
    } catch (e: any) {
      hapticError()
      setErr(humanErrorMessage(e))
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.iconWrap}>
          <User size={32} color={colors.primary} />
        </View>
        <Text style={s.title}>{t('setup.title')}</Text>
        <Text style={s.subtitle}>{t('setup.subtitle')}</Text>

        <View style={s.field}>
          <Text style={s.label}>{t('setup.nameLabel')}</Text>
          <View style={s.inputRow}>
            <User size={18} color={colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder={t('setup.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              maxLength={100}
              autoFocus
            />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>{t('setup.phoneLabel')}</Text>
          <View style={s.inputRow}>
            <Phone size={18} color={colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('setup.phonePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={20}
            />
          </View>
        </View>

        {err && <Text style={s.errText}>{err}</Text>}

        <TouchableOpacity
          style={[s.btn, (loading || !name.trim()) && s.btnDisabled]}
          disabled={loading || !name.trim()}
          onPress={submit}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={s.btnContent}>
              <Check size={18} color="#fff" />
              <Text style={s.btnText}>{t('setup.save')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 24, paddingTop: 40 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20, ...shadows.sm },
  title: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.text, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  errText: { fontSize: 13, color: colors.danger, marginBottom: 12, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8, ...shadows.md },
  btnDisabled: { opacity: 0.4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: typography.weight.bold as any },
})
