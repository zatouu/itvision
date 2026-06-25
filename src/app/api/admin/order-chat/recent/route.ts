import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import OrderChatMessage from '@/lib/models/OrderChatMessage'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 20)))

    const messages = await OrderChatMessage.find({ senderRole: 'client' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, messages })
  } catch (err) {
    console.error('[admin/order-chat] Erreur:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
