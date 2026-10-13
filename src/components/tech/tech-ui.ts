export const INTERVENTION_STATUS: Record<string, { label: string; chip: string; dot: string }> = {
  pending:     { label: 'À planifier', chip: 'bg-stone-100 text-stone-600', dot: 'bg-stone-400' },
  scheduled:   { label: 'Planifiée',   chip: 'bg-sky-50 text-sky-700',     dot: 'bg-sky-500' },
  in_progress: { label: 'En cours',    chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  completed:   { label: 'Terminée',    chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled:   { label: 'Annulée',     chip: 'bg-red-50 text-red-600',     dot: 'bg-red-400' },
}

export const REPORT_STATUS: Record<string, { label: string; chip: string }> = {
  draft:              { label: 'Brouillon',     chip: 'bg-stone-100 text-stone-600' },
  pending_validation: { label: 'En validation', chip: 'bg-amber-50 text-amber-700' },
  rejected:           { label: 'À corriger',    chip: 'bg-red-50 text-red-600' },
  validated:          { label: 'Validé',        chip: 'bg-emerald-50 text-emerald-700' },
  published:          { label: 'Publié client', chip: 'bg-teal-50 text-teal-700' },
  archived:           { label: 'Archivé',       chip: 'bg-stone-100 text-stone-500' },
}

export const PRIORITY: Record<string, { label: string; chip: string } | undefined> = {
  urgent:   { label: 'Urgent',   chip: 'bg-red-600 text-white' },
  critical: { label: 'Critique', chip: 'bg-red-600 text-white' },
  high:     { label: 'Haute',    chip: 'bg-orange-50 text-orange-700' },
}

export const TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  preventive: 'Préventive',
  installation: 'Installation',
  repair: 'Dépannage',
  inspection: 'Inspection',
  emergency: 'Urgence',
}

export function todayStr(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

export function dayKey(i: { scheduledDate?: string; date?: string | Date }) {
  if (i.scheduledDate) return i.scheduledDate
  return i.date ? new Date(i.date).toISOString().slice(0, 10) : ''
}

export function dayLabel(key: string) {
  if (!key) return 'Sans date'
  if (key === todayStr()) return "Aujourd'hui"
  if (key === todayStr(1)) return 'Demain'
  if (key === todayStr(-1)) return 'Hier'
  const d = new Date(`${key}T12:00:00`)
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function shortDate(d?: string | Date | null) {
  if (!d) return ''
  const date = new Date(d)
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function mapsUrl(address?: string) {
  return address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : ''
}

export function telUrl(phone?: string) {
  const p = String(phone || '').replace(/[^\d+]/g, '')
  return p ? `tel:${p}` : ''
}

export function clientLabel(c?: { company?: string; name?: string } | null) {
  return c?.company || c?.name || ''
}
