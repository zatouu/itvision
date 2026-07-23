import { View, Text } from 'react-native'
import { Section, SwitchRow, SectionHint } from './ProfileUI'
import { Bell, Eye, Lock, Settings } from 'lucide-react-native'
import { colors } from '../../design'

type Props = {
  data: any
  onPreferences: (p: any) => void
}

function pref(data: any) {
  return data.provider?.preferences || {}
}

export function NotificationsSection({ data, onPreferences }: Props) {
  const p = pref(data)
  const n = p.notifications || {}
  const channels = n.channels || {}
  const events = n.events || {}

  const toggleChannel = (key: string) => onPreferences({ notifications: { ...n, channels: { ...channels, [key]: !channels[key] } } })
  const toggleEvent = (key: string) => onPreferences({ notifications: { ...n, events: { ...events, [key]: !events[key] } } })

  return (
    <Section title="Notifications" icon={<Bell size={16} color={colors.primary} />}>
      <SectionHint text="Choisissez comment et pour quoi vous être alerté." />
      <Text style={{ fontWeight: '600', color: colors.text, marginTop: 4 }}>Canaux</Text>
      <SwitchRow label="Push" value={!!channels.push} onChange={() => toggleChannel('push')} />
      <SwitchRow label="SMS" value={!!channels.sms} onChange={() => toggleChannel('sms')} />
      <SwitchRow label="Email" value={!!channels.email} onChange={() => toggleChannel('email')} />
      <SwitchRow label="Appel" value={!!channels.call} onChange={() => toggleChannel('call')} />
      <Text style={{ fontWeight: '600', color: colors.text, marginTop: 8 }}>Événements</Text>
      <SwitchRow label="Nouvelle mission" value={!!events.newMission} onChange={() => toggleEvent('newMission')} />
      <SwitchRow label="Mission attribuée" value={!!events.assigned} onChange={() => toggleEvent('assigned')} />
      <SwitchRow label="Paiement" value={!!events.payment} onChange={() => toggleEvent('payment')} />
      <SwitchRow label="Message" value={!!events.message} onChange={() => toggleEvent('message')} />
      <SwitchRow label="Promotion" value={!!events.promo} onChange={() => toggleEvent('promo')} />
      <SwitchRow label="Nouveautés" value={!!events.news} onChange={() => toggleEvent('news')} />
      <SwitchRow label="Rappel" value={!!events.reminder} onChange={() => toggleEvent('reminder')} />
    </Section>
  )
}

export function VisibilitySection({ data, onPreferences }: Props) {
  const p = pref(data)
  const v = p.visibility || {}

  const toggle = (key: string) => onPreferences({ visibility: { ...v, [key]: !v[key] } })

  return (
    <Section title="Visibilité" icon={<Eye size={16} color={colors.primary} />}>
      <SectionHint text="Contrôlez ce que les clients peuvent voir." />
      <SwitchRow label="Être visible" value={!!v.visible} onChange={() => toggle('visible')} description="Apparaître dans les recherches et suggestions" />
      <SwitchRow label="Accepter automatiquement les nouvelles demandes" value={!!v.autoAccept} onChange={() => toggle('autoAccept')} />
      <SwitchRow label="Afficher mon numéro" value={!!v.showPhone} onChange={() => toggle('showPhone')} />
      <SwitchRow label="Afficher mon entreprise" value={!!v.showCompany} onChange={() => toggle('showCompany')} />
      <SwitchRow label="Afficher ma localisation exacte" value={!!v.showExactLocation} onChange={() => toggle('showExactLocation')} />
      <SwitchRow label="Afficher une zone approximative" value={!!v.showApproxZone} onChange={() => toggle('showApproxZone')} />
    </Section>
  )
}

export function PrivacySection({ data, onPreferences }: Props) {
  const p = pref(data)
  const pr = p.privacy || {}

  const toggle = (key: string) => onPreferences({ privacy: { ...pr, [key]: !pr[key] } })

  return (
    <Section title="Confidentialité" icon={<Lock size={16} color={colors.primary} />}>
      <SectionHint text="Gérez la confidentialité de vos données." />
      <SwitchRow label="Afficher mon profil publiquement" value={!!pr.publicProfile} onChange={() => toggle('publicProfile')} />
      <SwitchRow label="Afficher mes avis" value={!!pr.showReviews} onChange={() => toggle('showReviews')} />
      <SwitchRow label="Afficher mon téléphone" value={!!pr.showPhone} onChange={() => toggle('showPhone')} />
      <SwitchRow label="Afficher mon adresse" value={!!pr.showAddress} onChange={() => toggle('showAddress')} />
      <SwitchRow label="Autoriser les statistiques anonymes" value={!!pr.analytics} onChange={() => toggle('analytics')} />
    </Section>
  )
}

export function AdvancedSection({ data, onPreferences, onProvider }: Props & { onProvider: (p: any) => void }) {
  const p = pref(data)
  const s = p.settings || {}

  const toggle = (key: string) => onPreferences({ settings: { ...s, [key]: !s[key] } })

  return (
    <Section title="Paramètres avancés" icon={<Settings size={16} color={colors.primary} />}>
      <SectionHint text="Options avancées pour affiner votre activité." />
      <SwitchRow label="Recevoir les catégories secondaires" value={!!s.secondaryCategories} onChange={() => toggle('secondaryCategories')} />
      <SwitchRow label="Missions hors zone si aucune réponse locale" value={!!s.outOfZoneFallback} onChange={() => toggle('outOfZoneFallback')} />
      <SwitchRow label="Uniquement clients vérifiés" value={!!s.verifiedClientsOnly} onChange={() => toggle('verifiedClientsOnly')} />
      <SwitchRow label="Uniquement missions avec acompte" value={!!s.depositOnly} onChange={() => toggle('depositOnly')} />
      <SwitchRow label="Uniquement missions payées via escrow" value={!!s.escrowOnly} onChange={() => toggle('escrowOnly')} />
      <SwitchRow label="Mode économie de batterie" value={!!s.batterySaver} onChange={() => toggle('batterySaver')} description="Réduit la fréquence GPS" />
      <SwitchRow label="Mode haute disponibilité" value={!!s.highAvailability} onChange={() => toggle('highAvailability')} description="Priorité maximale" />
    </Section>
  )
}
