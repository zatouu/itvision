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

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from || to) {
      match.createdAt = {}
      if (from) match.createdAt.$gte = new Date(from)
      if (to) match.createdAt.$lte = new Date(to)
    }

    const [row] = await ServiceRequest.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          completedDurationSum: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, '$completedAt', '$startedAt'] },
                { $subtract: ['$completedAt', '$startedAt'] },
                0,
              ],
            },
          },
          completedDurationCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, '$completedAt', '$startedAt'] },
                1,
                0,
              ],
            },
          },
          acceptanceSum: {
            $sum: {
              $cond: [
                {
                  $and: [
                    '$assignedAt',
                    { $not: { $in: ['$status', ['created', 'broadcasted', 'pending_offers', 'expired']] } },
                    '$createdAt',
                  ],
                },
                { $subtract: ['$assignedAt', '$createdAt'] },
                0,
              ],
            },
          },
          acceptanceCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    '$assignedAt',
                    { $not: { $in: ['$status', ['created', 'broadcasted', 'pending_offers', 'expired']] } },
                    '$createdAt',
                  ],
                },
                1,
                0,
              ],
            },
          },
          arrivalSum: {
            $sum: {
              $cond: [
                { $and: ['$arrivedAt', '$startedAt', '$assignedAt'] },
                { $subtract: ['$arrivedAt', '$assignedAt'] },
                0,
              ],
            },
          },
          arrivalCount: {
            $sum: {
              $cond: [
                { $and: ['$arrivedAt', '$startedAt', '$assignedAt'] },
                1,
                0,
              ],
            },
          },
          pausedCount: {
            $sum: {
              $cond: [
                { $and: [{ $isArray: '$pauseLog' }, { $gt: [{ $size: '$pauseLog' }, 0] }] },
                1,
                0,
              ],
            },
          },
          pausedDurationSum: {
            $sum: {
              $cond: [
                { $and: [{ $isArray: '$pauseLog' }, { $gt: [{ $size: '$pauseLog' }, 0] }] },
                {
                  $reduce: {
                    input: '$pauseLog',
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        {
                          $let: {
                            vars: {
                              start: { $toLong: { $toDate: '$$this.startedAt' } },
                              end: { $toLong: { $ifNull: ['$$this.endedAt', '$$NOW'] } },
                            },
                            in: { $cond: [{ $gt: ['$$end', '$$start'] }, { $subtract: ['$$end', '$$start'] }, 0] },
                          },
                        },
                      ],
                    },
                  },
                },
                0,
              ],
            },
          },
          pauseEntriesSum: {
            $sum: {
              $cond: [
                { $and: [{ $isArray: '$pauseLog' }, { $gt: [{ $size: '$pauseLog' }, 0] }] },
                { $size: '$pauseLog' },
                0,
              ],
            },
          },
        },
      },
    ])

    const r = row || { total: 0, completed: 0, archived: 0, expired: 0, completedDurationSum: 0, completedDurationCount: 0, acceptanceSum: 0, acceptanceCount: 0, arrivalSum: 0, arrivalCount: 0, pausedCount: 0, pausedDurationSum: 0, pauseEntriesSum: 0 }

    const avgDurationMs = safeDivide(r.completedDurationSum, r.completedDurationCount)
    const avgAcceptanceMs = safeDivide(r.acceptanceSum, r.acceptanceCount)
    const avgArrivalMs = safeDivide(r.arrivalSum, r.arrivalCount)
    const avgPausedMs = safeDivide(r.pausedDurationSum, r.pausedCount)
    const avgPauses = safeDivide(r.pauseEntriesSum, r.pausedCount)

    const total = r.total || 1
    const totalCompletedOrClosed = (r.completed + r.archived + r.expired) || 1

    return NextResponse.json({
      stats: {
        missionCount: r.total,
        completedCount: r.completed,
        archivedCount: r.archived,
        expiredCount: r.expired,
        averageDurationMs,
        averageDurationFormatted: formatDuration(avgDurationMs),
        averageAcceptanceMs,
        averageAcceptanceFormatted: formatDuration(avgAcceptanceMs),
        averageArrivalMs,
        averageArrivalFormatted: formatDuration(avgArrivalMs),
        averagePausedMs,
        averagePausedFormatted: formatDuration(avgPausedMs),
        averagePauses: Number.isFinite(avgPauses) ? Number(avgPauses.toFixed(2)) : 0,
        archivedRate: Number(((r.archived / total) * 100).toFixed(2)),
        expiredRate: Number(((r.expired / total) * 100).toFixed(2)),
        completionRate: Number(((r.completed / totalCompletedOrClosed) * 100).toFixed(2)),
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[GET /api/services/stats/lifecycle]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

function safeDivide(sum: number, count: number): number {
  if (!count || !Number.isFinite(sum)) return 0
  return sum / count
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
