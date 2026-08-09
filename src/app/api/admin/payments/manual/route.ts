import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { connectMongoose } from '@/lib/mongoose'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { creditPoints, refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'

/**
 * Validation manuelle des paiements QR statiques (Wave QR marchand).
 * GET  → liste des paiements/topups en attente de confirmation
 * POST → { kind: 'payment'|'topup', id, action: 'confirm'|'reject', note? }
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  await connectMongoose()
  const [payments, topups] = await Promise.all([
    Payment.find({ manualConfirm: true, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    TopupPayment.find({ manualConfirm: true, status: 'pending' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ])
  return NextResponse.json({ success: true, payments, topups })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()
    const { kind, id, action, note } = await request.json()
    if (!['payment', 'topup'].includes(kind) || !id || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    if (kind === 'payment') {
      const payment = await Payment.findById(id)
      if (!payment) return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
      if (payment.status !== 'pending') {
        return NextResponse.json({ error: `Déjà traité (${payment.status})` }, { status: 409 })
      }

      if (action === 'confirm') {
        payment.status = 'held'
        payment.heldAt = new Date()
        await payment.save()

        if (payment.requestId && payment.offerId) {
          const sr = await ServiceRequest.findById(payment.requestId)
          const offer = await Offer.findById(payment.offerId)
          if (sr && offer) {
            await acceptOfferForRequest({
              serviceRequest: sr,
              offer,
              securePayment: payment.useEscrow !== false,
              notifyClientPaymentHeld: payment.useEscrow !== false,
              amount: payment.amount,
            })
          }
        }

        await sendPushToUser(String(payment.clientId), {
          title: 'Paiement confirmé',
          body: `Votre paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA a été confirmé.`,
          data: { type: 'payment:held', requestId: String(payment.requestId || '') },
        }).catch(() => {})
      } else {
        payment.status = 'failed'
        payment.failedAt = new Date()
        payment.failReason = note || 'Non reçu sur le compte marchand'
        await payment.save()
        const escrowCost = payment.escrowPointsCharged || 0
        if (escrowCost > 0) {
          await refundEscrowPoints(String(payment.clientId), String(payment.requestId), escrowCost).catch(() => {})
        }
        await sendPushToUser(String(payment.clientId), {
          title: 'Paiement non confirmé',
          body: `Le paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA n'a pas été retrouvé. Contactez le support.`,
          data: { type: 'payment:failed', requestId: String(payment.requestId || '') },
        }).catch(() => {})
      }
      return NextResponse.json({ success: true, status: payment.status })
    }

    // kind === 'topup'
    const topup = await TopupPayment.findById(id)
    if (!topup) return NextResponse.json({ error: 'Recharge introuvable' }, { status: 404 })
    if (topup.status !== 'pending') {
      return NextResponse.json({ error: `Déjà traitée (${topup.status})` }, { status: 409 })
    }

    if (action === 'confirm') {
      topup.status = 'successful'
      topup.completedAt = new Date()
      await topup.save()
      const totalCredits = topup.points + (topup.bonusCredits || 0)
      await creditPoints(String(topup.userId), totalCredits, 'topup', {
        description: `Recharge ${totalCredits} XC (${topup.amountFcfa} FCFA via Wave QR)`,
        paymentRef: topup.externalId,
      })
      await sendPushToUser(String(topup.userId), {
        title: 'Recharge confirmée',
        body: `${totalCredits} XC ont été crédités sur votre portefeuille.`,
        data: { type: 'wallet:credited' },
      }).catch(() => {})
    } else {
      topup.status = 'failed'
      topup.failReason = note || 'Non reçu sur le compte marchand'
      await topup.save()
      await sendPushToUser(String(topup.userId), {
        title: 'Recharge non confirmée',
        body: `Votre recharge de ${topup.amountFcfa.toLocaleString('fr-FR')} FCFA n'a pas été retrouvée. Contactez le support.`,
        data: { type: 'wallet:failed' },
      }).catch(() => {})
    }
    return NextResponse.json({ success: true, status: topup.status })
  } catch (e: any) {
    console.error('[POST /api/admin/payments/manual]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
