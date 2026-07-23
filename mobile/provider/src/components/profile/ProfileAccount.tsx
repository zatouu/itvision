import { useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { router } from 'expo-router'
import { Section, SwitchRow, InputRow, StaticRow, ButtonRow, SectionHint } from './ProfileUI'
import { Image, Folder, CreditCard, TrendingUp, Crown, Coins, Shield, LifeBuoy } from 'lucide-react-native'
import { colors } from '../../design'
import { clearAuth } from '../../auth'
import { resetSocket } from '../../socket'
import { resetNotificationBinding } from '../../notifications'

type Props = {
  data: any
  onPreferences: (p: any) => void
  onProvider: (p: any) => void
}

function pref(data: any) {
  return data.provider?.preferences || {}
}

export function PortfolioSection({ data, onPreferences }: Props) {
  const p = pref(data)
  const portfolio = p.portfolio || []

  return (
    <Section title="Portfolio" icon={<Folder size={16} color={colors.primary} />}>
      <SectionHint text="Photos, vidéos, réalisations, certifications et diplômes seront bientôt disponibles ici." />
      <StaticRow label="Réalisations" value={`${portfolio.length} élément(s)`} />
      <ButtonRow label="Ajouter une réalisation" onPress={() => Alert.alert('Bientôt disponible', 'L\'ajout de portfolio arrive dans la prochaine mise à jour.')} />
    </Section>
  )
}

export function PaymentsSection({ data, onPreferences }: Props) {
  const p = pref(data)
  const pm = p.payments || {}
  const methods = pm.methods || {}

  const toggle = (key: string) => onPreferences({ payments: { ...pm, methods: { ...methods, [key]: !methods[key] } } })

  return (
    <Section title="Moyens de paiement" icon={<CreditCard size={16} color={colors.primary} />}>
      <SectionHint text="Activez les moyens par lesquels vous souhaitez être payé." />
      <SwitchRow label="Wave" value={!!methods.wave} onChange={() => toggle('wave')} />
      <SwitchRow label="Orange Money" value={!!methods.orangeMoney} onChange={() => toggle('orangeMoney')} />
      <SwitchRow label="Free Money" value={!!methods.freeMoney} onChange={() => toggle('freeMoney')} />
      <SwitchRow label="Compte bancaire" value={!!methods.bank} onChange={() => toggle('bank')} />
      <InputRow label="Nom du bénéficiaire" value={pm.beneficiaryName || ''} onChange={(v) => onPreferences({ payments: { ...pm, beneficiaryName: v } })} />
      <InputRow label="IBAN / Compte" value={pm.iban || ''} onChange={(v) => onPreferences({ payments: { ...pm, iban: v } })} />
      <ButtonRow label="Voir mon wallet" onPress={() => router.push('/wallet')} />
    </Section>
  )
}

export function StatsSection({ data }: Props) {
  const u = data.user || {}
  const stats = u.providerStats || {}
  const r = data.reviews || {}
  const total = (stats.completedMissions || 0) + (stats.cancelledByProvider || 0) + (stats.cancelledByClient || 0)
  const successRate = total > 0 ? Math.round((stats.completedMissions / total) * 100) : 100

  return (
    <Section title="Performances" icon={<TrendingUp size={16} color={colors.primary} />}>
      <SectionHint text="Statistiques de votre activité." />
      <StaticRow label="Missions terminées" value={String(stats.completedMissions || 0)} />
      <StaticRow label="Taux de réussite" value={`${successRate} %`} />
      <StaticRow label="Note moyenne" value={`${r.average || 0} / 5`} />
      <StaticRow label="Nombre d'avis" value={String(r.count || 0)} />
      <StaticRow label="Taux d'annulation" value={total > 0 ? `${Math.round(((stats.cancelledByProvider + stats.cancelledByClient) / total) * 100)} %` : '0 %'} />
      <StaticRow label="Score de fiabilité" value={`${stats.reliabilityScore ?? 100} / 100`} />
    </Section>
  )
}

export function PremiumSection({ data }: Props) {
  return (
    <Section title="Premium" icon={<Crown size={16} color={colors.primary} />}>
      <SectionHint text="Abonnement premium et avantités à venir." />
      <StaticRow label="Pack actuel" value="Standard" />
      <StaticRow label="Priorité dans les recherches" value="Non" />
      <StaticRow label="Rayon de visibilité" value="10 km" />
      <ButtonRow label="Découvrir Premium" onPress={() => Alert.alert('Bientôt disponible', 'L\'abonnement Premium sera activé prochainement.')} />
    </Section>
  )
}

export function CreditsSection({ data }: Props) {
  const u = data.user || {}
  return (
    <Section title="Crédits Xeuy" icon={<Coins size={16} color={colors.primary} />}>
      <SectionHint text="Solde, historique, parrainages et bonus." />
      <StaticRow label="Solde" value={`${u.referralBalance || 0} FCFA`} />
      <StaticRow label="Parrainages" value={String(u.referralCount || 0)} />
      <ButtonRow label="Voir l'historique" onPress={() => Alert.alert('Bientôt disponible', 'L\'historique des crédits arrive prochainement.')} />
    </Section>
  )
}

export function SecuritySection({ data }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const changePassword = async () => {
    Alert.alert('Bientôt disponible', 'Le changement de mot de passe sera réactivé avec la nouvelle API sécurité.')
  }

  const logout = async () => {
    await clearAuth()
    resetSocket()
    resetNotificationBinding()
    router.replace('/login')
  }

  return (
    <Section title="Sécurité" icon={<Shield size={16} color={colors.primary} />}>
      <SectionHint text="Protégez votre compte." />
      <InputRow label="Mot de passe actuel" value={currentPassword} onChange={setCurrentPassword} />
      <InputRow label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} />
      <ButtonRow label="Modifier le mot de passe" onPress={changePassword} />
      <SwitchRow label="Authentification à deux facteurs" value={!!data.user?.twoFactorEnabled} onChange={() => Alert.alert('Bientôt disponible')} />
      <ButtonRow label="Déconnexion" onPress={logout} type="danger" />
    </Section>
  )
}

export function HelpSection({ data }: Props) {
  return (
    <Section title="Assistance" icon={<LifeBuoy size={16} color={colors.primary} />}>
      <SectionHint text="Centre d'aide et support." />
      <StaticRow label="FAQ" onPress={() => Alert.alert('FAQ', 'Bientôt disponible')} />
      <StaticRow label="Support" onPress={() => Alert.alert('Support', 'Bientôt disponible')} />
      <StaticRow label="Conditions d'utilisation" onPress={() => Alert.alert('Conditions', 'Bientôt disponible')} />
      <StaticRow label="Politique de confidentialité" onPress={() => Alert.alert('Confidentialité', 'Bientôt disponible')} />
    </Section>
  )
}
