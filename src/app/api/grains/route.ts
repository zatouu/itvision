import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { getGrainsBalance } from '@/lib/grains'
import DailyCheckIn from '@/lib/models/DailyCheckIn'
import Challenge from '@/lib/models/Challenge'
import UserChallenge from '@/lib/models/UserChallenge'
import WheelSpin from '@/lib/models/WheelSpin'
import Reward from '@/lib/models/Reward'
import MonthlyContest from '@/lib/models/MonthlyContest'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import User from '@/lib/models/User'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const userId = String(auth.userId)
    const balance = await getGrainsBalance(auth.userId)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [lastCheckIn, user, challenges, userChallenges, lastSpin, rewards, currentContest, recentTransactions, leaderboard] = await Promise.all([
      DailyCheckIn.findOne({ userId: auth.userId }).sort({ date: -1 }).lean(),
      User.findById(auth.userId).lean(),
      Challenge.find({ active: true }).sort({ grainsReward: -1 }).lean(),
      UserChallenge.find({ userId: auth.userId }).lean(),
      WheelSpin.findOne({ userId: auth.userId }).sort({ createdAt: -1 }).lean(),
      Reward.find({ active: true }).sort({ cost: 1 }).lean(),
      MonthlyContest.findOne({ active: true, startAt: { $lte: new Date() }, endAt: { $gte: new Date() } }).lean(),
      GrainsTransaction.find({ userId: auth.userId }).sort({ createdAt: -1 }).limit(20).lean(),
      GrainsTransaction.aggregate([
        { $match: { amount: { $gt: 0 }, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) } } },
        { $group: { _id: '$userId', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, total: 1, name: { $ifNull: ['$user.name', '$user.phone', 'Anonyme'] } } }
      ])
    ])

    const checkedInToday = lastCheckIn ? new Date(lastCheckIn.date).getTime() === today.getTime() : false
    const streak = lastCheckIn?.streak || 0
    const totalDays = lastCheckIn?.totalDays || 0

    const challengesWithProgress = challenges.map((challenge) => {
      const uc = userChallenges.find((uc: any) => String(uc.challengeId) === String(challenge._id))
      return {
        id: challenge._id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        icon: challenge.icon,
        grainsReward: challenge.grainsReward,
        action: challenge.action,
        targetCount: challenge.targetCount,
        progress: uc?.progress || 0,
        completed: uc?.completed || false,
        claimed: uc?.claimed || false,
      }
    })

    const rewardsMapped = rewards.map((r) => ({
      id: r._id,
      title: r.title,
      description: r.description,
      icon: r.icon,
      cost: r.cost,
      type: r.type,
      value: r.value,
      minOrderAmount: r.minOrderAmount,
      imageUrl: r.imageUrl,
    }))

    const transactions = recentTransactions.map((t) => ({
      id: t._id,
      amount: t.amount,
      type: t.type,
      source: t.source,
      description: t.description,
      createdAt: t.createdAt,
    }))

    const tierName = (user as any)?.tier || 'Bronze'
    const tiers = [
      { name: 'Bronze', min: 0, color: '#B45309' },
      { name: 'Argent', min: 500, color: '#94A3B8' },
      { name: 'Or', min: 2000, color: '#FBBF24' },
      { name: 'Platine', min: 5000, color: '#10B981' },
    ]
    const currentTier = tiers.find((t) => t.name === tierName) || tiers[0]
    const nextTier = tiers.find((t) => t.min > balance) || tiers[tiers.length - 1]
    const progressToNext = nextTier ? Math.min(100, Math.round(((balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100)) : 100

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: (user as any)?.name || 'Explorateur',
        tier: tierName,
        balance,
        referralCode: (user as any)?.referralCode || null,
      },
      checkIn: {
        checkedInToday,
        streak,
        totalDays,
        grainsEarned: lastCheckIn?.grainsEarned || 0,
      },
      challenges: challengesWithProgress,
      wheel: {
        lastSpin: lastSpin?.createdAt || null,
        canSpinFree: !lastSpin || (Date.now() - new Date(lastSpin.createdAt).getTime() > 24 * 60 * 60 * 1000),
      },
      rewards: rewardsMapped,
      contest: currentContest ? {
        id: currentContest._id,
        month: currentContest.month,
        year: currentContest.year,
        prize: currentContest.prize,
        prizeGrains: currentContest.prizeGrains,
        endAt: currentContest.endAt,
        leaderboard: leaderboard.map((entry: any) => ({
          userId: entry._id,
          name: entry.name || 'Anonyme',
          grains: entry.total,
        })),
      } : null,
      transactions,
      tiers: tiers.map((t) => ({ ...t, current: t.name === tierName })),
      progressToNext,
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/dashboard] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
