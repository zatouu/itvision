import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import crypto from 'crypto'
import { requireAuth } from '@/lib/jwt'
import { reverseGrainsForOrder, updateTierFromBalance } from '@/lib/grains'
import { restoreProductStock } from '@/lib/inventory'
import { sendWebPushToOrder } from '@/lib/push-web'

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
    try {
      const result = await restoreProductStock(reservation.productId, reservation.qty, reservation.variantIds)
      if (result.ok) {
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
        or.push({ trackingAccessTokenHash: tokenHash, trackingAccessTokenCreatedAt: { $gte: minCreatedAt } })
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

    // Support de mise à jour du statut
    if (body.status) {
      updateData.status = body.status
    }

    // Support de mise à jour du statut de paiement
    if (body.paymentStatus) {
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

    const query = isAdmin
      ? { orderId }
      : {
          orderId,
          trackingAccessTokenHash: tokenHash || '__invalid__',
          trackingAccessTokenCreatedAt: { $gte: minCreatedAt }
        }

    const order = (await Order.findOneAndUpdate(query, updateData, { new: true }).lean()) as any

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    console.log(`Commande ${orderId} mise à jour:`, updateData)

    // Reverse grains and restore stock if order is cancelled/refunded
    if (['cancelled', 'refunded'].includes(order.status)) {
      try {
        await restoreOrderStock(order)
      } catch (stockErr) {
        console.error('[inventory] Erreur restauration stock commande:', stockErr)
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
    if (body.status && typeof body.status === 'string') {
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