import crypto from 'crypto'
import Payment from '@/lib/models/Payment'
import TopupPayment from '@/lib/models/TopupPayment'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import { Order } from '@/lib/models/Order'
import { acceptOfferForRequest } from '@/lib/service-acceptance'
import { creditPoints, refundEscrowPoints } from '@/lib/wallet'
import { sendPushToUser } from '@/lib/push'
import { confirmPayment } from '@/lib/payment-fulfillment'
import { emailService } from '@/lib/email-service'
import { MARKET_BRAND } from '@/lib/branding'

/**
 * Validation manuelle des paiements sans API provider (Wave pay-link, OM, Free).
 *
 * Un paiement `manualConfirm` ne peut pas être vérifié automatiquement : le client
 * paie sur le compte marchand, l'admin reçoit un email avec un lien signé HMAC et
 * confirme ou décline la réception. Le token signé remplace la session admin —
 * il est mono-objet (kind+id), expirant (7 j) et idempotent (statut ≠ pending = déjà traité).
 */

const REVIEW_TTL_MS = 7 * 24 * 3600 * 1000

function reviewSecret(): string {
  return process.env.MANUAL_REVIEW_SECRET || process.env.JWT_SECRET || ''
}

export function signReviewToken(kind: 'payment' | 'topup', id: string): string | null {
  const secret = reviewSecret()
  if (!secret) return null
  const body = Buffer.from(JSON.stringify({ k: kind, id, exp: Date.now() + REVIEW_TTL_MS })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyReviewToken(token: string): { kind: 'payment' | 'topup'; id: string } | null {
  const secret = reviewSecret()
  const [body, sig] = token.split('.')
  if (!secret || !body || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  if (sig.length !== expected.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!data.exp || data.exp < Date.now()) return null
    if (data.k !== 'payment' && data.k !== 'topup' || !data.id) return null
    return { kind: data.k, id: String(data.id) }
  } catch {
    return null
  }
}

const PROVIDER_LABELS: Record<string, string> = {
  wave: 'Wave', wave_qr: 'Wave', orange_money: 'Orange Money',
  free_money: 'Free Money', cash: 'Espèces',
}

export function providerLabel(provider?: string): string {
  return PROVIDER_LABELS[provider || ''] || provider || 'Inconnu'
}

/**
 * Notifie l'admin qu'un paiement manuel attend sa vérification.
 * Email avec lien signé vers /api/payments/manual-review (page de décision).
 */
export async function sendManualReviewEmail(params: {
  kind: 'payment' | 'topup'
  id: string
  reference: string
  amount: number
  provider?: string
  clientPhone?: string
  clientName?: string
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || MARKET_BRAND.contactEmail
  if (!adminEmail) return

  const token = signReviewToken(params.kind, params.id)
  if (!token) {
    console.warn('[manual-review] Pas de secret configuré — email de validation impossible')
    return
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || MARKET_BRAND.url || '').replace(/\/$/, '')
  const reviewUrl = `${base}/api/payments/manual-review?token=${encodeURIComponent(token)}`
  const amount = `${(params.amount || 0).toLocaleString('fr-FR')} FCFA`

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px">${label}</td><td style="padding:6px 12px;font-weight:600;font-size:13px">${value}</td></tr>`

  await emailService.sendEmail({
    to: adminEmail,
    fromName: MARKET_BRAND.name,
    brand: MARKET_BRAND,
    subject: `Paiement à vérifier — ${params.reference} (${amount})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0f172a">Paiement ${providerLabel(params.provider)} à vérifier</h2>
        <p style="color:#334155;font-size:14px">Un client vient de déclarer un paiement. Vérifiez la réception sur le compte marchand ${providerLabel(params.provider)}, puis validez ou déclinez.</p>
        <table style="border-collapse:collapse;background:#f8fafc;border-radius:8px;width:100%">
          ${row('Référence', params.reference)}
          ${row('Montant attendu', amount)}
          ${row('Moyen', providerLabel(params.provider))}
          ${params.clientPhone ? row('Téléphone client', params.clientPhone) : ''}
          ${params.clientName ? row('Client', params.clientName) : ''}
          ${row('Date', new Date().toLocaleString('fr-FR'))}
        </table>
        <div style="margin:24px 0;text-align:center">
          <a href="${reviewUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700">Examiner le paiement</a>
        </div>
        <p style="color:#94a3b8;font-size:12px">Ce lien est valable 7 jours et ouvre une page de confirmation sécurisée (connexion admin requise ; aucune action n'est exécutée au simple clic).</p>
      </div>`,
  }).catch((e) => console.error('[manual-review] email admin échoué:', e))
}

export interface ManualReviewResult {
  ok: boolean
  status?: string
  error?: string
}

/**
 * Exécute la décision de l'admin (confirm/reject) sur un paiement ou topup manuel.
 * Partagée entre le dashboard (/api/admin/payments/manual) et le lien email signé.
 */
export async function reviewManualPayment(params: {
  kind: 'payment' | 'topup'
  id: string
  action: 'confirm' | 'reject'
  note?: string
  actor: 'admin' | 'email-link'
}): Promise<ManualReviewResult> {
  const { kind, id, action, note } = params

  if (kind === 'payment') {
    const payment = await Payment.findById(id)
    if (!payment) return { ok: false, error: 'Paiement introuvable' }
    if (payment.status !== 'pending') {
      return { ok: false, error: `Déjà traité (${payment.status})`, status: payment.status }
    }

    // Commande standard OU participation d'achat groupé — confirmPayment
    // résout les deux familles de références (CMD-… et AG-…).
    const isMarketplace = payment.domain === 'marketplace' || payment.domain === 'group'
      || payment.orderType === 'marketplace' || payment.orderType === 'group'

    if (action === 'confirm') {
      payment.status = 'held'
      payment.heldAt = new Date()
      payment.confirmedBy = 'admin'
      await payment.save()

      if (isMarketplace) {
        const conf = await confirmPayment({
          reference: String(payment.orderId),
          amount: payment.amount,
          provider: payment.provider as any,
          transactionId: payment.externalId || `ADMIN-${payment._id}`,
        })
        if (!conf.found) {
          console.error(`[manual-review] Commande introuvable pour payment ${payment._id} (orderId=${payment.orderId})`)
        }
      } else if (payment.requestId && payment.offerId) {
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

      if (payment.orderType === 'group' && payment.orderId) {
        // Refus sur participation groupée : repasser le participant en 'pending'
        // (il pourra réessayer) — pas de montant perdu.
        const { GroupOrder } = await import('@/lib/models/GroupOrder')
        await GroupOrder.updateOne(
          { 'participants.paymentReference': payment.orderId },
          { $set: { 'participants.$.paymentStatus': 'pending', 'participants.$.paymentUpdatedAt': new Date() } }
        )
      } else if (isMarketplace && payment.orderId) {
        await Order.updateOne({ orderId: payment.orderId }, { paymentStatus: 'failed' })
        // Avertir le client : push (compte) + email (invité avec adresse connue)
        const order = (await Order.findOne({ orderId: payment.orderId }).select('clientEmail clientPhone').lean()) as any
        if (order?.clientEmail) {
          void emailService.sendEmail({
            to: order.clientEmail,
            fromName: MARKET_BRAND.name,
            brand: MARKET_BRAND,
            subject: `Paiement non confirmé — commande ${payment.orderId}`,
            html: `<p>Votre paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA pour la commande <strong>${payment.orderId}</strong> n'a pas pu être confirmé sur notre compte marchand.</p><p>Si vous avez bien été débité, contactez-nous en répondant à cet email avec votre reçu. Sinon, vous pouvez réessayer depuis votre lien de paiement.</p>`,
          }).catch(() => {})
        }
      }

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
    return { ok: true, status: payment.status }
  }

  // kind === 'topup'
  const topup = await TopupPayment.findById(id)
  if (!topup) return { ok: false, error: 'Recharge introuvable' }
  if (topup.status !== 'pending') {
    return { ok: false, error: `Déjà traitée (${topup.status})`, status: topup.status }
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
  return { ok: true, status: topup.status }
}
