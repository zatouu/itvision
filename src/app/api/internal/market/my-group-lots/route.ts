import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { isInternalCall } from '@/lib/internal-auth'
import { GroupOrder } from '@/lib/models/GroupOrder'

export const dynamic = 'force-dynamic'

const RESALE_READY = 'delivered'

/**
 * POST /api/internal/market/my-group-lots { userId } → { lots }
 * Participations d'un utilisateur aux achats groupés (« Mon stock » Xeuy) ; un lot livré et réglé
 * peut être remis en vente dans sa boutique (`/espace-vendeur?resell=<groupId>`).
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const userId = typeof body?.userId === 'string' ? body.userId : ''
  if (!mongoose.Types.ObjectId.isValid(userId)) return NextResponse.json({ error: 'userId invalide' }, { status: 400 })

  try {
    await connectMongoose()
    const uid = new mongoose.Types.ObjectId(userId)
    const groups = await GroupOrder.find({ 'participants.userId': uid, status: { $ne: 'cancelled' } })
      .select('groupId status product.name product.image participants.userId participants.qty participants.paymentStatus deadline updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean() as any[]

    const lots = groups.map(g => {
      const me = (g.participants || []).find((p: any) => p.userId && String(p.userId) === userId) || {}
      const paid = me.paymentStatus === 'paid'
      return {
        groupId: g.groupId,
        name: g.product?.name,
        image: g.product?.image || null,
        qty: Number(me.qty) || 0,
        status: g.status,
        paid,
        resellable: g.status === RESALE_READY && paid,
        path: `/achats-groupes/${g.groupId}`,
        resellPath: `/espace-vendeur?resell=${encodeURIComponent(g.groupId)}`,
      }
    })
    return NextResponse.json({ lots })
  } catch (err) {
    console.error('[POST /api/internal/market/my-group-lots]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
