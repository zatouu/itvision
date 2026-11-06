import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import {
  resolvePaymentReference,
  canAccessOrderPayment,
  isPaymentSettled,
  maskName,
  maskPhone,
} from '@/lib/payments/resolve-payment-reference'

/**
 * GET /api/payment/resolve?ref=XXX&token=YYY
 *
 * Résout une référence de paiement pour l'affichage de la page checkout.
 * - Achat groupé (AG-…) : le lien email est la capacité → données masquées.
 * - Commande (CMD-…)   : session propriétaire OU tracking token invité.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = await rateLimitRequest(request, { windowMs: 60_000, max: 20, keyPrefix: 'payment:resolve' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    const reference = request.nextUrl.searchParams.get('ref') || request.nextUrl.searchParams.get('reference')
    const token = request.nextUrl.searchParams.get('token')
    if (!reference) {
      return NextResponse.json({ success: false, error: 'Référence manquante' }, { status: 400 })
    }

    const resolved = await resolvePaymentReference(reference)
    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Référence introuvable' }, { status: 404 })
    }

    if (resolved.type === 'group') {
      return NextResponse.json({
        success: true,
        type: 'group',
        reference: resolved.reference,
        amount: resolved.amount,
        currency: resolved.currency,
        paymentStatus: resolved.paymentStatus,
        settled: isPaymentSettled(resolved),
        participant: {
          name: maskName(resolved.participant.name),
          phone: maskPhone(resolved.participant.phone),
          qty: resolved.participant.qty,
          unitPrice: resolved.participant.unitPrice,
        },
        items: [
          {
            name: resolved.group.productName,
            qty: resolved.participant.qty,
            price: resolved.participant.unitPrice,
            image: resolved.group.productImage,
          },
        ],
        group: {
          groupId: resolved.group.groupId,
          productName: resolved.group.productName,
          status: resolved.group.status,
          deadline: resolved.group.deadline,
        },
      })
    }

    // Commande standard : session propriétaire ou tracking token requis
    const auth = await verifyAuthServer(request).catch(() => null)
    const allowed = canAccessOrderPayment(resolved, {
      userId: auth?.isAuthenticated ? auth.user?.id : null,
      token,
    })
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Non autorisé', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      type: 'order',
      reference: resolved.reference,
      amount: resolved.amount,
      currency: resolved.currency,
      paymentStatus: resolved.paymentStatus,
      settled: isPaymentSettled(resolved),
      customer: {
        name: resolved.order.clientName,
        phone: resolved.order.clientPhone,
      },
      items: resolved.order.items,
      order: {
        orderId: resolved.order.orderId,
        createdAt: resolved.order.createdAt,
      },
    })
  } catch (e) {
    console.error('[payment/resolve] Erreur:', e)
    return NextResponse.json({ success: false, error: 'Erreur interne' }, { status: 500 })
  }
}
