import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Payment from '@/lib/models/Payment'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'

function requireCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('secret') || ''
  const expected = process.env.CRON_SECRET || ''
  if (!expected) {
    console.warn('[CRON RECONCILE] CRON_SECRET non configuré — appel refusé')
    return false
  }
  return secret === expected
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`

/**
 * GET /api/cron/reconcile-payments
 * Réconciliateur quotidien paiements ↔ commandes/groupes.
 *
 * Détecte (sans jamais auto-modifier) :
 *  A. Payment market/group `held|released` alors que la commande n'est pas `paid` (fulfillment manquant)
 *  B. Order `paymentStatus: completed` sans aucun enregistrement Payment (tracking manquant)
 *  C. Payments manuels `pending` + `manualConfirm` de plus de 24 h (file admin en retard)
 *  D. Séquestres `held` de plus de 7 jours
 *  E. Groupes `open` dont la deadline est dépassée (non traités par le cron reminders)
 *  F. Participants `paid` dans un groupe `cancelled`/`expired` (remboursements à suivre)
 *
 * Si des anomalies critiques existent (A, E-payé, F), un email d'alerte est envoyé à l'admin.
 */
export async function GET(request: NextRequest) {
  if (!requireCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  }

  try {
    await connectMongoose()

    const now = new Date()
    const day1Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const week1Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // ── A. Paiements confirmés sans fulfillment ──────────────────────
    const confirmedPayments = await Payment.find({
      domain: { $in: ['marketplace', 'group'] },
      status: { $in: ['held', 'released'] },
      createdAt: { $gte: days90Ago }
    }).select('orderId orderType status amount createdAt').lean() as any[]

    const orderIds = confirmedPayments.filter(p => p.orderType === 'marketplace').map(p => p.orderId)
    const groupIds = confirmedPayments.filter(p => p.orderType === 'group').map(p => p.orderId)

    const [linkedOrders, linkedGroups] = await Promise.all([
      Order.find({ orderId: { $in: orderIds } }).select('orderId paymentStatus status').lean() as any,
      GroupOrder.find({ groupId: { $in: groupIds } }).select('groupId status participants.paymentStatus').lean() as any,
    ])

    const orderByRef = new Map((linkedOrders as any[]).map(o => [o.orderId, o]))
    const groupByRef = new Map((linkedGroups as any[]).map(g => [g.groupId, g]))

    const fulfillmentMissing: any[] = []
    for (const p of confirmedPayments) {
      if (p.orderType === 'marketplace') {
        const o = orderByRef.get(p.orderId)
        if (!o || (o.paymentStatus !== 'completed' && o.paymentStatus !== 'partial')) {
          fulfillmentMissing.push({ ref: p.orderId, kind: 'order', paymentStatus: p.status, orderStatus: o?.paymentStatus || 'introuvable', amount: p.amount })
        }
      } else if (p.orderType === 'group') {
        const g = groupByRef.get(p.orderId)
        const anyPaid = (g?.participants || []).some((x: any) => x.paymentStatus === 'paid' || x.paymentStatus === 'partial')
        if (!g || !anyPaid) {
          fulfillmentMissing.push({ ref: p.orderId, kind: 'group', paymentStatus: p.status, groupStatus: g?.status || 'introuvable', amount: p.amount })
        }
      }
    }

    // ── B. Commandes payées sans trace Payment ───────────────────────
    const paidOrders = await Order.find({
      paymentStatus: 'completed',
      createdAt: { $gte: days90Ago },
      $or: [{ domain: 'marketplace' }, { domain: { $exists: false } }, { domain: null }]
    }).select('orderId total createdAt').lean() as any[]

    // Un Payment peut être pending/failed — on veut savoir s'il existe, pas son statut
    const allPaymentRefs = new Set(
      (await Payment.find({ orderId: { $in: paidOrders.map(o => o.orderId) } }).select('orderId').lean() as any[]).map(p => p.orderId)
    )
    const paidWithoutTracking = paidOrders.filter(o => !allPaymentRefs.has(o.orderId)).map(o => o.orderId)

    // ── C. File de validation manuelle en retard (> 24 h) ────────────
    const staleManualCount = await Payment.countDocuments({
      status: 'pending', manualConfirm: true, createdAt: { $lt: day1Ago }
    })

    // ── D. Séquestres bloqués (> 7 j) ────────────────────────────────
    const stuckEscrow = await Payment.find({
      status: 'held', createdAt: { $lt: week1Ago }
    }).select('orderId amount createdAt').lean() as any[]

    // ── E. Groupes expirés encore ouverts ────────────────────────────
    const expiredOpenGroups = await GroupOrder.find({
      status: 'open', deadline: { $lt: now }
    }).select('groupId deadline participants').lean() as any[]

    const expiredWithPaid = expiredOpenGroups.filter(g =>
      (g.participants || []).some((p: any) => p.paymentStatus === 'paid' || p.paymentStatus === 'partial')
    )

    // ── F. Remboursements à suivre (groupe annulé, argent encaissé) ──
    const refundFollowup = await GroupOrder.find({
      status: 'cancelled',
      'participants.paymentStatus': { $in: ['paid', 'partial'] }
    }).select('groupId participants').lean() as any[]

    const refundDetails = refundFollowup.map(g => ({
      groupId: g.groupId,
      paidParticipants: (g.participants || []).filter((p: any) => p.paymentStatus === 'paid' || p.paymentStatus === 'partial').length,
      amount: (g.participants || []).reduce((s: number, p: any) =>
        (p.paymentStatus === 'paid' || p.paymentStatus === 'partial') ? s + Number(p.paidAmount || p.totalAmount || 0) : s, 0)
    }))

    const report = {
      scannedAt: now.toISOString(),
      anomalies: {
        fulfillmentMissing,          // critique : argent reçu, commande pas à jour
        paidWithoutTracking,         // commandes payées sans Payment
        staleManualCount,            // validations manuelles > 24 h
        stuckEscrowCount: stuckEscrow.length,
        stuckEscrowTotal: stuckEscrow.reduce((s, p) => s + Number(p.amount || 0), 0),
        expiredOpenGroups: expiredOpenGroups.length,
        expiredWithPaid: expiredWithPaid.map(g => g.groupId),
        refundFollowup: refundDetails,
      }
    }

    const critical =
      fulfillmentMissing.length > 0 ||
      expiredWithPaid.length > 0 ||
      refundDetails.length > 0

    if (critical) {
      const adminEmail = process.env.ADMIN_EMAIL || CORPORATE_BRAND.contactEmail
      const lines: string[] = []
      if (fulfillmentMissing.length) {
        lines.push(`<b>${fulfillmentMissing.length} paiement(s) confirmé(s) sans fulfillment :</b><ul>` +
          fulfillmentMissing.map(f => `<li>${f.ref} — ${f.kind} — paiement ${f.paymentStatus}, commande ${f.orderStatus || f.groupStatus} — ${fmt(f.amount)}</li>`).join('') + '</ul>')
      }
      if (expiredWithPaid.length) {
        lines.push(`<b>${expiredWithPaid.length} groupe(s) expiré(s) avec des participants payés :</b> ${expiredWithPaid.map(g => g.groupId).join(', ')}`)
      }
      if (refundDetails.length) {
        lines.push(`<b>${refundDetails.length} groupe(s) annulé(s) — remboursements à suivre :</b><ul>` +
          refundDetails.map(r => `<li>${r.groupId} — ${r.paidParticipants} participant(s) — ${fmt(r.amount)}</li>`).join('') + '</ul>')
      }
      await emailService.sendEmail({
        to: adminEmail,
        subject: `[Réconciliation] ${fulfillmentMissing.length + expiredWithPaid.length + refundDetails.length} anomalie(s) paiement détectée(s)`,
        html: `<p>Le réconciliateur quotidien a détecté des incohérences paiements/commandes :</p>${lines.join('')}<p>Connectez-vous au dashboard admin pour traiter.</p>`,
        brand: CORPORATE_BRAND,
      })
    }

    console.log('[CRON RECONCILE]', JSON.stringify(report.anomalies))
    return NextResponse.json({ success: true, critical, ...report })
  } catch (error: any) {
    console.error('[CRON RECONCILE] Erreur:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
