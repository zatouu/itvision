import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import WalletTransaction from '@/lib/models/WalletTransaction'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const kind = searchParams.get('kind') || ''
    const search = searchParams.get('search') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''

    const skip = (page - 1) * limit

    const query: Record<string, any> = {}
    if (kind) query.kind = kind
    if (from || to) {
      query.createdAt = {}
      if (from) query.createdAt.$gte = new Date(from)
      if (to) query.createdAt.$lte = new Date(to)
    }

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ]
      }).select('_id').lean()
      const userIds = users.map((u: any) => u._id.toString())
      query.userId = { $in: userIds }
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments(query),
    ])

    // Enrich with user info
    const userIds = transactions.map((t: any) => t.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('name phone email role')
      .lean()
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    const enriched = transactions.map((t: any) => ({
      ...t,
      user: userMap.get(String(t.userId)) || null,
    }))

    return NextResponse.json({
      success: true,
      transactions: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (e) {
    console.error('[GET /api/admin/platform/transactions]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
