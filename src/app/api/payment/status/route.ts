import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { Order } from '@/lib/models/Order'
import { applyRateLimit, authRateLimiter } from '@/lib/rate-limiter'

/**
 * GET /api/payment/status?reference=XXX
 * Vérifie le statut de paiement d'une commande (polling côté client).
 */
export async function GET(request: NextRequest) {
  try {
    // Les références de paiement sont partiellement prévisibles — limiter l'énumération
    const rateLimitResponse = await applyRateLimit(request, authRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const reference = request.nextUrl.searchParams.get('reference')

    if (!reference) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    await connectDB()

    // 0. Transport au poids réel
    if (reference.startsWith('TR-')) {
      const g = await GroupOrder.findOne({ 'participants.transport.paymentReference': reference }).select('groupId participants').lean() as any
      const p = g?.participants?.find((x: any) => x.transport?.paymentReference === reference)
      if (p) {
        return NextResponse.json({ status: p.transport.paymentStatus === 'paid' ? 'paid' : 'pending', reference, type: 'group', groupId: g.groupId, paymentMethod: p.transport.paymentMethod || undefined })
      }
      const o = await Order.findOne({ 'shippingAdjustment.paymentReference': reference }).select('orderId shippingAdjustment').lean() as any
      if (o?.shippingAdjustment) {
        return NextResponse.json({ status: o.shippingAdjustment.status === 'paid' ? 'paid' : 'pending', reference, type: 'order', orderId: o.orderId, paymentMethod: o.shippingAdjustment.paymentMethod || undefined })
      }
      return NextResponse.json({ status: 'not_found', reference }, { status: 404 })
    }

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
          groupId: groupOrder.groupId,
          paymentMethod: participant.paymentMethod || undefined
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

      return NextResponse.json({
        status,
        reference,
        type: 'order',
        orderId: standardOrder.orderId,
        paymentMethod: standardOrder.paymentMethod || undefined
      })
    }

    return NextResponse.json({ status: 'not_found', reference }, { status: 404 })
  } catch (error: any) {
    console.error('[Payment Status] Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
