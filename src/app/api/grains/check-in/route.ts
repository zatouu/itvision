import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import DailyCheckIn from '@/lib/models/DailyCheckIn'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import { updateTierFromBalance } from '@/lib/grains'

const REWARDS = [5, 10, 15, 25, 35, 50, 75]

function getRewardForDay(streak: number) {
  if (streak <= 0) return REWARDS[0]
  if (streak > REWARDS.length) return REWARDS[REWARDS.length - 1] + (streak - REWARDS.length) * 5
  return REWARDS[Math.min(streak - 1, REWARDS.length - 1)]
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const existing = await DailyCheckIn.findOne({ userId: auth.userId, date: today }).lean()
    if (existing) {
      return NextResponse.json({ success: false, error: 'Check-in déjà effectué aujourd\'hui' }, { status: 400 })
    }

    const lastCheckIn = await DailyCheckIn.findOne({ userId: auth.userId }).sort({ date: -1 }).lean()
    const streak = lastCheckIn && new Date(lastCheckIn.date).getTime() === yesterday.getTime() ? (lastCheckIn.streak || 0) + 1 : 1
    const totalDays = (lastCheckIn?.totalDays || 0) + 1
    const grainsEarned = getRewardForDay(streak)

    await DailyCheckIn.create({
      userId: auth.userId,
      date: today,
      streak,
      totalDays,
      grainsEarned,
    })

    await GrainsTransaction.create({
      userId: auth.userId,
      amount: grainsEarned,
      type: 'earned',
      source: 'admin',
      description: `Check-in quotidien — Jour ${streak}`,
    })

    await updateTierFromBalance(auth.userId)

    return NextResponse.json({
      success: true,
      streak,
      totalDays,
      grainsEarned,
      balance: await getGrainsBalance(auth.userId),
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/check-in] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

async function getGrainsBalance(userId: any) {
  const result = await GrainsTransaction.aggregate([
    { $match: { userId } },
    { $group: { _id: null, balance: { $sum: '$amount' } } },
  ])
  return Math.max(0, Math.round(result[0]?.balance || 0))
}
