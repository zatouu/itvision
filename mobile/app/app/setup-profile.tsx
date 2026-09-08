import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { getAuthUser, updateAuthUser } from '../src/auth'
import { loadMode, homeRouteForMode } from '../src/mode'
import { apiPatch } from '../src/api'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSuccess, hapticError } from '../src/haptics'
import { colors, spacing, radius, typography, shadows } from '../src/design'
import { User, Phone, Check, Camera } from 'lucide-react-native'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

function SetupProfile() {
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
      router.replace(homeRouteForMode(await loadMode()) as any)
    } catch (e: any) {
      hapticError()
      setErr(humanErrorMessage(e))
    }
    setLoading(false)
  }

  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={s.title}>
          {t('setup.title')}
          <Text style={{ color: colors.primary }}>{t('setup.titleAccent', { defaultValue: ' Faisons connaissance.' })}</Text>
        </Text>
        <Text style={s.subtitle}>{t('setup.subtitle')}</Text>

        {/* Avatar initiales */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            {initials ? <Text style={s.avatarText}>{initials}</Text> : <User size={40} color="#fff" />}
          </View>
          <View style={s.avatarBadge}><Camera size={15} color="#fff" /></View>
        </View>

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

        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[s.btn, (loading || !name.trim()) && s.btnDisabled]}
          disabled={loading || !name.trim()}
          onPress={submit}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <View style={s.btnContent}>
              <Check size={18} color="#fff" />
              <Text style={s.btnText}>{t('setup.finish', { defaultValue: 'Terminer et découvrir' })}</Text>
            </View>
          )}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 22, paddingTop: 24 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.5, lineHeight: 31 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 8, lineHeight: 20 },
  avatarWrap: { alignSelf: 'center', marginVertical: 28, position: 'relative' },
  avatar: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.hero },
  avatarText: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, paddingHorizontal: 14 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.text },
  errText: { fontSize: 13, color: colors.danger, marginBottom: 12, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 15, minHeight: 52, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  btnDisabled: { opacity: 0.4 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})

export default withScreenBoundary(SetupProfile, 'SetupProfile')

