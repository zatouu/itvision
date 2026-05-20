import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import { ChinaPurchase } from '@/lib/models/ChinaPurchase'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sourceType = searchParams.get('sourceType')

    const query: any = {}
    if (status && status !== 'all') query.status = status
    if (sourceType && sourceType !== 'all') query['source.type'] = sourceType

    const purchases = await ChinaPurchase.find(query)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean()

    return NextResponse.json({ success: true, purchases })
  } catch (error) {
    console.error('Erreur GET /api/admin/china-purchases:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
