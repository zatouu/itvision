import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, ActivityIndicator, Platform } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import * as FileSystem from 'expo-file-system'
import { apiGet, apiPatch, apiPost, logoutApi } from '../src/api'
import { clearAuth } from '../src/auth'
import { clearAllUserData } from '../src/clear-user-data'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import AppHeader from '../src/components/AppHeader'
import { confirm } from '../src/confirm'
import { toast } from '../src/toast'
import { humanErrorMessage } from '../src/errorMessages'
import { hapticLight, hapticWarning } from '../src/haptics'
import {
  UserCircle, MapPin, MessageSquare, Download, Trash2, ShieldCheck, ChevronRight,
} from 'lucide-react-native'
import { colors, spacing, radius, typography, fonts, shadows } from '../src/design'

type PrivacyPrefs = {
  profilePublic: boolean
  preciseLocation: boolean
  smsNotifications: boolean
}

const DEFAULT_PREFS: PrivacyPrefs = { profilePublic: true, preciseLocation: true, smsNotifications: false }

function Privacy() {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PREFS)
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    apiGet('/api/services/privacy')
      .then(r => { if (r?.privacy) setPrefs({ ...DEFAULT_PREFS, ...r.privacy }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = async (key: keyof PrivacyPrefs, value: boolean) => {
    const prev = prefs[key]
    setPrefs(p => ({ ...p, [key]: value }))
    setSavingKey(key)
    hapticLight()
    try {
      await apiPatch('/api/services/privacy', { [key]: value })
    } catch (e: any) {
      setPrefs(p => ({ ...p, [key]: prev }))
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setSavingKey(null)
    }
  }

  const exportData = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const data = await apiGet('/api/services/privacy/export')
      const json = JSON.stringify(data, null, 2)
      const filename = `xeuy-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`

      if (Platform.OS === 'web') {
        // Web : déclenche un téléchargement via blob
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const uri = `${FileSystem.cacheDirectory}${filename}`
        await FileSystem.writeAsStringAsync(uri, json)
        try {
          const Sharing = require('expo-sharing') as typeof import('expo-sharing')
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: t('privacy.exportData') })
          } else {
            toast.success(t('privacy.exportDone'), uri)
          }
        } catch {
          toast.success(t('privacy.exportDone'), filename)
        }
      }
    } catch (e: any) {
      toast.error(t('common.error'), humanErrorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (deleting) return
    hapticWarning()
    const ok1 = await confirm(
      t('privacy.deleteConfirmTitle'),
      t('privacy.deleteConfirmMsg')
    )
    if (!ok1) return
    const ok2 = await confirm(
      t('privacy.deleteConfirmTitle2'),
      t('privacy.deleteConfirmMsg2')
    )
    if (!ok2) return

    setDeleting(true)
    try {
      await apiPost('/api/services/privacy/delete-account', { confirm: true })
      await logoutApi()
      await clearAuth()
      await clearAllUserData()
      toast.info(t('privacy.deleteDone'), '')
      router.replace('/login')
    } catch (e: any) {
      // Bloquants métier (mission en cours, escrow, wallet) — message serveur explicite
      toast.error(t('privacy.deleteBlockedTitle'), humanErrorMessage(e))
      setDeleting(false)
    }
  }

  const ToggleRow = ({ icon: Icon, label, hint, prefKey, danger }: {
    icon: any; label: string; hint: string; prefKey: keyof PrivacyPrefs; danger?: boolean
  }) => (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Icon size={18} color={colors.textSecondary} />
      </View>
      <View style={s.rowText}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowHint}>{hint}</Text>
      </View>
      {savingKey === prefKey ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={prefs[prefKey]}
          onValueChange={(v) => toggle(prefKey, v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
          ios_backgroundColor={colors.border}
          disabled={loading}
        />
      )}
    </View>
  )

  return (
    <SafeAreaView style={s.safe}>
      <AppHeader title={t('privacy.title')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Toggles */}
        <View style={s.card}>
          <ToggleRow
            icon={UserCircle}
            label={t('privacy.profilePublic')}
            hint={t('privacy.profilePublicHint')}
            prefKey="profilePublic"
          />
          <View style={s.sep} />
          <ToggleRow
            icon={MapPin}
            label={t('privacy.preciseLocation')}
            hint={t('privacy.preciseLocationHint')}
            prefKey="preciseLocation"
          />
          <View style={s.sep} />
          <ToggleRow
            icon={MessageSquare}
            label={t('privacy.smsNotifs')}
            hint={t('privacy.smsNotifsHint')}
            prefKey="smsNotifications"
          />
        </View>

        {/* Portabilité */}
        <TouchableOpacity style={s.actionRow} onPress={exportData} activeOpacity={0.75} disabled={exporting}>
          <View style={s.rowIcon}>
            <Download size={18} color={colors.textSecondary} />
          </View>
          <View style={s.rowText}>
            <Text style={s.rowLabel}>{t('privacy.exportData')}</Text>
            <Text style={s.rowHint}>{t('privacy.exportDataHint')}</Text>
          </View>
          {exporting
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <ChevronRight size={18} color={colors.textMuted} />}
        </TouchableOpacity>

        {/* Suppression */}
        <TouchableOpacity
          style={[s.actionRow, s.deleteRow]}
          onPress={deleteAccount}
          activeOpacity={0.75}
          disabled={deleting}
        >
          <View style={[s.rowIcon, s.deleteIcon]}>
            <Trash2 size={18} color={colors.dangerInk} />
          </View>
          <View style={s.rowText}>
            <Text style={[s.rowLabel, { color: colors.dangerInk }]}>{t('privacy.deleteAccount')}</Text>
            <Text style={s.rowHint}>{t('privacy.deleteHint')}</Text>
          </View>
          {deleting
            ? <ActivityIndicator size="small" color={colors.danger} />
            : <ChevronRight size={18} color={colors.danger} />}
        </TouchableOpacity>

        {/* Pied "Vous gardez le contrôle" */}
        <View style={s.controlCard}>
          <View style={s.controlIcon}>
            <ShieldCheck size={26} color={colors.primary} />
          </View>
          <Text style={s.controlTitle}>{t('privacy.controlTitle')}</Text>
          <Text style={s.controlText}>{t('privacy.controlText')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    minHeight: 64,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowLabel: { fontSize: 15, fontWeight: typography.weight.semibold as any, color: colors.text },
  rowHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  sep: { height: 1, backgroundColor: colors.divider, marginLeft: spacing.lg + 38 + spacing.md },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border, ...shadows.sm,
    minHeight: 64,
  },
  deleteRow: { borderColor: colors.dangerLight },
  deleteIcon: { backgroundColor: colors.dangerSoft },

  controlCard: {
    backgroundColor: colors.brandTint, borderRadius: radius.xl,
    alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl,
    borderWidth: 1, borderColor: colors.brandSoft, marginTop: spacing.sm, gap: spacing.sm,
  },
  controlIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brandSoft,
  },
  controlTitle: { fontSize: 17, fontFamily: fonts.display, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  controlText: { fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
})

export default withScreenBoundary(Privacy, 'Privacy')
