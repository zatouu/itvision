import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { requireAuth } from '@/lib/jwt'

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

export async function POST(req: NextRequest, context: RouteContext) {
  const { orderId } = await context.params

  let auth: Awaited<ReturnType<typeof requireAuth>>
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }

  try {
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const tokenFromBody = body && typeof body === 'object' ? (body as any).token : undefined
    const token = (typeof tokenFromBody === 'string' && tokenFromBody) ? tokenFromBody : getTrackingTokenFromRequest(req)

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requis' }, { status: 400 })
    }

    const tokenHash = hashTrackingToken(token)
    const minCreatedAt = getTrackingTokenMinDate()

    const order = await Order.findOne({
      orderId,
      trackingAccessTokenHash: tokenHash,
      trackingAccessTokenCreatedAt: { $gte: minCreatedAt }
    })

    if (!order) {
      // Ne pas révéler si l'orderId existe ou non sans token valide
      return NextResponse.json({ success: false, error: 'Commande non trouvée' }, { status: 404 })
    }

    const currentClientId = order.clientId ? String(order.clientId) : null
    const userId = String(auth.userId)

    if (currentClientId && currentClientId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Commande déjà associée à un autre compte' },
        { status: 409 }
      )
    }

    if (!currentClientId) {
      ;(order as any).clientId = auth.userId as any
      await order.save()
    }

    return NextResponse.json(
      { success: true, claimed: true, alreadyClaimed: Boolean(currentClientId) },
      { status: 200 }
    )
  } catch (e) {
    console.error('Erreur claim commande:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
