import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const includeExpired = searchParams.get('includeExpired')

    const query: any = {}

    if (status && status !== 'all') {
      query.status = status
    }

    if (!includeExpired || includeExpired === '0' || includeExpired === 'false') {
      query.deadline = { $gte: new Date() }
    }

    const groups = await GroupOrder.find(query)
      .select('-participants.chatAccessTokenHash -participants.chatAccessTokenCreatedAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    return NextResponse.json({ success: true, groups })
  } catch (error) {
    console.error('Erreur GET /api/admin/group-orders:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
