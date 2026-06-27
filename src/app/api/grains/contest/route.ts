import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import MonthlyContest from '@/lib/models/MonthlyContest'
import GrainsTransaction from '@/lib/models/GrainsTransaction'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const today = new Date()
    const contest = await MonthlyContest.findOne({
      active: true,
      startAt: { $lte: today },
      endAt: { $gte: today },
    }).lean() as any

    if (!contest) {
      return NextResponse.json({ success: true, contest: null })
    }

    const leaderboard = await GrainsTransaction.aggregate([
      { $match: { amount: { $gt: 0 }, createdAt: { $gte: contest.startAt, $lte: contest.endAt } } },
      { $group: { _id: '$userId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, total: 1, name: { $ifNull: ['$user.name', '$user.phone', 'Anonyme'] } } }
    ])

    const userRank = await GrainsTransaction.aggregate([
      { $match: { amount: { $gt: 0 }, createdAt: { $gte: contest.startAt, $lte: contest.endAt } } },
      { $group: { _id: '$userId', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      {
        $group: {
          _id: null,
          ranks: { $push: { userId: '$_id', total: '$total' } }
        }
      },
      { $project: { ranks: 1 } }
    ])

    let rank: number | null = null
    let userTotal = 0
    if (userRank[0]?.ranks) {
      const idx = userRank[0].ranks.findIndex((r: any) => String(r.userId) === String(auth.userId))
      if (idx >= 0) {
        rank = idx + 1
        userTotal = userRank[0].ranks[idx].total
      }
    }

    return NextResponse.json({
      success: true,
      contest: {
        id: contest._id,
        month: contest.month,
        year: contest.year,
        prize: contest.prize,
        prizeGrains: contest.prizeGrains,
        endAt: contest.endAt,
        leaderboard: leaderboard.map((entry: any) => ({
          userId: entry._id,
          name: entry.name || 'Anonyme',
          grains: entry.total,
        })),
        userRank: rank,
        userTotal,
      },
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/contest] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
