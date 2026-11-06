import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import Payment from '@/lib/models/Payment'
import { initiatePayment, PaymentProvider, InitiateResult } from '@/lib/payment'
import { confirmPayment } from '@/lib/payment-fulfillment'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { paymentInitSchema, validate } from '@/lib/validation'
import { readPaymentSettings } from '@/lib/payments/settings'
import { sendManualReviewEmail } from '@/lib/payments/manual-review'
import { resolvePaymentReference, type ResolvedGroupPayment } from '@/lib/payments/resolve-payment-reference'
import { verifyAuthServer } from '@/lib/auth-server'
import crypto from 'crypto'

function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const VALID_PROVIDERS: PaymentProvider[] = ['wave', 'orange_money', 'free_money', 'cash']

// Mock si : dev local, PAYMENTS_MOCK=true, ou toggle admin activé (sans redémarrage)
function isMockMode(): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  try {
    return readPaymentSettings().providers.mockEnabled
  } catch {
    return process.env.PAYMENTS_MOCK === 'true'
  }
}

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitRequest(request, { windowMs: 60_000, max: 5, keyPrefix: 'market:payment:init' })
    if (limit && !limit.ok) {
      return tooManyResponse(limit.retryAfter)
    }

    await connectDB()
    const rawBody = await request.json()
    const validated = validate(paymentInitSchema, rawBody)
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }
    const { orderId, provider, clientPhone, phase } = validated.data

    // Référence CMD-… → commande standard ; AG-… → participant d'achat groupé
    // (pay-by-link : la référence elle-même est la capacité, pas de session requise).
    const order: any = await Order.findOne({ orderId })
    let groupPayment: ResolvedGroupPayment | null = null
    if (!order) {
      const resolved = await resolvePaymentReference(orderId)
      if (resolved?.type === 'group') groupPayment = resolved
    }
    if (!order && !groupPayment) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (order) {
      // Autorisation : authentifié et propriétaire, ou token de suivi valide
      const auth = await verifyAuthServer(request).catch(() => null)
      const isOwner = auth?.user?.id && order.clientId && String(order.clientId) === String(auth.user.id)
      const token = rawBody?.token
      const tokenValid = token ? order.trackingAccessTokenHash === hashTrackingToken(token) : false
      if (!isOwner && !tokenValid) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      // Vérifier que le téléphone correspond à la commande
      if (clientPhone && order.clientPhone && clientPhone.replace(/\+/g, '') !== order.clientPhone.replace(/\+/g, '')) {
        return NextResponse.json({ error: 'Téléphone non reconnu pour cette commande' }, { status: 403 })
      }

      if (order.paymentStatus === 'completed') {
        return NextResponse.json({ error: 'Commande déjà payée' }, { status: 409 })
      }
    } else if (groupPayment!.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Participation déjà payée' }, { status: 409 })
    }

    // Vérifier un paiement en cours existant
    const existing = await Payment.findOne({
      orderId,
      provider,
      status: { $in: ['pending', 'held'] },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        payment: existing,
        checkoutUrl: existing.checkoutUrl,
        message: 'Paiement déjà initié',
      })
    }

    const amount = Math.max(groupPayment ? groupPayment.amount : order.total || 0, 100)
    const description = groupPayment
      ? `DDM+ Achat groupé ${groupPayment.group.groupId} - ${groupPayment.group.productName}`
      : `DDM+ Marketplace - Commande ${orderId}`
    const clientId = groupPayment
      ? (groupPayment.participant.userId || orderId)
      : (order.clientId ? String(order.clientId) : orderId)

    let result: InitiateResult
    try {
      result = await initiatePayment(provider, amount, clientPhone, description)
    } catch (paymentErr: any) {
      console.error('[market/payments/initiate] provider error', paymentErr)
      return NextResponse.json(
        { error: paymentErr.message || 'Échec initiation paiement' },
        { status: 502 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Échec initiation paiement' },
        { status: 502 }
      )
    }

    const payment = await Payment.create({
      orderId,
      orderType: groupPayment ? 'group' : 'marketplace',
      domain: groupPayment ? 'group' : 'marketplace',
      clientId,
      amount,
      provider,
      phase,
      status: 'pending',
      externalId: result.externalId,
      checkoutUrl: result.checkoutUrl,
      useEscrow: true,
      // Paiement manuel (lien/QR Wave marchand) : doit apparaître dans la file
      // de validation admin — sinon la commande resterait bloquée sans recours.
      manualConfirm: !!result.manualConfirm,
    })

    if (order) {
      order.paymentMethod = provider
      order.transactionId = result.externalId
      await order.save()
    }

    // Paiement manuel (pas d'API provider) : alerter l'admin par email avec un
    // lien de vérification signé — le client verra « en attente de confirmation ».
    if (payment.manualConfirm && !isMockMode()) {
      void sendManualReviewEmail({
        kind: 'payment',
        id: String(payment._id),
        reference: orderId,
        amount,
        provider: payment.provider,
        clientPhone: order?.clientPhone || groupPayment?.participant.phone,
        clientName: order?.clientName || groupPayment?.participant.name,
      })
    }

    // En dev : simuler le paiement confirmé pour permettre les tests sans compte marchand
    if (isMockMode()) {
      payment.status = 'held'
      payment.heldAt = new Date()
      await payment.save()

      if (order) {
        order.paymentStatus = 'completed'
        order.status = 'confirmed'
        order.confirmedAt = new Date()
        await order.save()
      } else {
        // Participant groupe : confirmation canonique (idempotente)
        await confirmPayment({
          reference: orderId,
          amount,
          provider: provider as any,
          transactionId: result.externalId || `MOCK-${payment._id}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      payment,
      checkoutUrl: result.checkoutUrl,
    })
  } catch (error: any) {
    console.error('[POST /api/market/payments/initiate]', error)
    return NextResponse.json(
      { error: error.message || 'Erreur paiement' },
      { status: 500 }
    )
  }
}
