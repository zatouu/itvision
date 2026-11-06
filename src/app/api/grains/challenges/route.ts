import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import Challenge from '@/lib/models/Challenge'
import UserChallenge from '@/lib/models/UserChallenge'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const [challenges, userChallenges] = await Promise.all([
      Challenge.find({ active: true }).sort({ grainsReward: -1 }).lean(),
      UserChallenge.find({ userId: auth.userId }).lean(),
    ])

    const result = challenges.map((challenge) => {
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

    return NextResponse.json({ success: true, challenges: result })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/challenges] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
