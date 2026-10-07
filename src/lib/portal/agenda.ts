import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Project from '@/lib/models/Project'
import { companyScope } from '@/lib/domain-access'
import { clientProjectFilter, detectDomain, type ItvDomain } from '@/lib/portal/project-view'

export type AgendaKind = 'intervention' | 'maintenance' | 'milestone'

export interface AgendaEvent {
  uid: string
  kind: AgendaKind
  title: string
  detail?: string
  start: Date
  /** Heure connue (sinon : journée entière) */
  timed: boolean
  location?: string
  href: string
  domain: ItvDomain
}

const HORIZON_DAYS = 120

function withTime(date: Date, hhmm?: string) {
  const m = /^(\d{1,2})[:h](\d{2})/.exec(String(hhmm || ''))
  if (!m) return { start: date, timed: false }
  const d = new Date(date)
  d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  return { start: d, timed: true }
}

/** Rendez-vous à venir de l'entreprise : interventions planifiées, visites de maintenance, échéances de projet. */
export async function getAgendaEvents(opts: { userId: string | mongoose.Types.ObjectId; companyId: string | mongoose.Types.ObjectId }): Promise<AgendaEvent[]> {
  const uid = new mongoose.Types.ObjectId(String(opts.userId))
  const cid = new mongoose.Types.ObjectId(String(opts.companyId))
  const scope = companyScope({ userId: uid, companyId: cid })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const horizon = new Date(today.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000)

  const [interventions, contracts, projects] = await Promise.all([
    Intervention.find({ ...scope, status: { $in: ['pending', 'scheduled', 'in_progress'] }, date: { $gte: today, $lte: horizon } })
      .select('title service typeIntervention date heureDebut scheduledTime site client.address').sort({ date: 1 }).limit(100).lean() as Promise<any[]>,
    MaintenanceContract.find({ ...scope, status: 'active' })
      .select('name services sitesCovered').lean() as Promise<any[]>,
    Project.find(clientProjectFilter(scope, { status: { $nin: ['completed', 'cancelled'] } }))
      .select('name serviceType address milestones.id milestones.name milestones.status milestones.dueDate').lean() as Promise<any[]>,
  ])

  const events: AgendaEvent[] = []
  for (const i of interventions) {
    const { start, timed } = withTime(new Date(i.date), i.heureDebut || i.scheduledTime)
    events.push({
      uid: `intervention-${i._id}`, kind: 'intervention', title: i.title || 'Intervention',
      detail: 'Intervention IT Vision', start, timed, location: i.site || i.client?.address,
      href: `/portail-entreprise/interventions/${i._id}`, domain: detectDomain(i.service, i.title),
    })
  }
  for (const c of contracts) {
    for (const s of c.services || []) {
      if (!s?.nextScheduled) continue
      const d = new Date(s.nextScheduled)
      if (d < today || d > horizon) continue
      events.push({
        uid: `maintenance-${c._id}-${s.name}-${d.toISOString().slice(0, 10)}`, kind: 'maintenance',
        title: `Maintenance : ${s.name || c.name}`, detail: `Contrat ${c.name}`, start: d, timed: false,
        location: (c.sitesCovered || []).join(', ') || undefined,
        href: `/portail-entreprise/contrats/${c._id}`, domain: detectDomain(s.name, c.name),
      })
    }
  }
  for (const p of projects) {
    const domain = detectDomain(p.serviceType, p.name)
    for (const m of p.milestones || []) {
      if (m.status === 'completed' || !m.dueDate) continue
      const d = new Date(m.dueDate)
      if (d < today || d > horizon) continue
      events.push({
        uid: `milestone-${p._id}-${m.id || m.name}`, kind: 'milestone', title: m.name || 'Étape du projet',
        detail: p.name, start: d, timed: false, location: p.address, href: `/portail-entreprise/projets/${p._id}`, domain,
      })
    }
  }
  return events.sort((a, b) => a.start.getTime() - b.start.getTime())
}

const icsEscape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const icsDay = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`

/** Export iCalendar (RFC 5545) importable dans Google Agenda, Outlook ou l'agenda du téléphone. */
export function toIcs(events: AgendaEvent[], baseUrl: string) {
  const now = icsDate(new Date())
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IT Vision//Espace client//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:IT Vision']
  for (const e of events) {
    const end = e.timed ? new Date(e.start.getTime() + 2 * 60 * 60 * 1000) : new Date(e.start.getTime() + 24 * 60 * 60 * 1000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@itvision`,
      `DTSTAMP:${now}`,
      e.timed ? `DTSTART:${icsDate(e.start)}` : `DTSTART;VALUE=DATE:${icsDay(e.start)}`,
      e.timed ? `DTEND:${icsDate(end)}` : `DTEND;VALUE=DATE:${icsDay(end)}`,
      `SUMMARY:${icsEscape(e.title)}`,
      ...(e.detail ? [`DESCRIPTION:${icsEscape(`${e.detail}\n${baseUrl}${e.href}`)}`] : []),
      ...(e.location ? [`LOCATION:${icsEscape(e.location)}`] : []),
      `URL:${baseUrl}${e.href}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
