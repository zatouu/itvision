import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { initiatePayment, PaymentProvider } from '@/lib/payment'
import { creditPoints, getAppConfig, getOrCreateWallet } from '@/lib/wallet'
import TopupPayment from '@/lib/models/TopupPayment'

const VALID_PROVIDERS: PaymentProvider[] = ['wave', 'orange_money', 'free_money']
const MIN_POINTS = 10
const MAX_POINTS = 10000

const isDev = process.env.NODE_ENV !== 'production'

export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, serviceWriteRateLimiter)
  if (rl) return rl

  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const points = Number(body.points)
    const provider = body.provider as PaymentProvider
    const payPhone = (body.phone || '').toString().trim()

    if (!Number.isFinite(points) || !Number.isInteger(points) || points < MIN_POINTS || points > MAX_POINTS) {
      return NextResponse.json(
        { error: `Quantité de points invalide (entre ${MIN_POINTS} et ${MAX_POINTS})` },
        { status: 400 }
      )
    }
    if (!VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Opérateur de paiement invalide' }, { status: 400 })
    }
    if (!payPhone) {
      return NextResponse.json({ error: 'Numéro de paiement requis' }, { status: 400 })
    }

    const cfg = await getAppConfig()
    const amountFcfa = points * cfg.monetization.fcfaPerPoint

    const result = await initiatePayment(
      provider,
      amountFcfa,
      payPhone,
      `Recharge ${points} XC Xeuy`
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Échec de l\'initiation du paiement' }, { status: 502 })
    }

    // En dev, le paiement est mocké et confirmé instantanément → on crédite tout de suite.
    // En prod, le crédit doit être confirmé par le webhook opérateur (paiement réel).
    if (isDev) {
      const { balance } = await creditPoints(String(userId), points, 'topup', {
        description: `Recharge ${points} XC (${amountFcfa} FCFA via ${provider})`,
        paymentRef: result.externalId,
      })
      return NextResponse.json({
        success: true,
        confirmed: true,
        points,
        amountFcfa,
        balance,
        externalId: result.externalId,
      })
    }

    // Prod : paiement en attente de confirmation webhook
    const topup = await TopupPayment.create({
      userId: String(userId),
      points,
      amountFcfa,
      provider,
      status: 'pending',
      externalId: result.externalId,
      checkoutUrl: result.checkoutUrl,
      phone: payPhone,
    })
    const wallet = await getOrCreateWallet(String(userId))
    return NextResponse.json({
      success: true,
      confirmed: false,
      points,
      amountFcfa,
      balance: wallet.points,
      externalId: result.externalId,
      checkoutUrl: result.checkoutUrl,
      topupId: topup._id,
      message: 'Paiement initié. Vos XC seront crédités après confirmation.',
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    console.error('[POST /api/wallet/topup]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
