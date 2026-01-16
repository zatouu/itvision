import { NextRequest, NextResponse } from 'next/server'
import { Order } from '@/lib/models/Order'
import { connectDB } from '@/lib/db'
import { requireAdminApi } from '@/lib/api-auth'
import crypto from 'crypto'

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

    // Guest access requires token
    const token = getTrackingTokenFromRequest(req)
    const tokenHash = token ? hashTrackingToken(token) : null

    const minCreatedAt = getTrackingTokenMinDate()

    // Chercher la commande
    const order = isAdmin
      ? ((await Order.findOne({ orderId }).lean()) as any)
      : ((await Order.findOne({
          orderId,
          trackingAccessTokenHash: tokenHash || '__invalid__',
          trackingAccessTokenCreatedAt: { $gte: minCreatedAt }
        }).lean()) as any)

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