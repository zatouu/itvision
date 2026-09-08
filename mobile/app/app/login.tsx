import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { apiPost } from '../src/api'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticSelect, hapticError } from '../src/haptics'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { ArrowRight, ShieldCheck, Handshake, Star, Wrench } from 'lucide-react-native'
import Button from '../src/components/Button'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

function Login() {
  const { t, i18n } = useTranslation()
  const [phone, setPhone] = useState('')
  const [asProvider, setAsProvider] = useState(false)
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
      const role = asProvider ? 'PROVIDER' : 'CLIENT'
      const data = await apiPost('/api/auth/mobile/send-otp', { phone: cleaned, role })
      hapticSelect()
      router.push({ pathname: '/verify-otp', params: { phone: data.phone, _devCode: data._devCode || '', role } })
    } catch (e: any) {
      setErr(humanErrorMessage(e))
      hapticError()
    }
    setLoading(false)
  }

  const canSubmit = phone.replace(/\s/g, '').length >= 9

  const LANGS = [
    { code: 'fr', label: 'Français' },
    { code: 'wo', label: 'Wolof' },
    { code: 'en', label: 'English' },
  ]

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Hero marque */}
        <View style={s.hero}>
          <View style={s.heroCircle1} />
          <View style={s.heroCircle2} />
          <View style={s.heroBrand}>
            <View style={s.logoMini}><Text style={s.logoMiniText}>X</Text></View>
            <Text style={s.heroBrandName}>Xeuy Bi</Text>
          </View>
          <Text style={s.heroTitle}>
            {t('auth.heroTitle', { defaultValue: 'Un professionnel\nen moins de 15 minutes' })}
          </Text>
          <Text style={s.heroSub}>{t('auth.loginSub')}</Text>
        </View>

        {/* Formulaire */}
        <View style={s.form}>
          <Text style={s.label}>{t('auth.phoneLabel')}</Text>
          <View style={s.phoneRow}>
            <View style={s.prefix}>
              <Text style={s.prefixText}>🇸🇳 +221</Text>
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

          {/* Choix inscription prestataire (ignoré pour les comptes existants) */}
          <TouchableOpacity
            style={[s.providerToggle, asProvider && s.providerToggleActive]}
            onPress={() => { hapticSelect(); setAsProvider(v => !v) }}
            activeOpacity={0.7}
          >
            <Wrench size={15} color={asProvider ? '#fff' : colors.primary} />
            <Text style={[s.providerToggleText, asProvider && s.providerToggleTextActive]}>
              {t('auth.iAmProvider', { defaultValue: 'Je suis un prestataire' })}
            </Text>
          </TouchableOpacity>

          <View style={{ marginTop: 4 }}>
            <Button
              title={t('auth.sendCode')}
              onPress={sendOtp}
              loading={loading}
              disabled={!canSubmit}
              icon={<ArrowRight size={18} color={colors.surface} />}
              fullWidth
            />
          </View>

          {/* Garanties */}
          <View style={s.trustCard}>
            {[
              { Icon: ShieldCheck, color: colors.primary, title: t('auth.trustVerified', { defaultValue: 'Prestataires vérifiés' }), desc: t('auth.trustVerifiedSub', { defaultValue: "Pièce d'identité et références contrôlées" }) },
              { Icon: Handshake, color: colors.info, title: t('auth.trustCash', { defaultValue: 'Paiement à la livraison' }), desc: t('auth.trustCashSub', { defaultValue: 'Vous payez en espèces après validation du travail' }) },
              { Icon: Star, color: colors.warning, title: t('auth.trustRated', { defaultValue: 'Notés par la communauté' }), desc: t('auth.trustRatedSub', { defaultValue: 'Les clients de Dakar nous font confiance' }) },
            ].map((item, i) => (
              <View key={i} style={s.trustRow}>
                <View style={[s.trustIcon, { backgroundColor: `${item.color}15` }]}>
                  <item.Icon size={18} color={item.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.trustTitle}>{item.title}</Text>
                  <Text style={s.trustDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Langues + légal */}
          <View style={s.langRow}>
            {LANGS.map(l => {
              const active = (i18n.language || 'fr').startsWith(l.code)
              return (
                <TouchableOpacity
                  key={l.code}
                  onPress={() => i18n.changeLanguage(l.code)}
                  style={[s.langChip, active && s.langChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.langText, active && s.langTextActive]}>{l.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={s.legal}>{t('auth.legal')}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, overflow: 'hidden' },
  heroCircle1: { position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroCircle2: { position: 'absolute', top: 40, right: 80, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22 },
  logoMini: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  logoMiniText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  heroBrandName: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, lineHeight: 32 },
  heroSub: { fontSize: 13.5, color: 'rgba(255,255,255,0.9)', marginTop: 8, lineHeight: 20 },
  form: { flex: 1, paddingHorizontal: 22, paddingTop: 24 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  prefix: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  prefixText: { fontSize: 15, fontWeight: '700', color: colors.text },
  phoneInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontWeight: '600', color: colors.text, backgroundColor: colors.surface, letterSpacing: 1 },
  hint: { fontSize: 11.5, color: colors.textMuted, marginTop: 8 },
  errText: { fontSize: 13, color: colors.danger, textAlign: 'center', fontWeight: '600', marginTop: 8 },
  providerToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, marginBottom: 10, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  providerToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  providerToggleText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  providerToggleTextActive: { color: '#fff' },
  trustCard: { marginTop: 24, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, padding: 14, gap: 12 },
  trustRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  trustIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trustTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  trustDesc: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
  langRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 24 },
  langChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  langChipActive: { borderWidth: 1, borderColor: colors.border },
  langText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  langTextActive: { color: colors.ink },
  legal: { fontSize: 10.5, color: colors.textDim, textAlign: 'center', lineHeight: 15, marginTop: 10 },
})

export default withScreenBoundary(Login, 'Login')

