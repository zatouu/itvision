import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { Order } from '@/lib/models/Order'
import { requireAdminApi } from '@/lib/api-auth'
import { requireAuth } from '@/lib/jwt'
import { restoreProductStock } from '@/lib/inventory'
import { reverseGrainsForOrder, updateTierFromBalance } from '@/lib/grains'
import { notifyUser } from '@/lib/notify'
import { emailService } from '@/lib/email-service'
import { escapeHtml } from '@/lib/html-escape'
import { reduceOrderCommission } from '@/lib/market/ambassador'

interface RouteContext {
  params: Promise<{ id: string }>
}

const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'closed']

const RETURN_TRANSITIONS: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['in_transit', 'received', 'rejected'],
  in_transit: ['received'],
  received: ['refunded', 'rejected'],
  refunded: ['closed'],
  rejected: ['closed'],
  closed: [],
}

const CLIENT_MESSAGES: Record<string, string> = {
  approved: 'Votre demande de retour est acceptée. Renvoyez les articles selon les instructions de notre équipe.',
  rejected: 'Votre demande de retour a été refusée.',
  in_transit: 'Votre colis retour est en route vers nos entrepôts.',
  received: 'Nous avons bien reçu les articles retournés. Le remboursement est en cours de traitement.',
  refunded: 'Votre remboursement a été effectué.',
  closed: 'Votre demande de retour est clôturée.',
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    await connectDB()

    const returnRequest = await ReturnRequest.findById(id).lean() as any
    if (!returnRequest) {
      return NextResponse.json({ success: false, error: 'Demande introuvable' }, { status: 404 })
    }

    // Admin ou propriétaire uniquement — la demande contient PII + photos
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      const auth = await requireAuth(req).catch(() => null)
      const userId = auth?.userId ? String(auth.userId) : null
      if (!userId || String(returnRequest.clientId) !== userId) {
        return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
      }
    }

    return NextResponse.json({ success: true, returnRequest })
  } catch (err) {
    console.error('[returns/[id]] Erreur récupération:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const adminAuth = await requireAdminApi(req)
    if (!adminAuth.ok) {
      return NextResponse.json({ success: false, error: adminAuth.error }, { status: adminAuth.status })
    }

    const { id } = await context.params
    const body = await req.json()
    const { status, adminNotes, trackingNumber, refundAmount, refundMethod, refundTransactionId } = body

    if (!status || !RETURN_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Statut invalide — attendu : ${RETURN_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }
    if (refundAmount !== undefined && (Number(refundAmount) < 0 || !Number.isFinite(Number(refundAmount)))) {
      return NextResponse.json({ success: false, error: 'Montant de remboursement invalide' }, { status: 400 })
    }

    await connectDB()

    const returnRequest = await ReturnRequest.findById(id)
    if (!returnRequest) {
      return NextResponse.json({ success: false, error: 'Demande introuvable' }, { status: 404 })
    }

    const previousStatus = returnRequest.status
    if (status !== previousStatus && !(RETURN_TRANSITIONS[previousStatus] || []).includes(status)) {
      return NextResponse.json(
        { success: false, error: `Transition interdite de "${previousStatus}" vers "${status}"` },
        { status: 409 }
      )
    }

    const order = await Order.findOne({ orderId: returnRequest.orderReference }) as any

    // Remboursement : montant, moyen et référence obligatoires, borné au montant encore remboursable
    if (status === 'refunded' && previousStatus !== 'refunded') {
      const amount = Number(refundAmount ?? returnRequest.refundAmount)
      const method = refundMethod ?? returnRequest.refundMethod
      const reference = String(refundTransactionId ?? returnRequest.refundTransactionId ?? '').trim()
      const alreadyRefunded = Number(order?.refundAmount) || 0
      const refundable = Math.max(0, (Number(order?.total) || 0) - alreadyRefunded)
      if (!(amount > 0) || !method || !reference) {
        return NextResponse.json({ success: false, error: 'Montant, moyen et référence du remboursement obligatoires' }, { status: 400 })
      }
      if (order && amount > refundable) {
        return NextResponse.json({ success: false, error: `Montant supérieur au remboursable (${refundable} FCFA)` }, { status: 400 })
      }
    }

    // Réservation de la transition : deux validations simultanées ne restockent ni ne remboursent deux fois
    const claimed = await ReturnRequest.updateOne({ _id: returnRequest._id, status: previousStatus }, { $set: { status } })
    if (claimed.modifiedCount !== 1 && status !== previousStatus) {
      return NextResponse.json({ success: false, error: 'La demande a changé entre-temps, rechargez la page' }, { status: 409 })
    }
    returnRequest.status = status

    if (trackingNumber !== undefined) returnRequest.trackingNumber = trackingNumber
    if (adminNotes !== undefined) returnRequest.adminNotes = adminNotes
    if (refundAmount !== undefined) returnRequest.refundAmount = refundAmount
    if (refundMethod !== undefined) returnRequest.refundMethod = refundMethod
    if (refundTransactionId !== undefined) returnRequest.refundTransactionId = refundTransactionId

    returnRequest.timeline.push({
      status,
      date: new Date(),
      note: adminNotes,
      by: 'Admin'
    })

    await returnRequest.save()

    // Restockage à la réception des articles (pas à l'acceptation : ils ne sont pas encore revenus).
    // Suivi par restoredQty pour les retours partiels (une seule restitution par unité).
    if (status === 'received' && previousStatus !== 'received') {
      if (order && Array.isArray(order.inventoryReservations)) {
        let dirty = false
        for (const item of returnRequest.items) {
          const reservation = order.inventoryReservations.find((r: any) =>
            r.productId === item.productId && (r.restoredQty || 0) < r.qty
          )
          if (reservation) {
            const remaining = reservation.qty - (reservation.restoredQty || 0)
            const qty = Math.min(item.qty, remaining)
            if (qty <= 0) continue
            const result = await restoreProductStock(reservation.productId, qty, reservation.variantIds)
            if (result.ok) {
              reservation.restoredQty = (reservation.restoredQty || 0) + qty
              reservation.restored = reservation.restoredQty >= reservation.qty
              dirty = true
            } else {
              console.error(`[returns] Échec restauration ${reservation.productId}:`, result.error)
            }
          }
        }
        if (dirty) {
          await Order.updateOne({ _id: order._id }, { inventoryReservations: order.inventoryReservations })
        }
      }
    }

    // Remboursement tracé sur la commande ; grains de la commande retirés au prorata
    if (status === 'refunded' && previousStatus !== 'refunded' && order) {
      const amount = Number(returnRequest.refundAmount) || 0
      await Order.updateOne(
        { _id: order._id },
        {
          $inc: { refundAmount: amount },
          $set: { refundStatus: 'done', refundReference: returnRequest.refundTransactionId, refundedAt: new Date(), refundedBy: adminAuth.user.email || adminAuth.user.id },
        }
      )
      if (order.clientId && order.total > 0) {
        try {
          await reverseGrainsForOrder(String(order.clientId), order._id, `retour ${returnRequest.orderReference}`, { ratio: amount / order.total })
          await updateTierFromBalance(String(order.clientId))
        } catch (err) {
          console.error('[returns] Erreur retrait grains:', err)
        }
      }
      if (order.total > 0) {
        await reduceOrderCommission(String(order.orderId), amount / order.total).catch((err) => console.error('[returns] commission:', err))
      }
    }

    if (status !== previousStatus && CLIENT_MESSAGES[status]) {
      const message = status === 'refunded' && returnRequest.refundAmount
        ? `${CLIENT_MESSAGES.refunded} Montant : ${Math.round(returnRequest.refundAmount).toLocaleString('fr-FR')} FCFA (réf. ${returnRequest.refundTransactionId}).`
        : CLIENT_MESSAGES[status]
      const title = `Retour ${returnRequest.orderReference}`
      if (returnRequest.clientId) {
        void notifyUser(String(returnRequest.clientId), { type: status === 'rejected' ? 'warning' : 'info', title, message, actionUrl: '/compte/commandes' })
      }
      if (returnRequest.clientEmail) {
        const note = adminNotes ? `<p>${escapeHtml(adminNotes)}</p>` : ''
        void emailService.sendEmail({
          to: returnRequest.clientEmail,
          subject: title,
          html: `<p>Bonjour ${escapeHtml(returnRequest.clientName || '')},</p><p>${escapeHtml(message)}</p>${note}`,
        }).catch((err: unknown) => console.error('[returns] email client:', err))
      }
    }

    return NextResponse.json({ success: true, returnRequest })
  } catch (err) {
    console.error('[returns/[id]] Erreur mise à jour:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
