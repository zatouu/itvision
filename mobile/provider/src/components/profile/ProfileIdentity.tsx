import { useMemo } from 'react'
import { View, Text, Alert } from 'react-native'
import { router } from 'expo-router'
import { Section, InputRow, SelectRow, ChipSelect, StaticRow, ButtonRow, SectionHint } from './ProfileUI'
import { User, ShieldCheck, Mail, Smartphone, MapPin, Fingerprint } from 'lucide-react-native'
import { colors } from '../../design'

type Props = {
  data: any
  onUser: (p: any) => void
  onProvider: (p: any) => void
  onPreferences: (p: any) => void
}

const GENDERS = ['Homme', 'Femme', 'Autre']
const LANGUAGES = ['Français', 'Wolof', 'Anglais', 'Pular', 'Diola', 'Serer', 'Mandingue', 'Arabe']

function pref(data: any) {
  return data.provider?.preferences || {}
}

export function PersonalSection({ data, onUser, onPreferences }: Props) {
  const p = pref(data)
  return (
    <Section title="Informations personnelles" icon={<User size={16} color={colors.primary} />} defaultOpen>
      <SectionHint text="Modifiez vos informations de contact et votre identité publique." />
      <InputRow label="Nom" value={data.user?.name || ''} onChange={(v) => onUser({ name: v })} maxLength={100} />
      <InputRow label="Email" value={data.user?.email || ''} onChange={(v) => onUser({ email: v })} keyboardType="email-address" maxLength={200} />
      <InputRow label="Téléphone" value={data.user?.phone || ''} onChange={(v) => onUser({ phone: v })} keyboardType="phone-pad" maxLength={30} />
      <InputRow label="Nom commercial" value={p.businessName || ''} onChange={(v) => onPreferences({ businessName: v })} maxLength={100} />
      <InputRow label="Adresse" value={data.user?.address || ''} onChange={(v) => onUser({ address: v })} maxLength={200} />
      <InputRow label="Ville" value={data.user?.city || ''} onChange={(v) => onUser({ city: v })} maxLength={100} />
      <InputRow label="Pays" value={data.user?.country || ''} onChange={(v) => onUser({ country: v })} maxLength={100} />
      <SelectRow label="Sexe" value={p.gender || ''} options={GENDERS} onChange={(v) => onPreferences({ gender: v })} />
      <InputRow label="Date de naissance" value={p.dob || ''} placeholder="JJ/MM/AAAA" onChange={(v) => onPreferences({ dob: v })} maxLength={10} />
      <InputRow label="Biographie" value={p.bio || ''} placeholder="Courte présentation..." onChange={(v) => onPreferences({ bio: v })} multiline maxLength={500} />
      <InputRow label="Années d'expérience" value={String(p.experienceYears || '')} onChange={(v) => onPreferences({ experienceYears: parseInt(v) || 0 })} keyboardType="numeric" maxLength={2} />
      <ChipSelect label="Langues parlées" options={LANGUAGES} selected={p.languages || []} onChange={(v) => onPreferences({ languages: v })} />
    </Section>
  )
}

export function KycSection({ data }: Props) {
  const kyc = data.kyc || {}
  const user = data.user || {}
  const status = kyc.status || 'pending'
  const verified = status === 'approved'
  const rejected = status === 'rejected'

  const statusColor = verified ? colors.success : rejected ? colors.danger : colors.warning

  return (
    <Section title="Vérification du compte" icon={<ShieldCheck size={16} color={colors.primary} />}>
      <SectionHint text="Un profil vérifié rassure les clients et booste votre visibilité." />
      <StaticRow label="Téléphone renseigné" value={user.phone ? '✓ Vérifié' : 'Non renseigné'} icon={<Smartphone size={16} color={colors.primary} />} />
      <StaticRow label="Email renseigné" value={user.email ? '✓ Vérifié' : 'Non renseigné'} icon={<Mail size={16} color={colors.primary} />} />
      <StaticRow label="Pièce d'identité" value={verified ? '✓ Validée' : rejected ? '✗ Refusée' : 'En attente'} icon={<Fingerprint size={16} color={statusColor} />} />
      <StaticRow label="Selfie" value={verified ? '✓ Validé' : rejected ? '✗ Refusé' : 'En attente'} icon={<User size={16} color={statusColor} />} />
      <StaticRow label="Adresse" value="En attente" icon={<MapPin size={16} color={colors.warning} />} />
      {rejected && kyc.rejectionReason ? (
        <View style={{ marginVertical: 8 }}>
          <Text style={{ color: colors.danger, fontSize: 13 }}>Raison : {kyc.rejectionReason}</Text>
        </View>
      ) : null}
      <ButtonRow label={verified ? 'Mettre à jour mes documents' : 'Vérifier mon identité'} onPress={() => router.push('/kyc')} />
    </Section>
  )
}
