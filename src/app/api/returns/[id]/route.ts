import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { Order } from '@/lib/models/Order'
import { requireAdminApi } from '@/lib/api-auth'
import { requireAuth } from '@/lib/jwt'
import { restoreProductStock } from '@/lib/inventory'

interface RouteContext {
  params: Promise<{ id: string }>
}

const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'in_transit', 'received', 'refunded', 'closed']

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

    // Restituer le stock à l'approbation/réception/remboursement — suivi par
    // restoredQty pour les retours partiels (une seule restitution par unité).
    if (['approved', 'received', 'refunded'].includes(status) && !['approved', 'received', 'refunded'].includes(previousStatus)) {
      const order = await Order.findOne({ orderId: returnRequest.orderReference }) as any
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

    return NextResponse.json({ success: true, returnRequest })
  } catch (err) {
    console.error('[returns/[id]] Erreur mise à jour:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
