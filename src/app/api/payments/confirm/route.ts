import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import Payment from '@/lib/models/Payment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { checkPaymentStatus } from '@/lib/payment'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'

/**
 * POST /api/payments/confirm
 *
 * Client-triggered payment confirmation fallback.
 * Called after the user returns from the Wave app or clicks "I've paid".
 *
 * Flow:
 * 1. Find the pending payment for this requestId + clientId
 * 2. If mock mode → auto-confirm
 * 3. If provider API available → query real status
 * 4. Confirm ONLY when the provider reports 'succeeded'. 'unknown' (provider API
 *    down/unconfigured) stays pending — webhook or admin validation decides.
 * 5. Transition payment to 'held' + accept offer + start mission
 */
export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimitRequest(request, { windowMs: 30_000, max: 5, keyPrefix: 'payments:confirm' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { requestId, paymentId } = await request.json()

    if (!requestId && !paymentId) {
      return NextResponse.json({ error: 'requestId ou paymentId requis' }, { status: 400 })
    }

    const query: any = { status: 'pending', clientId: String(userId) }
    if (paymentId) query._id = paymentId
    else if (requestId) query.requestId = requestId

    const payment = await Payment.findOne(query).sort({ createdAt: -1 })
    if (!payment) {
      // Check if there's already a held payment — maybe webhook already fired
      const heldQuery: any = { clientId: String(userId), status: 'held' }
      if (paymentId) heldQuery._id = paymentId
      else if (requestId) heldQuery.requestId = requestId
      const held = await Payment.findOne(heldQuery).sort({ createdAt: -1 })
      if (held) {
        return NextResponse.json({ success: true, status: 'held', payment: held, alreadyConfirmed: true })
      }
      return NextResponse.json({ error: 'Aucun paiement en attente trouvé' }, { status: 404 })
    }

    // 1. Query provider API for real status
    const checkResult = await checkPaymentStatus(payment.provider, payment.externalId)

    if (checkResult.status === 'failed') {
      payment.status = 'failed'
      payment.failedAt = new Date()
      payment.failReason = `Provider check: ${checkResult.status}`
      payment.confirmedBy = 'client'
      await payment.save()

      // Refund escrow points
      if (payment.escrowPointsCharged > 0) {
        await refundEscrowPoints(String(payment.clientId), String(payment.requestId), payment.escrowPointsCharged).catch(() => {})
      }

      return NextResponse.json({ success: false, status: 'failed', error: 'Paiement échoué côté provider' })
    }

    // 2. Confirmer UNIQUEMENT si le provider dit 'succeeded'. Un statut
    //    'unknown' (API provider en panne, non configurée, ou flux manuel QR)
    //    ne doit JAMAIS confirmer — sinon un client peut valider une mission
    //    sans avoir payé, et l'escrow serait libéré au prestataire en fin de mission.
    const shouldConfirm = checkResult.status === 'succeeded'

    if (!shouldConfirm) {
      if (checkResult.status === 'unknown') {
        // Alerte opérationnelle : l'API provider ne répond pas — la confirmation
        // repose alors uniquement sur le webhook signé ou la validation admin.
        console.warn(`[payments/confirm] Statut provider inconnu (provider=${payment.provider}, payment=${payment._id}) — pas de confirmation client`)
      }
      if (payment.manualConfirm) {
        return NextResponse.json({
          success: true,
          status: 'pending',
          manualConfirm: true,
          message: 'Paiement manuel en attente de validation par nos équipes'
        })
      }
      return NextResponse.json({ success: true, status: 'pending', payment, message: 'Paiement encore en cours côté provider' })
    }

    // 3. Transition to held
    payment.status = 'held'
    payment.heldAt = new Date()
    payment.confirmedBy = 'client'
    await payment.save()

    // 4. Accept offer + start mission (unless balance phase)
    if (payment.phase !== 'balance' && payment.requestId) {
      const sr = await ServiceRequest.findById(payment.requestId)
      const offer = await Offer.findById(payment.offerId)
      if (sr && offer) {
        try {
          await acceptOfferForRequest({
            serviceRequest: sr,
            offer,
            securePayment: payment.useEscrow !== false,
            notifyClientPaymentHeld: payment.useEscrow !== false,
            amount: payment.amount,
          })
        } catch (acceptErr: any) {
          console.error('[payments/confirm] acceptOfferForRequest error:', acceptErr)
          // Payment is held but mission acceptance failed — don't block the client
        }
      }
    }

    // 5. Notify client
    void sendPushToUser(String(payment.clientId), {
      title: '✅ Paiement confirmé',
      body: `${payment.amount.toLocaleString('fr-FR')} FCFA — mission démarrée.`,
      data: { type: 'payment:confirmed', requestId: String(payment.requestId) },
    })

    return NextResponse.json({
      success: true,
      status: 'held',
      payment,
      confirmedBy: payment.confirmedBy,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/payments/confirm]', e)
    return NextResponse.json({ error: 'Erreur confirmation paiement' }, { status: 500 })
  }
}
