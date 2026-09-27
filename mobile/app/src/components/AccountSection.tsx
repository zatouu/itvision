import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, LogOut } from 'lucide-react-native'
import { colors, typography, spacing } from '../design'
import { getMode, setMode, isProviderCapable, homeRouteForMode, AppMode } from '../mode'
import { logoutApi } from '../api'
import { clearAuth } from '../auth'
import { clearAllUserData } from '../clear-user-data'
import { hapticSelect, hapticLight } from '../haptics'
import { toast } from '../toast'
import LanguagePicker from './LanguagePicker'

/**
 * Bas de l'onglet Profil (client et prestataire) : bascule de mode, langue,
 * déconnexion. Remplace l'ancien menu latéral — un seul endroit pour le compte.
 */
export default function AccountSection() {
  const { t } = useTranslation()
  const isProvider = getMode() === 'provider'

  const switchMode = async () => {
    const next: AppMode = isProvider ? 'client' : 'provider'
    hapticSelect()
    await setMode(next)
    router.replace(homeRouteForMode(next) as any)
  }

  const logout = async () => {
    hapticLight()
    await logoutApi()
    await clearAuth()
    await clearAllUserData()
    toast.info(t('auth.logout'), t('auth.logoutMsg', { defaultValue: 'Vous êtes déconnecté.' }))
    router.replace('/login')
  }

  return (
    <View style={s.wrap}>
      {isProviderCapable() && (
        <TouchableOpacity style={s.switchCard} onPress={switchMode} activeOpacity={0.8} accessibilityRole="button">
          <View style={s.switchIcon}>
            <ArrowLeftRight size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>
              {isProvider
                ? t('account.switchToClient', { defaultValue: 'Passer en mode client' })
                : t('account.switchToProvider', { defaultValue: 'Passer en mode prestataire' })}
            </Text>
            <Text style={s.switchSub}>
              {isProvider
                ? t('account.switchToClientSub', { defaultValue: 'Demander un service pour vous-même' })
                : t('account.switchToProviderSub', { defaultValue: 'Recevoir des demandes et envoyer des offres' })}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={s.card}>
        <Text style={s.cardTitle}>{t('profile.language')}</Text>
        <LanguagePicker />
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.75} accessibilityRole="button">
        <LogOut size={17} color="#B91C1C" />
        <Text style={s.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md, marginTop: spacing.md },
  switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  switchIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  switchTitle: { fontSize: 15, fontWeight: typography.weight.bold as any, color: colors.text },
  switchSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text, marginBottom: 12 },
  logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { color: '#B91C1C', fontWeight: typography.weight.bold as any, fontSize: 15 },
})
