import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import Reward from '@/lib/models/Reward'

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req)
    await connectDB()

    const rewards = await Reward.find({ active: true }).sort({ cost: 1 }).lean()
    return NextResponse.json({
      success: true,
      rewards: rewards.map((r: any) => ({
        id: r._id,
        title: r.title,
        description: r.description,
        icon: r.icon,
        cost: r.cost,
        type: r.type,
        value: r.value,
        minOrderAmount: r.minOrderAmount,
        imageUrl: r.imageUrl,
      })),
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/rewards] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
