import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Section, SwitchRow, InputRow, SelectRow, ChipSelect, SectionHint } from './ProfileUI'
import { Briefcase, MapPin, Clock, ClipboardList } from 'lucide-react-native'
import { colors } from '../../design'
import { loadCategories } from '../../categories'

type Props = {
  data: any
  onProvider: (p: any) => void
  onPreferences: (p: any) => void
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const AVAIL = ['Disponible', 'Occupé', 'En pause', 'En vacances', 'Hors ligne']
const RADIUS = ['10', '20', '30', '50', '100', 'Région']

export function ActivitiesSection({ data, onProvider, onPreferences }: Props) {
  const [categories, setCategories] = useState<any[]>([])
  const p = data.provider?.preferences || {}
  const services: Record<string, string[]> = p.services || {}
  const primary = data.provider?.serviceCategories || []
  const secondary = data.provider?.secondaryCategories || []

  useEffect(() => {
    loadCategories().then(setCategories).catch(() => {})
  }, [])

  const catOptions = categories.map((c) => c.label || c.slug)
  const catBySlug = (slug: string) => categories.find((c) => c.slug === slug)
  const catLabel = (slug: string) => catBySlug(slug)?.label || slug
  const subLabel = (catSlug: string, subSlug: string) => {
    const sub = catBySlug(catSlug)?.subCategories?.find((s: any) => s.slug === subSlug)
    return sub?.label || subSlug
  }
  const togglePrimary = (label: string) => {
    const slug = categories.find((c) => c.label === label || c.slug === label)?.slug || label
    const next = primary.includes(slug) ? primary.filter((x: string) => x !== slug) : [...primary, slug]
    onProvider({ serviceCategories: next })
  }

  const toggleSub = (catSlug: string, subSlug: string) => {
    const arr = services[catSlug] || []
    const nextArr = arr.includes(subSlug) ? arr.filter((x: string) => x !== subSlug) : [...arr, subSlug]
    onPreferences({ services: { ...services, [catSlug]: nextArr } })
  }

  const toggleSecondary = (label: string) => {
    const slug = categories.find((c) => c.label === label || c.slug === label)?.slug || label
    const next = secondary.includes(slug) ? secondary.filter((x: string) => x !== slug) : [...secondary, slug]
    onProvider({ secondaryCategories: next })
  }

  return (
    <Section title="Activités & compétences" icon={<Briefcase size={16} color={colors.primary} />} defaultOpen>
      <SectionHint text="Choisissez les catégories et sous-catégories pour recevoir les missions adaptées." />
      <ChipSelect
        label="Catégories principales (max 5)"
        options={catOptions}
        selected={primary.map((slug: string) => catLabel(slug))}
        onChange={(sel) => {
          const map: Record<string, string> = {}
          categories.forEach((c) => { map[c.label] = c.slug; map[c.slug] = c.slug })
          onProvider({ serviceCategories: sel.map((l) => map[l] || l).slice(0, 5) })
        }}
        max={5}
      />
      {primary.map((catSlug: string) => {
        const cat = categories.find((c) => c.slug === catSlug)
        const subs = cat?.subCategories?.map((s: any) => s.label || s.slug) || []
        if (!subs.length) return null
        return (
          <ChipSelect
            key={catSlug}
            label={`Sous-catégories · ${catLabel(catSlug)}`}
            options={subs}
            selected={(services[catSlug] || []).map((s: string) => subLabel(catSlug, s))}
            onChange={(sel) => {
              const map: Record<string, string> = {}
              cat.subCategories.forEach((s: any) => { map[s.label] = s.slug; map[s.slug] = s.slug })
              onPreferences({ services: { ...services, [catSlug]: sel.map((l) => map[l] || l) } })
            }}
          />
        )
      })}
      <ChipSelect
        label="Catégories secondaires"
        options={catOptions}
        selected={secondary.map((slug: string) => catLabel(slug))}
        onChange={(sel) => {
          const map: Record<string, string> = {}
          categories.forEach((c) => { map[c.label] = c.slug; map[c.slug] = c.slug })
          onProvider({ secondaryCategories: sel.map((l) => map[l] || l) })
        }}
      />
    </Section>
  )
}

export function ZoneSection({ data, onProvider, onPreferences }: Props) {
  const zone = data.provider?.zone || { city: '', region: '', radiusKm: 10, departments: [], regions: [] }
  const radiusLabel = String(zone.radiusKm || 'Région')

  return (
    <Section title="Zone d'intervention" icon={<MapPin size={16} color={colors.primary} />}>
      <SectionHint text="Définissez où vous souhaitez recevoir des missions." />
      <InputRow label="Ville principale" value={zone.city || ''} onChange={(v) => onProvider({ zone: { ...zone, city: v } })} />
      <InputRow label="Région" value={zone.region || ''} onChange={(v) => onProvider({ zone: { ...zone, region: v } })} />
      <SelectRow
        label="Rayon d'intervention"
        value={RADIUS.includes(radiusLabel) ? radiusLabel : '10'}
        options={RADIUS}
        onChange={(v) => onProvider({ zone: { ...zone, radiusKm: v === 'Région' ? 0 : Number(v) } })}
      />
      <InputRow
        label="Départements (séparés par des virgules)"
        value={(zone.departments || []).join(', ')}
        onChange={(v) => onProvider({ zone: { ...zone, departments: v.split(',').map((x) => x.trim()).filter(Boolean) } })}
      />
      <InputRow
        label="Régions supplémentaires (séparées par des virgules)"
        value={(zone.regions || []).join(', ')}
        onChange={(v) => onProvider({ zone: { ...zone, regions: v.split(',').map((x) => x.trim()).filter(Boolean) } })}
      />
    </Section>
  )
}

export function AvailabilitySection({ data, onPreferences }: Props) {
  const p = data.provider?.preferences || {}
  const avail = p.availability || { status: 'Disponible', workDays: [], startHour: '08:00', endHour: '18:00', lunchStart: '13:00', lunchEnd: '14:00', exceptions: '' }

  return (
    <Section title="Disponibilités" icon={<Clock size={16} color={colors.primary} />}>
      <SectionHint text="Indiquez quand les clients peuvent vous solliciter." />
      <SelectRow label="Statut" value={avail.status} options={AVAIL} onChange={(v) => onPreferences({ availability: { ...avail, status: v } })} />
      <ChipSelect label="Jours travaillés" options={DAYS} selected={avail.workDays || []} onChange={(v) => onPreferences({ availability: { ...avail, workDays: v } })} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <InputRow label="Début" value={avail.startHour} onChange={(v) => onPreferences({ availability: { ...avail, startHour: v } })} maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <InputRow label="Fin" value={avail.endHour} onChange={(v) => onPreferences({ availability: { ...avail, endHour: v } })} maxLength={5} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <InputRow label="Pause déjeuner début" value={avail.lunchStart} onChange={(v) => onPreferences({ availability: { ...avail, lunchStart: v } })} maxLength={5} />
        </View>
        <View style={{ flex: 1 }}>
          <InputRow label="Pause déjeuner fin" value={avail.lunchEnd} onChange={(v) => onPreferences({ availability: { ...avail, lunchEnd: v } })} maxLength={5} />
        </View>
      </View>
      <InputRow label="Indisponibilités exceptionnelles" value={avail.exceptions} multiline onChange={(v) => onPreferences({ availability: { ...avail, exceptions: v } })} />
    </Section>
  )
}

export function MissionSection({ data, onPreferences }: Props) {
  const p = data.provider?.preferences || {}
  const mp = p.missionPreferences || {}

  const toggle = (key: string) => onPreferences({ missionPreferences: { ...mp, [key]: !mp[key] } })

  return (
    <Section title="Préférences de missions" icon={<ClipboardList size={16} color={colors.primary} />}>
      <SectionHint text="Affinez les missions qui vous sont proposées." />
      <SwitchRow label="Missions urgentes" value={!!mp.urgent} onChange={() => toggle('urgent')} />
      <SwitchRow label="Missions planifiées" value={!!mp.planned} onChange={() => toggle('planned')} />
      <SwitchRow label="Dépannage" value={!!mp.repair} onChange={() => toggle('repair')} />
      <SwitchRow label="Installation" value={!!mp.install} onChange={() => toggle('install')} />
      <SwitchRow label="Entretien" value={!!mp.maintenance} onChange={() => toggle('maintenance')} />
      <SwitchRow label="Longues missions" value={!!mp.long} onChange={() => toggle('long')} />
      <SwitchRow label="Courtes missions" value={!!mp.short} onChange={() => toggle('short')} />
      <InputRow label="Montant minimum accepté (FCFA)" value={String(mp.minAmount || '')} keyboardType="numeric" onChange={(v) => onPreferences({ missionPreferences: { ...mp, minAmount: parseInt(v) || 0 } })} />
      <InputRow label="Distance maximale (km)" value={String(mp.maxDistance || '')} keyboardType="numeric" onChange={(v) => onPreferences({ missionPreferences: { ...mp, maxDistance: parseInt(v) || 0 } })} />
      <InputRow label="Durée maximale (heures)" value={String(mp.maxDuration || '')} keyboardType="numeric" onChange={(v) => onPreferences({ missionPreferences: { ...mp, maxDuration: parseInt(v) || 0 } })} />
    </Section>
  )
}
