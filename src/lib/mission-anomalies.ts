import ServiceRequest from './models/ServiceRequest'
import Payment from './models/Payment'

export const MISSION_ANOMALY_TYPES = [
  'long_mission',
  'long_pause',
  'many_pauses',
  'long_acceptance',
  'long_arrival',
  'frequent_dispute',
  'frequent_cancellation',
  'inactive_user',
  'late_validation',
  'payment_not_released',
  'late_balance_payment',
] as const

export type MissionAnomalyType = typeof MISSION_ANOMALY_TYPES[number]

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export async function detectMissionAnomalies(sr: any): Promise<{ flags: MissionAnomalyType[]; score: number }> {
  const flags: MissionAnomalyType[] = []
  const now = Date.now()
  const createdAt = sr.createdAt ? new Date(sr.createdAt).getTime() : now
  const completedAt = sr.completedAt ? new Date(sr.completedAt).getTime() : now
  const startedAt = sr.startedAt ? new Date(sr.startedAt).getTime() : 0
  const endedAtForDuration = ['completed', 'cancelled', 'expired', 'archived', 'dispute'].includes(sr.status) ? completedAt || now : now

  // Longue mission (plus de 8h actives)
  if (startedAt && endedAtForDuration - startedAt > 8 * HOUR) {
    flags.push('long_mission')
  }

  // Pause longue ou nombreuses pauses
  const pauseLog: any[] = sr.pauseLog || []
  let pausedMs = 0
  let longPause = false
  pauseLog.forEach((p: any) => {
    const start = new Date(p.startedAt).getTime()
    const end = p.endedAt ? new Date(p.endedAt).getTime() : now
    const duration = end - start
    if (duration > 0) pausedMs += duration
    if (duration > 4 * HOUR) longPause = true
  })
  if (longPause) flags.push('long_pause')
  if (pauseLog.length >= 3) flags.push('many_pauses')

  // Longue attente d'acceptation
  const assignedAt = sr.assignedAt ? new Date(sr.assignedAt).getTime() : 0
  if (assignedAt && assignedAt - createdAt > 7 * DAY) {
    flags.push('long_acceptance')
  }

  // Longue attente d'arrivée
  const arrivedAt = sr.arrivedAt ? new Date(sr.arrivedAt).getTime() : 0
  if (assignedAt && arrivedAt && arrivedAt - assignedAt > 4 * HOUR) {
    flags.push('long_arrival')
  }

  // Validation tardive (provider a déclaré terminé depuis plus de 48h)
  const providerCompletedAt = sr.providerCompletedAt ? new Date(sr.providerCompletedAt).getTime() : 0
  if (sr.status === 'awaiting_validation' && providerCompletedAt && now - providerCompletedAt > 48 * HOUR) {
    flags.push('late_validation')
  }

  // Paiement non libéré après validation terminée
  if (sr.status === 'completed') {
    const heldPayment = await Payment.findOne({ requestId: sr._id, status: 'held' }).lean()
    if (heldPayment) flags.push('payment_not_released')
  }

  const score = flags.length * 10 + Math.min(50, Math.floor(pausedMs / HOUR))
  return { flags, score }
}

export async function refreshMissionAnomalies(requestId: string) {
  const sr = await ServiceRequest.findById(requestId)
  if (!sr) return null
  const { flags, score } = await detectMissionAnomalies(sr)
  const current = ((sr as any).anomalyFlags || []) as string[]
  if (
    current.length !== flags.length ||
    !current.every((f: string) => flags.includes(f as MissionAnomalyType))
  ) {
    sr.anomalyFlags = flags
    sr.anomalyScore = score
    await sr.save()
  }
  return sr
}
