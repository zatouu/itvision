import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import mongoose from 'mongoose'

// Approvisionnement du vendeur : ses propres commandes + participations
// aux achats groupés — c'est son futur stock à revendre.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth || !auth.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const userId = new mongoose.Types.ObjectId(auth.user.id)

    const [orders, groupParticipations] = await Promise.all([
      Order.find({ clientId: userId }).sort({ createdAt: -1 }).limit(50).lean() as Promise<any[]>,
      GroupOrder.find({ 'participants.userId': userId }).sort({ updatedAt: -1 }).limit(50).lean() as Promise<any[]>,
    ])

    return NextResponse.json({
      success: true,
      purchases: orders.map(o => ({
        id: String(o._id),
        type: 'order',
        orderId: o.orderId,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        createdAt: o.createdAt,
        items: (o.items || []).map((i: any) => ({
          name: i.productName || i.name,
          qty: i.quantity || i.qty || 1,
          price: i.price || i.unitPrice || 0,
          image: i.productImage || i.image,
        })),
      })),
      groupBuys: groupParticipations.map(g => {
        const me = (g.participants || []).find((p: any) => String(p.userId) === String(userId))
        const progress = g.targetQty > 0 ? Math.min(100, Math.round((g.currentQty / g.targetQty) * 100)) : 0
        return {
          id: String(g._id),
          type: 'group',
          groupId: g.groupId,
          productName: g.product?.name || 'Produit',
          image: g.product?.image,
          status: g.status,
          myQty: me?.qty || 0,
          myStatus: me?.paymentStatus || 'pending',
          myTotal: me?.totalAmount || 0,
          progress,
          currentQty: g.currentQty,
          targetQty: g.targetQty,
          deadline: g.deadline,
          unitPrice: g.currentUnitPrice,
        }
      }),
    })
  } catch (error) {
    console.error('GET /api/vendor/purchases error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
