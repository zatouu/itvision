import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRight, LogOut } from 'lucide-react-native'
import { typography, spacing } from '../design'
import { getMode, setMode, isProviderCapable, homeRouteForMode, AppMode } from '../mode'
import { logoutApi } from '../api'
import { clearAuth } from '../auth'
import { clearAllUserData } from '../clear-user-data'
import { hapticSelect, hapticLight } from '../haptics'
import { toast } from '../toast'
import { confirm } from '../confirm'
import LanguagePicker from './LanguagePicker'
import SegmentedControl from './SegmentedControl'
import { useTheme , createThemedStyles } from '../theme'

/**
 * Bas de l'onglet Profil (client et prestataire) : bascule de mode, langue,
 * déconnexion. Remplace l'ancien menu latéral — un seul endroit pour le compte.
 */
export default function AccountSection() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()
  const isProvider = getMode() === 'provider'
  const [switching, setSwitching] = useState(false)

  // La pile de navigation repart de zéro sur l'accueil du nouveau mode : l'accueil de l'ancien
  // mode (cartes, sockets, minuteries) est démonté au lieu de rester en mémoire sous le nouveau.
  const switchMode = async () => {
    if (switching) return
    setSwitching(true)
    const next: AppMode = isProvider ? 'client' : 'provider'
    hapticSelect()
    try {
      await setMode(next)
      if (router.canDismiss()) router.dismissAll()
      router.replace(homeRouteForMode(next) as any)
    } catch {
      setSwitching(false)
      toast.error(t('common.error'), t('account.switchError', { defaultValue: 'Changement de mode impossible, réessayez.' }))
    }
  }

  const logout = async () => {
    const ok = await confirm(t('auth.logout'), t('auth.logoutConfirm'))
    if (!ok) return
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
        <TouchableOpacity style={[s.switchCard, switching && { opacity: 0.7 }]} onPress={switchMode} disabled={switching} activeOpacity={0.8}
          accessibilityRole="button" accessibilityState={{ busy: switching, disabled: switching }}>
          <View style={s.switchIcon}>
            {switching
              ? <ActivityIndicator size="small" color={colors.primaryText} />
              : <ArrowLeftRight size={18} color={colors.primaryText} />}
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
        <Text style={s.cardTitle}>{t('appearance.title')}</Text>
        <SegmentedControl
          value={preference}
          onChange={async value => {
            if (!await setPreference(value)) toast.error(t('appearance.saveError'))
          }}
          segments={[
            { key: 'system', label: t('appearance.system') },
            { key: 'light', label: t('appearance.light') },
            { key: 'dark', label: t('appearance.dark') },
          ]}
        />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{t('profile.language')}</Text>
        <LanguagePicker />
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.75} accessibilityRole="button">
        <LogOut size={17} color={colors.dangerInk} />
        <Text style={s.logoutText}>{t('auth.logout')}</Text>
      </TouchableOpacity>
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    wrap: { gap: spacing.lg, marginTop: spacing.lg },
    switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 14, padding: 14, minHeight: 64 },
    switchIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
    switchTitle: { fontSize: 16, fontWeight: typography.weight.semibold as any, color: colors.ink },
    switchSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16 },
    cardTitle: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 12 },
    logoutBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 14, minHeight: 50 },
    logoutText: { color: colors.dangerInk, fontWeight: typography.weight.semibold as any, fontSize: 16 },
  })
  return { colors, s }
})
