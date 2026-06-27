import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import WheelSpin from '@/lib/models/WheelSpin'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import { updateTierFromBalance } from '@/lib/grains'

const WHEEL_OPTIONS = [
  { label: '5 grains', value: 5, probability: 25 },
  { label: '10 grains', value: 10, probability: 20 },
  { label: '25 grains', value: 25, probability: 15 },
  { label: '50 grains', value: 50, probability: 10 },
  { label: '100 grains', value: 100, probability: 5 },
  { label: '1 spin offert', value: 0, probability: 15 },
  { label: 'Cadeau surprise', value: 0, probability: 8 },
  { label: 'Jackpot 250', value: 250, probability: 2 },
]

function spinWheel() {
  const total = WHEEL_OPTIONS.reduce((sum, opt) => sum + opt.probability, 0)
  let random = Math.random() * total
  for (const opt of WHEEL_OPTIONS) {
    random -= opt.probability
    if (random <= 0) return opt
  }
  return WHEEL_OPTIONS[0]
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const lastSpin = await WheelSpin.findOne({ userId: auth.userId }).sort({ createdAt: -1 }).lean()
    if (lastSpin && Date.now() - new Date(lastSpin.createdAt as Date).getTime() < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ success: false, error: 'Tour gratuit déjà utilisé aujourd\'hui' }, { status: 400 })
    }

    const result = spinWheel()
    const grainsEarned = result.value

    await WheelSpin.create({
      userId: auth.userId,
      result: result.label,
      grainsEarned,
      freeSpin: true,
    })

    if (grainsEarned > 0) {
      await GrainsTransaction.create({
        userId: auth.userId,
        amount: grainsEarned,
        type: 'bonus',
        source: 'admin',
        description: `Roue de la chance : ${result.label}`,
      })
    }

    await updateTierFromBalance(auth.userId)

    return NextResponse.json({
      success: true,
      result: result.label,
      grainsEarned,
      balance: await getGrainsBalance(auth.userId),
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/wheel/spin] error:', err)
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
