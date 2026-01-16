import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectDB()
    const { groupId } = await params

    const group = await GroupOrder.findOne({ groupId })
      .select('-participants.chatAccessTokenHash -participants.chatAccessTokenCreatedAt')
      .lean()

    if (!group) {
      return NextResponse.json({ success: false, error: 'Achat groupé non trouvé' }, { status: 404 })
    }

    return NextResponse.json({ success: true, group })
  } catch (error) {
    console.error('Erreur GET /api/admin/group-orders/[groupId]:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
