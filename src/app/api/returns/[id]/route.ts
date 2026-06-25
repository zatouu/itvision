import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { Order } from '@/lib/models/Order'
import { requireAdminApi } from '@/lib/api-auth'
import { restoreProductStock } from '@/lib/inventory'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    await connectDB()

    const returnRequest = await ReturnRequest.findById(id).lean()
    if (!returnRequest) {
      return NextResponse.json({ success: false, error: 'Demande introuvable' }, { status: 404 })
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

    if (!status) {
      return NextResponse.json({ success: false, error: 'Le statut est requis' }, { status: 400 })
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

    // Si la demande est approuvée/reçue/remboursée, restituer le stock
    if (['approved', 'received', 'refunded'].includes(status) && !['approved', 'received', 'refunded'].includes(previousStatus)) {
      const order = await Order.findOne({ orderId: returnRequest.orderReference }).lean() as any
      if (order && Array.isArray(order.inventoryReservations)) {
        for (const item of returnRequest.items) {
          const reservation = order.inventoryReservations.find((r: any) => r.productId === item.productId && !r.restored)
          if (reservation) {
            const qty = Math.min(item.qty, reservation.qty)
            await restoreProductStock(reservation.productId, qty, reservation.variantIds)
          }
        }
      }
    }

    return NextResponse.json({ success: true, returnRequest })
  } catch (err) {
    console.error('[returns/[id]] Erreur mise à jour:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
