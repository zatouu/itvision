import { NextRequest, NextResponse } from 'next/server'
import { readPaymentSettings } from '@/lib/payments/settings'
import { getActivePaymentGateway } from '@/lib/payment-gateway'
import { verifyAuthServer } from '@/lib/auth-server'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import {
  resolvePaymentReference,
  canAccessOrderPayment,
  isPaymentSettled,
} from '@/lib/payments/resolve-payment-reference'

/**
 * POST /api/payment/checkout/init
 * { reference, token? } → crée une session de paiement sur la gateway active.
 *
 * - Référence AG-… (achat groupé) : pay-by-link — la référence reçue par email
 *   est la capacité, aucune session requise (les données client viennent de la
 *   DB, jamais du corps de la requête).
 * - Référence CMD-… (commande) : session propriétaire OU tracking token invité.
 */
export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitRequest(request, { windowMs: 60_000, max: 10, keyPrefix: 'payment:init' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    const body = await request.json().catch(() => ({}))
    const { reference, token } = body as { reference?: string; token?: string }

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    const auth = await verifyAuthServer(request).catch(() => null)

    const settings = readPaymentSettings()
    const gateway = getActivePaymentGateway(settings)

    const resolved = await resolvePaymentReference(reference)
    if (!resolved) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (resolved.type === 'order') {
      const allowed = canAccessOrderPayment(resolved, {
        userId: auth?.isAuthenticated ? auth.user?.id : null,
        token,
      })
      if (!allowed) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    if (isPaymentSettled(resolved)) {
      return NextResponse.json({ error: 'Déjà payé' }, { status: 400 })
    }

    let description = ''
    let customerName = ''
    let customerPhone = ''
    let customerEmail = ''

    if (resolved.type === 'group') {
      description = `Paiement Achat Groupé #${resolved.group.groupId} - ${resolved.group.productName} (${resolved.participant.qty}x)`
      customerName = resolved.participant.name
      customerPhone = resolved.participant.phone
      customerEmail = resolved.participant.email || ''
    } else {
      description = `Commande #${resolved.order.orderId}`
      customerName = resolved.order.clientName || 'Client'
      customerPhone = resolved.order.clientPhone || ''
      customerEmail = resolved.order.clientEmail || ''
    }

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const configuredBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '')
    const baseUrl = configuredBaseUrl || `${protocol}://${host}`

    // Le token invité est propagé vers la page de retour pour que le client
    // retrouve sa commande sans session.
    const tokenSuffix = resolved.type === 'order' && token ? `&token=${encodeURIComponent(token)}` : ''

    const result = await gateway.createCheckout({
      amount: Math.ceil(resolved.amount),
      reference,
      description,
      customerName,
      customerPhone: customerPhone ? customerPhone.replace(/\+/g, '') : '',
      customerEmail,
      returnUrl: `${baseUrl}/payment/success?ref=${reference}${tokenSuffix}`,
      cancelUrl: `${baseUrl}/payment/cancel?ref=${reference}${tokenSuffix}`,
      callbackUrl: `${baseUrl}/api/payment/${gateway.provider}/callback`
    })

    return NextResponse.json({
      provider: result.provider,
      token: result.token,
      url: result.url
    })
  } catch (error: any) {
    console.error('[Payment Checkout Init] Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
