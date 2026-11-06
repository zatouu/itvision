// Helpers de formatage du portail entreprise — fr-FR partout.

export function fmtNum(v: number | null | undefined) {
  return Math.round(v || 0).toLocaleString('fr-FR')
}

export function fmtDate(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateLong(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function fmtDateTime(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtTime(d: any) {
  if (!d) return '—'
  if (typeof d === 'string' && /^\d{1,2}:\d{2}/.test(d)) return d
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function daysLeft(d: any) {
  if (!d) return null
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000)
}

export function hoursLeft(d: any) {
  if (!d) return null
  return Math.floor((new Date(d).getTime() - Date.now()) / 3600000)
}

export function fmtDuration(minutes: number | null | undefined) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}` : `${m} min`
}

export function fmtMonth(d: Date) {
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

export function fmtRelative(d: any) {
  if (!d) return '—'
  const date = new Date(d)
  const diff = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `Il y a ${diff} min`
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`
  if (diff < 10080) return `Il y a ${Math.floor(diff / 1440)}j`
  return fmtDate(date)
}
