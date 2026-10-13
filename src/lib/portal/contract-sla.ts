import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import Ticket from '@/lib/models/Ticket'

// Visites planifiées : leur délai dépend du calendrier convenu, pas de notre réactivité
const PLANNED_TYPES = ['preventive', 'installation', 'inspection']
const HOUR = 3_600_000

/** « 4h », « 24 h », « 2j », « 48 » → heures (24 par défaut). */
export function parseResponseHours(value?: string | number | null): number {
  if (typeof value === 'number' && value > 0) return value
  const m = String(value || '').match(/(\d+(?:[.,]\d+)?)\s*(h|j|d)?/i)
  if (!m) return 24
  const n = parseFloat(m[1].replace(',', '.'))
  return /[jd]/i.test(m[2] || '') ? n * 24 : n
}

export interface ContractSla {
  periodStart: Date
  targetHours: number
  response: { measured: number; onTime: number; rate: number | null; avgHours: number | null }
  resolution: { total: number; completed: number; open: number; rate: number | null; avgHours: number | null }
  satisfaction: { count: number; avg: number | null }
  tickets: { total: number; resolved: number; onTime: number; rate: number | null }
}

const round1 = (n: number) => Math.round(n * 10) / 10
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

/**
 * Engagements mesurés sur les 12 derniers mois du contrat, d'après le journal des interventions
 * (passage « en cours » = arrivée sur site, « terminée » = résolution).
 */
export async function computeContractSla(
  contract: { _id: unknown; startDate?: Date | string; coverage?: { responseTime?: string; responseTimeHours?: number } },
  ticketScope?: Record<string, unknown>
): Promise<ContractSla> {
  const yearAgo = new Date(Date.now() - 365 * 24 * HOUR)
  const start = contract.startDate ? new Date(contract.startDate) : yearAgo
  const periodStart = start > yearAgo ? start : yearAgo
  const targetHours = parseResponseHours(contract.coverage?.responseTimeHours ?? contract.coverage?.responseTime)

  const [interventions, tickets] = await Promise.all([
    Intervention.find({
      maintenanceContractId: new mongoose.Types.ObjectId(String(contract._id)),
      createdAt: { $gte: periodStart },
      status: { $ne: 'cancelled' },
    }).select('status typeIntervention createdAt history clientFeedback.rating').lean() as Promise<any[]>,
    ticketScope
      ? Ticket.find({ ...ticketScope, createdAt: { $gte: periodStart } }).select('status sla resolvedAt').lean() as Promise<any[]>
      : Promise.resolve([] as any[]),
  ])

  const firstAt = (history: any[] | undefined, status: string) => {
    const hit = (history || []).find(h => h?.details?.newStatus === status)
    return hit?.timestamp ? new Date(hit.timestamp).getTime() : null
  }

  let measured = 0, onTime = 0, responseSum = 0
  let completed = 0, resolutionCount = 0, resolutionSum = 0
  const ratings: number[] = []

  for (const i of interventions) {
    const created = new Date(i.createdAt).getTime()
    const curative = !PLANNED_TYPES.includes(i.typeIntervention)
    const startedAt = firstAt(i.history, 'in_progress')
    const completedAt = firstAt(i.history, 'completed')
    if (curative && startedAt && startedAt >= created) {
      const hours = (startedAt - created) / HOUR
      measured++
      responseSum += hours
      if (hours <= targetHours) onTime++
    }
    if (i.status === 'completed') {
      completed++
      if (curative && completedAt && completedAt >= created) {
        resolutionCount++
        resolutionSum += (completedAt - created) / HOUR
      }
    }
    if (typeof i.clientFeedback?.rating === 'number') ratings.push(i.clientFeedback.rating)
  }

  const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status))
  const ticketsOnTime = resolvedTickets.filter(t => {
    const done = t.resolvedAt || t.sla?.resolvedAt
    return t.sla?.deadlineAt && done ? new Date(done) <= new Date(t.sla.deadlineAt) : !t.sla?.breached
  }).length

  return {
    periodStart,
    targetHours,
    response: { measured, onTime, rate: pct(onTime, measured), avgHours: measured ? round1(responseSum / measured) : null },
    resolution: {
      total: interventions.length,
      completed,
      open: interventions.length - completed,
      rate: pct(completed, interventions.length),
      avgHours: resolutionCount ? round1(resolutionSum / resolutionCount) : null,
    },
    satisfaction: { count: ratings.length, avg: ratings.length ? round1(ratings.reduce((s, r) => s + r, 0) / ratings.length) : null },
    tickets: { total: tickets.length, resolved: resolvedTickets.length, onTime: ticketsOnTime, rate: pct(ticketsOnTime, resolvedTickets.length) },
  }
}
