import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import Challenge from '@/lib/models/Challenge'
import UserChallenge from '@/lib/models/UserChallenge'
import GrainsTransaction from '@/lib/models/GrainsTransaction'
import { updateTierFromBalance } from '@/lib/grains'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const challengeId = (body as any)?.challengeId
    if (!challengeId) {
      return NextResponse.json({ success: false, error: 'challengeId requis' }, { status: 400 })
    }

    const challenge = await Challenge.findById(challengeId).lean() as any
    if (!challenge || !challenge.active) {
      return NextResponse.json({ success: false, error: 'Défi introuvable' }, { status: 404 })
    }

    let uc = await UserChallenge.findOne({ userId: auth.userId, challengeId }).lean() as any
    if (!uc) {
      return NextResponse.json({ success: false, error: 'Défi non commencé' }, { status: 400 })
    }

    if (!uc.completed) {
      return NextResponse.json({ success: false, error: 'Défi non terminé' }, { status: 400 })
    }

    if (uc.claimed) {
      return NextResponse.json({ success: false, error: 'Récompense déjà récupérée' }, { status: 400 })
    }

    await UserChallenge.updateOne(
      { _id: uc._id },
      { $set: { claimed: true, claimedAt: new Date() } }
    )

    await GrainsTransaction.create({
      userId: auth.userId,
      amount: challenge.grainsReward,
      type: 'earned',
      source: 'admin',
      description: `Défi terminé : ${challenge.title}`,
      sourceId: challenge._id,
    })

    await updateTierFromBalance(auth.userId)

    return NextResponse.json({ success: true, grainsEarned: challenge.grainsReward, balance: await getGrainsBalance(auth.userId) })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/challenges/claim] error:', err)
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
