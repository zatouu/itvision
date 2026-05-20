import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'

/**
 * GET /api/payment/status?reference=XXX
 * Vérifie le statut de paiement d'une commande (polling côté client).
 */
export async function GET(request: NextRequest) {
  try {
    const reference = request.nextUrl.searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    await connectDB()

    // 1. Chercher dans les commandes groupées
    const groupOrder = await GroupOrder.findOne({
      'participants.paymentReference': reference
    })

    if (groupOrder) {
      const participant = groupOrder.participants.find(
        (p: any) => p.paymentReference === reference
      )
      if (participant) {
        return NextResponse.json({
          status: participant.paymentStatus || 'pending',
          reference,
          type: 'group',
          groupId: groupOrder.groupId
        })
      }
    }

    // 2. Chercher dans les commandes standard
    const standardOrder = await Order.findOne({ orderId: reference })

    if (standardOrder) {
      const status =
        standardOrder.paymentStatus === 'completed' || standardOrder.paymentStatus === 'paid'
          ? 'paid'
          : standardOrder.paymentStatus || 'pending'

      return NextResponse.json({ status, reference, type: 'order', orderId: standardOrder.orderId })
    }

    return NextResponse.json({ status: 'not_found', reference }, { status: 404 })
  } catch (error: any) {
    console.error('[Payment Status] Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
