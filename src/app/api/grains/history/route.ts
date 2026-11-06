import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import GrainsTransaction from '@/lib/models/GrainsTransaction'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
    const page = Math.max(Number(searchParams.get('page') || 1), 1)

    const [transactions, total] = await Promise.all([
      GrainsTransaction.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      GrainsTransaction.countDocuments({ userId: auth.userId }),
    ])

    return NextResponse.json({
      success: true,
      transactions: transactions.map((t: any) => ({
        id: t._id,
        amount: t.amount,
        type: t.type,
        source: t.source,
        description: t.description,
        createdAt: t.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (err: any) {
    if (err?.status === 401 || err?.message?.includes('authentifié')) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[grains/history] error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
