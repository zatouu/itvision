import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    await connectMongoose()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))
    const status = searchParams.get('status') || undefined

    const query: any = status ? { status } : {}
    const shops = await Shop.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, shops })
  } catch (err) {
    console.error('[admin/shops] GET error:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
