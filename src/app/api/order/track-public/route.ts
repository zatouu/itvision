import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { orderStatusMeta, isPaymentSettled } from '@/lib/order-status'

/**
 * GET /api/order/track-public?ref=CMD-...
 *
 * Suivi public masqué d'une commande (page /suivi). Retourne uniquement le
 * statut et les jalons — aucune donnée personnelle, aucun montant.
 * Le détail complet reste derrière /api/order/[orderId] (session ou token).
 */
export async function GET(req: NextRequest) {
  try {
    const limit = await rateLimitRequest(req, { windowMs: 60_000, max: 30, keyPrefix: 'order:track' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    const ref = req.nextUrl.searchParams.get('ref')?.trim()
    if (!ref) {
      return NextResponse.json({ success: false, error: 'Référence manquante' }, { status: 400 })
    }

    await connectDB()

    const order = await Order.findOne({ orderId: ref })
      .select('orderId status paymentStatus createdAt delivery items')
      .lean() as any

    if (!order) {
      return NextResponse.json({ success: false, error: 'Référence introuvable' }, { status: 404 })
    }

    const meta = orderStatusMeta(order.status)
    const delivery = order.delivery || {}

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        statusUi: meta.ui,
        statusLabel: meta.label,
        step: meta.step,
        paid: isPaymentSettled(order.paymentStatus),
        createdAt: order.createdAt,
        itemCount: Array.isArray(order.items) ? order.items.length : 0,
        eta: delivery.estimatedDeliveryDate || delivery.eta || null,
        carrier: delivery.carrier || null,
        trackingNumber: delivery.trackingNumber || null,
      },
    })
  } catch (e) {
    console.error('[track-public] Erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}
