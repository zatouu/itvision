import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import WithdrawalRequest from '@/lib/models/WithdrawalRequest'
import User from '@/lib/models/User'

/**
 * GET /api/admin/withdrawals?status=pending&page=&limit=
 * File de traitement des retraits prestataires (payouts manuels Wave/OM/Free).
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const query: Record<string, any> = {}
    if (['pending', 'processed', 'rejected'].includes(status)) query.status = status

    const [items, total] = await Promise.all([
      WithdrawalRequest.find(query)
        .sort({ createdAt: status === 'pending' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WithdrawalRequest.countDocuments(query),
    ])

    const userIds = items.map((w: any) => w.userId)
    const users = await User.find({ _id: { $in: userIds } }).select('name phone email kycVerified').lean()
    const userMap = new Map(users.map((u: any) => [String(u._id), u]))

    return NextResponse.json({
      success: true,
      items: items.map((w: any) => ({ ...w, user: userMap.get(String(w.userId)) || null })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (e: any) {
    console.error('[GET /api/admin/withdrawals]', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
