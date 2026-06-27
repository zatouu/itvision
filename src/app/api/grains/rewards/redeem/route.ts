import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import Reward from '@/lib/models/Reward'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import UserReward from '@/lib/models/UserReward'
import { getGrainsBalance } from '@/lib/grains'

function generateCode() {
  return 'DDM-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const rewardId = (body as any)?.rewardId
    if (!rewardId) {
      return NextResponse.json({ success: false, error: 'rewardId requis' }, { status: 400 })
    }

    const reward = await Reward.findById(rewardId).lean() as any
    if (!reward || !reward.active) {
      return NextResponse.json({ success: false, error: 'Récompense introuvable' }, { status: 404 })
    }

    const balance = await getGrainsBalance(auth.userId)
    if (balance < reward.cost) {
      return NextResponse.json({ success: false, error: 'Solde insuffisant' }, { status: 400 })
    }

    const existingCount = await UserReward.countDocuments({
      userId: auth.userId,
      rewardId: reward._id,
      status: 'active',
    })

    if (reward.maxPerUser && existingCount >= reward.maxPerUser) {
      return NextResponse.json({ success: false, error: 'Limite par utilisateur atteinte' }, { status: 400 })
    }

    const code = generateCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (reward.validForDays || 30))

    await GrainsTransaction.create({
      userId: auth.userId,
      amount: -reward.cost,
      type: 'spent',
      source: 'redemption',
      sourceId: reward._id,
      description: `Échange : ${reward.title}`,
    })

    await UserReward.create({
      userId: auth.userId,
      rewardId: reward._id,
      code,
      status: 'active',
      expiresAt,
    })

    return NextResponse.json({
      success: true,
      code,
      expiresAt,
      balance: await getGrainsBalance(auth.userId),
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/rewards/redeem] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
