import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import Payment from '@/lib/models/Payment'
import Offer from '@/lib/models/Offer'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { initiatePayment, InitiateResult, PaymentProvider } from '@/lib/payment'
import { getAppConfig, chargeEscrowPoints, refundEscrowPoints } from '@/lib/wallet'
import { acceptOfferForRequest } from '@/lib/service-acceptance'

const VALID_PROVIDERS: PaymentProvider[] = ['wave', 'orange_money', 'free_money']
const isDev = process.env.NODE_ENV !== 'production'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { offerId, provider, clientPhone } = body

    if (!offerId || !provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'offerId et provider (wave|orange_money|free_money) requis' }, { status: 400 })
    }

    // Vérifier l'offre et la demande
    const offer = await Offer.findById(offerId)
    if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

    const sr = await ServiceRequest.findById(offer.requestId)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Seul le client peut initier le paiement' }, { status: 403 })
    }

    // Vérifier pas de double paiement
    const existing = await Payment.findOne({ offerId, status: { $in: ['pending', 'held'] } })
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        payment: existing,
        message: 'Paiement déjà initié' 
      })
    }

    const amount = offer.price
    const description = `Xeuy – ${sr.category} #${String(sr._id).slice(-6)}`
    const phone = clientPhone || ''

    // ── Débit points escrow client ──
    const cfg = await getAppConfig()
    const useEscrow = cfg.escrow.enabled && (cfg.escrow.mandatory || body.useEscrow !== false)
    const escrowCost = useEscrow ? cfg.monetization.escrowCostPoints : 0
    let escrowPointsCharged = 0
    if (escrowCost > 0) {
      const charge = await chargeEscrowPoints(String(userId), String(sr._id), escrowCost)
      if (!charge) {
        return NextResponse.json({ error: `Solde XC insuffisant. ${escrowCost} XC requis pour l'escrow.` }, { status: 402 })
      }
      escrowPointsCharged = escrowCost
    }

    // Appeler le provider
    let result: InitiateResult
    try {
      result = await initiatePayment(provider, amount, phone, description)
    } catch (paymentErr) {
      if (escrowPointsCharged > 0) {
        await refundEscrowPoints(String(userId), String(sr._id), escrowPointsCharged).catch((refundErr) => {
          console.error('[payments/initiate] rollback escrow points after provider error', refundErr)
        })
      }
      throw paymentErr
    }
    if (!result.success) {
      if (escrowPointsCharged > 0) {
        await refundEscrowPoints(String(userId), String(sr._id), escrowPointsCharged).catch((refundErr) => {
          console.error('[payments/initiate] rollback escrow points after failed initiation', refundErr)
        })
      }
      return NextResponse.json({ error: result.error || 'Échec initiation paiement' }, { status: 502 })
    }

    // Créer le Payment
    let payment
    try {
      payment = await Payment.create({
        requestId: sr._id,
        offerId: offer._id,
        clientId: userId,
        providerId: offer.providerId,
        amount,
        provider,
        status: 'pending',
        useEscrow,
        externalId: result.externalId,
        checkoutUrl: result.checkoutUrl,
        escrowPointsCharged,
      })
    } catch (createErr) {
      if (escrowPointsCharged > 0) {
        await refundEscrowPoints(String(userId), String(sr._id), escrowPointsCharged).catch((refundErr) => {
          console.error('[payments/initiate] rollback escrow points after payment create error', refundErr)
        })
      }
      throw createErr
    }

    if (isDev) {
      payment.status = 'held'
      payment.heldAt = new Date()
      await payment.save()
      await acceptOfferForRequest({
        serviceRequest: sr,
        offer,
        securePayment: useEscrow,
        notifyClientPaymentHeld: useEscrow,
        amount,
      })
    }

    return NextResponse.json({ 
      success: true, 
      payment,
      checkoutUrl: result.checkoutUrl,
      useEscrow,
      escrowPointsCharged,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/initiate]', e)
    return NextResponse.json({ error: 'Erreur paiement' }, { status: 500 })
  }
}
