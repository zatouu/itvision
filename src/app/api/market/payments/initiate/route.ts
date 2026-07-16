import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import Payment from '@/lib/models/Payment'
import { initiatePayment, PaymentProvider, InitiateResult } from '@/lib/payment'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'

const VALID_PROVIDERS: PaymentProvider[] = ['wave', 'orange_money', 'free_money', 'cash']
const isDev = process.env.NODE_ENV !== 'production' || process.env.PAYMENTS_MOCK === 'true'

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimitRequest(request, { windowMs: 60_000, max: 5, keyPrefix: 'market:payment:init' })
    if (limit && !limit.ok) {
      return tooManyResponse(limit.retryAfter)
    }

    await connectDB()
    const body = await request.json()
    const { orderId, provider, clientPhone, phase = 'full' } = body

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 })
    }

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'provider requis (wave|orange_money|free_money|cash)' }, { status: 400 })
    }

    if (!clientPhone || typeof clientPhone !== 'string') {
      return NextResponse.json({ error: 'clientPhone requis' }, { status: 400 })
    }

    const order = await Order.findOne({ orderId })
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (order.paymentStatus === 'completed') {
      return NextResponse.json({ error: 'Commande déjà payée' }, { status: 409 })
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

    const amount = Math.max(order.total || 0, 100)
    const description = `DDM+ Marketplace - Commande ${orderId}`
    const clientId = order.clientId ? String(order.clientId) : orderId

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
      orderType: 'marketplace',
      domain: 'marketplace',
      clientId,
      amount,
      provider,
      phase,
      status: 'pending',
      externalId: result.externalId,
      checkoutUrl: result.checkoutUrl,
      useEscrow: true,
    })

    order.paymentMethod = provider
    order.transactionId = result.externalId
    await order.save()

    // En dev ou cash : simuler le paiement confirmé pour permettre les tests sans compte marchand
    if (isDev || provider === 'cash') {
      payment.status = 'held'
      payment.heldAt = new Date()
      await payment.save()

      order.paymentStatus = 'completed'
      order.status = 'confirmed'
      order.confirmedAt = new Date()
      await order.save()
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
