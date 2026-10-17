import { GroupOrder } from '@/lib/models/GroupOrder'
import GroupInterest from '@/lib/models/GroupInterest'
import { assignPaymentRefsAndNotify } from '@/lib/group-order-helpers'
import { notifyStatusUpdate } from '@/lib/group-order-notifications'
import { notifyAdmins } from '@/lib/notify'
import { sendSms } from '@/lib/sms'
import { formatPhone } from '@/lib/payment-service'
import { MARKET_BRAND } from '@/lib/branding'

/**
 * « Me prévenir » : SMS unique aux visiteurs intéressés quand un groupe ouvert se termine dans moins de 24 h.
 * Les personnes déjà inscrites entre-temps ne sont pas relancées.
 */
export async function remindInterestedVisitors(now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const groups = await GroupOrder.find({ status: 'open', deadline: { $gt: now, $lte: soon } })
    .select('groupId product.name currentUnitPrice deadline participants.phone')
    .lean() as any[]

  let sent = 0
  for (const g of groups) {
    const interests = await GroupInterest.find({ scope: `group:${g.groupId}`, notified: false }).limit(500).lean() as any[]
    if (interests.length === 0) continue
    const joined = new Set((g.participants || []).map((p: any) => formatPhone(p.phone)))
    const hours = Math.max(1, Math.round((new Date(g.deadline).getTime() - now.getTime()) / 3600000))
    const text = `${MARKET_BRAND.name} : l'achat groupé « ${String(g.product?.name || '').slice(0, 40)} » se termine dans ${hours} h. Prix actuel ${Math.round(g.currentUnitPrice || 0).toLocaleString('fr-FR')} FCFA/pc, il baisse encore si le groupe grandit. Rejoindre : ${MARKET_BRAND.url}/achats-groupes/${g.groupId}`

    for (const it of interests) {
      // Réservation avant envoi : jamais deux SMS au même numéro, même si deux instances tournent
      const claimed = await GroupInterest.updateOne({ _id: it._id, notified: false }, { $set: { notified: true } })
      if (claimed.modifiedCount !== 1 || joined.has(formatPhone(it.phone))) continue
      if (await sendSms(it.phone, text).catch(() => false)) sent++
    }
  }
  return sent
}

/**
 * Clôture des achats groupés dont la date limite est passée :
 * minimum atteint → « filled » (liens de paiement envoyés), sinon → « cancelled »
 * (participants prévenus, admins alertés s'il y a de l'argent à rembourser).
 * Idempotent : chaque groupe est réservé par une transition conditionnelle depuis « open ».
 */
export async function closeExpiredGroups(now = new Date()): Promise<{ filled: number; cancelled: number }> {
  const expired = await GroupOrder.find({ status: 'open', deadline: { $lt: now } })
    .select('_id groupId minQty currentQty internalNotes')
    .lean() as any[]

  let filled = 0
  let cancelled = 0

  for (const g of expired) {
    const reached = (g.currentQty || 0) >= (g.minQty || 1)
    const next = reached ? 'filled' : 'cancelled'
    const note = reached
      ? `Clôture automatique ${now.toISOString().slice(0, 10)} : minimum atteint (${g.currentQty}/${g.minQty})`
      : `Clôture automatique ${now.toISOString().slice(0, 10)} : minimum non atteint (${g.currentQty || 0}/${g.minQty})`

    const group = await GroupOrder.findOneAndUpdate(
      { _id: g._id, status: 'open' },
      { $set: { status: next, updatedAt: now, internalNotes: [g.internalNotes, note].filter(Boolean).join('\n') } },
      { new: true }
    )
    if (!group) continue

    try {
      if (reached) {
        filled++
        await assignPaymentRefsAndNotify(group)
        continue
      }

      cancelled++
      const participants = (group.participants || []).map((p: any) => ({
        name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount,
      }))
      await notifyStatusUpdate(
        participants,
        {
          groupId: group.groupId,
          product: group.product,
          currentQty: group.currentQty,
          targetQty: group.targetQty,
          currentUnitPrice: group.currentUnitPrice,
          deadline: group.deadline,
        },
        'cancelled',
        `La date limite est passée sans atteindre le minimum de ${g.minQty} unité(s).`
      )

      const paid = (group.participants || []).filter((p: any) => (p.paidAmount || 0) > 0 && p.paymentStatus !== 'refunded')
      if (paid.length > 0) {
        const amount = paid.reduce((s: number, p: any) => s + (p.paidAmount || 0), 0)
        void notifyAdmins({
          type: 'warning',
          title: 'Achat groupé annulé : remboursements à effectuer',
          message: `${group.groupId} : ${paid.length} participant(s), ${Math.round(amount).toLocaleString('fr-FR')} FCFA à rembourser.`,
          actionUrl: '/admin/marketplace/remboursements',
          metadata: { groupId: group.groupId, amount },
        })
      }
    } catch (err) {
      console.error(`[group-expiry] notifications ${group.groupId}:`, err)
    }
  }

  return { filled, cancelled }
}
