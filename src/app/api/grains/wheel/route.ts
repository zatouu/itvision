import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import WheelSpin from '@/lib/models/WheelSpin'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const lastSpin = await WheelSpin.findOne({ userId: auth.userId }).sort({ createdAt: -1 }).lean()
    const canSpinFree = !lastSpin || (Date.now() - new Date(lastSpin.createdAt as Date).getTime() > 24 * 60 * 60 * 1000)

    return NextResponse.json({ success: true, lastSpin: lastSpin?.createdAt || null, canSpinFree })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/wheel] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
