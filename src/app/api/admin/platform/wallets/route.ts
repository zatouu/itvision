import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import Wallet from '@/lib/models/Wallet'
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
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'points'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1

    const skip = (page - 1) * limit

    // Build query
    const query: Record<string, any> = {}
    if (search) {
      // We need to join with User to search by name/phone
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      }).select('_id').lean()
      const userIds = users.map((u: any) => u._id.toString())
      query.userId = { $in: userIds }
    }

    const [wallets, total] = await Promise.all([
      Wallet.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Wallet.countDocuments(query),
    ])

    // Enrich with user info
    const userIds = wallets.map((w: any) => w.userId)
    const users = await User.find({ _id: { $in: userIds } })
      .select('name phone email role')
      .lean()
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    const enriched = wallets.map((w: any) => ({
      ...w,
      user: userMap.get(String(w.userId)) || null,
    }))

    return NextResponse.json({
      success: true,
      wallets: enriched,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (e) {
    console.error('[GET /api/admin/platform/wallets]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
