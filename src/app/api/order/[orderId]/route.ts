import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import crypto from 'crypto'
import { requireAuth } from '@/lib/jwt'
import { confirmPayment } from '@/lib/payment-fulfillment'
import { reverseGrainsForOrder, updateTierFromBalance } from '@/lib/grains'
import { restoreProductStock } from '@/lib/inventory'
import PromoCode from '@/lib/models/PromoCode'
import { sendWebPushToOrder } from '@/lib/push-web'
import { isValidOrderStatus, isAllowedOrderStatusTransition, ORDER_STATUS_VALUES, type OrderStatus } from '@/lib/market/order-status'

// Au-delà, la commande est partie : l'adresse n'est plus modifiable par le client
const ADDRESS_EDITABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing']

function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function getTrackingTokenTtlDays(): number {
  const raw = process.env.ORDER_TRACKING_TOKEN_TTL_DAYS
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 90
}

function getTrackingTokenMinDate(): Date {
  const ttlDays = getTrackingTokenTtlDays()
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000
  return new Date(Date.now() - ttlMs)
}

function getTrackingTokenFromRequest(req: NextRequest): string | null {
  const { searchParams } = new URL(req.url)
  return searchParams.get('token') || searchParams.get('t')
}

async function restoreOrderStock(order: any) {
  if (!order || !Array.isArray(order.inventoryReservations) || order.inventoryReservations.length === 0) return
  for (const reservation of order.inventoryReservations) {
    if (reservation.restored) continue
    // Ne restituer que ce qui n'a pas déjà été restitué (retours partiels)
    const remaining = reservation.qty - (reservation.restoredQty || 0)
    if (remaining <= 0) {
      reservation.restored = true
      continue
    }
    try {
      const result = await restoreProductStock(reservation.productId, remaining, reservation.variantIds)
      if (result.ok) {
        reservation.restoredQty = reservation.qty
        reservation.restored = true
      } else {
        console.error(`[order] Échec restauration stock commande ${order.orderId}:`, result.error)
      }
    } catch (err) {
      console.error(`[order] Exception restauration stock commande ${order.orderId}:`, err)
    }
  }
  await Order.updateOne(
    { _id: order._id },
    { inventoryReservations: order.inventoryReservations }
  )
}

interface RouteContext {
  params: Promise<{ orderId: string }>
}

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    await connectDB()

    // Admin can always access
    const adminAuth = await requireAdminApi(req)
    const isAdmin = adminAuth.ok

     // Client owner access (without token)
     const clientAuth = await requireAuth(req).catch(() => null)
     const clientUserId = clientAuth?.userId ? String(clientAuth.userId) : null

    // Guest access requires token
    const token = getTrackingTokenFromRequest(req)
    const tokenHash = token ? hashTrackingToken(token) : null

    const minCreatedAt = getTrackingTokenMinDate()

    // Chercher la commande
    let order: any = null
    if (isAdmin) {
      order = (await Order.findOne({ orderId }).lean()) as any
    } else {
      const or: any[] = []
      if (tokenHash) {
        const tokenNow = new Date()
        or.push({
          trackingAccessTokenHash: tokenHash,
          $or: [
            { trackingAccessTokenExpiresAt: { $gt: tokenNow } },
            {
              trackingAccessTokenExpiresAt: { $exists: false },
              trackingAccessTokenCreatedAt: { $gte: minCreatedAt }
            }
          ]
        })
      }
      if (clientUserId) {
        or.push({ clientId: clientUserId })
      }

      if (or.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Accès refusé' },
          { status: 401 }
        )
      }

      order = (await Order.findOne({ orderId, $or: or }).lean()) as any
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        order: {
          orderId: order.orderId,
          clientName: order.clientName,
          clientEmail: order.clientEmail,
          clientPhone: order.clientPhone,
          items: order.items,
          subtotal: order.subtotal,
          subtotalBeforeDiscounts: order.subtotalBeforeDiscounts,
          fees: order.fees,
          grainsDiscount: order.grainsDiscount,
          grainsUsed: order.grainsUsed,
          promoDiscount: order.promoDiscount,
          promoCode: order.promoCode,
          shipping: order.shipping,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          address: order.address,
          delivery: order.delivery,
          createdAt: order.createdAt,
          currency: order.currency
        }
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur récupération commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
}
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    await connectDB()

    const body = await req.json()

    // Public-only use case: allow address updates only with guest token (or admin)
    const bodyKeys = body && typeof body === 'object' ? Object.keys(body) : []
    const isAddressOnlyUpdate = bodyKeys.length > 0 && bodyKeys.every(k => k === 'address')
    const adminAuth = await requireAdminApi(req)
    const isAdmin = adminAuth.ok

    if (!isAdmin && !isAddressOnlyUpdate) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const updateData: any = {}

    // Support de mise à jour de l'adresse (ancien comportement)
    if (body.address && typeof body.address === 'object') {
      updateData.address = body.address
    }

    // Statut : enum validé + transitions de la machine à états (pas de retour arrière,
    // pas de réactivation d'une commande livrée ou annulée)
    let previousStatus: OrderStatus | null = null
    if (body.status) {
      if (!isValidOrderStatus(body.status)) {
        return NextResponse.json(
          { success: false, error: `Statut invalide — attendu : ${ORDER_STATUS_VALUES.join(', ')}` },
          { status: 400 }
        )
      }
      const current = (await Order.findOne({ orderId }).select('status').lean()) as { status?: OrderStatus } | null
      if (!current) {
        return NextResponse.json({ success: false, error: 'Commande non trouvée' }, { status: 404 })
      }
      previousStatus = (current.status || 'pending') as OrderStatus
      if (!isAllowedOrderStatusTransition(previousStatus, body.status)) {
        return NextResponse.json(
          { success: false, error: `Transition interdite de "${previousStatus}" vers "${body.status}"` },
          { status: 409 }
        )
      }
      updateData.status = body.status
      if (body.status !== previousStatus) {
        if (body.status === 'confirmed') updateData.confirmedAt = new Date()
        if (body.status === 'shipped') updateData.shippedAt = new Date()
        if (body.status === 'delivered') updateData.deliveredAt = new Date()
      }
    }

    // Paiement marqué comme complété → flux canonique (grains, notifications, escrow)
    let paymentConfirmed = false
    if (isAdmin && body.paymentStatus === 'completed') {
      const result = await confirmPayment({
        reference: orderId,
        amount: Number(body.amount || 0),
        provider: (body.provider as any) || 'cash',
        transactionId: body.transactionId || `admin-${Date.now()}`
      })
      if (!result.found) {
        return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 })
      }
      paymentConfirmed = result.changed
    } else if (body.paymentStatus) {
      // Autres statuts (failed…) : mise à jour directe réservée admin — enum validé
      const PAYMENT_STATUSES = ['pending', 'completed', 'failed']
      if (!PAYMENT_STATUSES.includes(String(body.paymentStatus))) {
        return NextResponse.json(
          { success: false, error: `paymentStatus invalide — attendu : ${PAYMENT_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.paymentStatus = body.paymentStatus
    }

    // Support de notes
    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    // Support de mise à jour du suivi transporteur
    if (body.delivery && typeof body.delivery === 'object') {
      updateData.delivery = { ...body.delivery, lastUpdate: new Date() }
    }

    // Ajout à la timeline si action fournie
    if (body.timelineAction) {
      updateData.$push = {
        timeline: {
          action: body.timelineAction,
          date: new Date().toISOString(),
          by: body.timelineBy || 'Admin'
        }
      }
    }

    updateData.updatedAt = new Date()

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucune donnée à mettre à jour' },
        { status: 400 }
      )
    }

    const token = getTrackingTokenFromRequest(req)
    const tokenHash = token ? hashTrackingToken(token) : null

    const minCreatedAt = getTrackingTokenMinDate()

    const tokenNow = new Date()
    const query: Record<string, unknown> = isAdmin
      ? { orderId }
      : {
          orderId,
          status: { $in: ADDRESS_EDITABLE_STATUSES },
          trackingAccessTokenHash: tokenHash || '__invalid__',
          $or: [
            { trackingAccessTokenExpiresAt: { $gt: tokenNow } },
            {
              trackingAccessTokenExpiresAt: { $exists: false },
              trackingAccessTokenCreatedAt: { $gte: minCreatedAt }
            }
          ]
        }
    // Mise à jour conditionnelle : échoue si le statut a changé depuis la vérification
    if (previousStatus) query.status = previousStatus

    const order = (await Order.findOneAndUpdate(query, updateData, { new: true }).lean()) as any

    if (!order) {
      if (previousStatus) {
        return NextResponse.json(
          { success: false, error: 'Le statut de la commande a changé entre-temps, rechargez la page' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    const statusChanged = previousStatus !== null && previousStatus !== order.status

    // Effets de l'annulation (stock, promo, grains) : uniquement au passage en "cancelled"
    if (statusChanged && order.status === 'cancelled') {
      try {
        await restoreOrderStock(order)
      } catch (stockErr) {
        console.error('[inventory] Erreur restauration stock commande:', stockErr)
      }
      // Restituer l'utilisation du code promo (une seule fois)
      if (order.promoCode && (order.promoDiscount || 0) > 0 && !order.promoRestored) {
        try {
          await PromoCode.updateOne(
            { code: order.promoCode.toUpperCase(), usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } }
          )
          await Order.updateOne({ _id: order._id }, { $set: { promoRestored: true } })
        } catch (promoErr) {
          console.error('[order] Erreur restitution promo:', promoErr)
        }
      }
      if (order.clientId) {
        try {
          await reverseGrainsForOrder(order.clientId, order._id, `commande ${order.status}`)
          await updateTierFromBalance(order.clientId)
        } catch (grainsErr) {
          console.error('[grains] Erreur reverse grains commande:', grainsErr)
        }
      }
    }

    // Envoyer une notification push web si le statut a changé
    if (statusChanged) {
      const statusLabels: Record<string, string> = {
        pending: 'en attente',
        confirmed: 'confirmée',
        processing: 'en traitement',
        shipped: 'expédiée',
        delivered: 'livrée',
        cancelled: 'annulée',
      }
      void sendWebPushToOrder(orderId, {
        title: 'DDM+ - Statut commande mis à jour',
        body: `Votre commande ${orderId} est maintenant ${statusLabels[body.status] || body.status}.`,
        icon: '/android-chrome-192x192.png',
        url: `/commandes/${orderId}`,
        tag: `order-status-${orderId}`,
      }).catch((err: any) => console.error('[WebPush] order status push error:', err))
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Commande mise à jour avec succès',
        order
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur mise à jour commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const { orderId } = await context.params
  try {
    const auth = await requireAdminApi(req)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectDB()

    // Restaurer le stock avant suppression
    const order = await Order.findOne({ orderId }).lean() as any
    if (order) {
      try {
        await restoreOrderStock(order)
      } catch (stockErr) {
        console.error('[inventory] Erreur restauration stock avant suppression:', stockErr)
      }
    }

    // Supprimer la commande
    const result = await Order.deleteOne({ orderId })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Commande ${orderId} supprimée`)

    return NextResponse.json(
      {
        success: true,
        message: 'Commande supprimée avec succès'
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur suppression commande:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}