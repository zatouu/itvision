import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined

    const match: any = {}
    if (category) match.category = category

    const baseQuery = ServiceRequest.find(match)

    const [missions, completed, archived, expired] = await Promise.all([
      baseQuery.clone().lean() as any,
      ServiceRequest.countDocuments({ ...match, status: { $in: ['completed'] } }),
      ServiceRequest.countDocuments({ ...match, status: 'archived' }),
      ServiceRequest.countDocuments({ ...match, status: 'expired' }),
    ])

    const completedMissions = missions.filter((m: any) => m.status === 'completed')
    const acceptedMissions = missions.filter((m: any) => m.assignedAt && (m.status !== 'created' && m.status !== 'broadcasted' && m.status !== 'pending_offers' && m.status !== 'expired'))
    const arrivedMissions = missions.filter((m: any) => m.arrivedAt && m.startedAt)
    const pausedMissions = missions.filter((m: any) => Array.isArray(m.pauseLog) && m.pauseLog.length > 0)

    const avgDurationMs = average(completedMissions.map((m: any) =>
      m.completedAt && m.startedAt ? new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime() : 0
    ))

    const avgAcceptanceMs = average(acceptedMissions.map((m: any) =>
      m.assignedAt && m.createdAt ? new Date(m.assignedAt).getTime() - new Date(m.createdAt).getTime() : 0
    ))

    const avgArrivalMs = average(arrivedMissions.map((m: any) =>
      m.arrivedAt && m.assignedAt ? new Date(m.arrivedAt).getTime() - new Date(m.assignedAt).getTime() : 0
    ))

    const avgPausedMs = average(pausedMissions.map((m: any) =>
      (m.pauseLog || []).reduce((sum: number, p: any) => {
        const start = new Date(p.startedAt).getTime()
        const end = p.endedAt ? new Date(p.endedAt).getTime() : Date.now()
        return sum + (end > start ? end - start : 0)
      }, 0)
    ))

    const avgPauses = average(pausedMissions.map((m: any) => (m.pauseLog || []).length))

    const total = missions.length || 1
    const totalCompletedOrClosed = completed + archived + expired || 1

    return NextResponse.json({
      stats: {
        missionCount: missions.length,
        completedCount: completed,
        archivedCount: archived,
        expiredCount: expired,
        averageDurationMs: avgDurationMs,
        averageDurationFormatted: formatDuration(avgDurationMs),
        averageAcceptanceMs: avgAcceptanceMs,
        averageAcceptanceFormatted: formatDuration(avgAcceptanceMs),
        averageArrivalMs: avgArrivalMs,
        averageArrivalFormatted: formatDuration(avgArrivalMs),
        averagePausedMs: avgPausedMs,
        averagePausedFormatted: formatDuration(avgPausedMs),
        averagePauses: Number.isFinite(avgPauses) ? Number(avgPauses.toFixed(2)) : 0,
        archivedRate: Number(((archived / total) * 100).toFixed(2)),
        expiredRate: Number(((expired / total) * 100).toFixed(2)),
        completionRate: Number(((completed / totalCompletedOrClosed) * 100).toFixed(2)),
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/stats/lifecycle]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

function average(values: number[]): number {
  const valid = values.filter(v => Number.isFinite(v) && v > 0)
  if (valid.length === 0) return 0
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function formatDuration(ms: number): string {
  if (!ms) return '0s'
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const remM = m % 60
  if (h < 24) return `${h}h ${remM}min`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return `${d}j ${remH}h`
}
