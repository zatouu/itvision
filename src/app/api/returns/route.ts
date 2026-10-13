import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { requireAuth } from '@/lib/jwt'
import { requireAdminApi } from '@/lib/api-auth'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'
import { notifyAdmins } from '@/lib/notify'

function hashTrackingToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// Aligné sur la période de vérification de la garantie GAR (48 h après livraison)
const RETURN_WINDOW_HOURS = Number(process.env.RETURN_WINDOW_HOURS) > 0 ? Number(process.env.RETURN_WINDOW_HOURS) : 48
const UPLOAD_PATH = /^\/(api\/)?uploads\/[\w./-]+$/
/** Photo issue de notre upload (chemin relatif, ou URL absolue de notre hôte ramenée au chemin). */
function ownUploadPath(u: unknown, host: string | null): string | null {
  if (typeof u !== 'string' || u.length > 500 || u.includes('..')) return null
  if (u.startsWith('/')) return UPLOAD_PATH.test(u) ? u : null
  try {
    const url = new URL(u)
    return host && url.host === host && UPLOAD_PATH.test(url.pathname) ? url.pathname : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(req, apiRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    await connectDB()

    let userId: string | null = null
    let userName = 'Invité'
    try {
      const auth = await requireAuth(req)
      userId = auth.userId ? String(auth.userId) : null
      userName = auth.username || auth.email || 'Client'
    } catch {}

    const body = await req.json()
    const { orderId, orderReference, items, reason, details, photos } = body

    if (!orderId || !orderReference || !Array.isArray(items) || items.length === 0 || !reason) {
      return NextResponse.json(
        { success: false, error: 'orderId, orderReference, items et reason sont requis' },
        { status: 400 }
      )
    }

    const order = await Order.findOne({ orderId: orderReference }).lean() as any
    if (!order) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 })
    }

    // Un retour suppose une commande payée/livrée — pas sur une commande annulée ou impayée
    if (order.status === 'cancelled' || order.paymentStatus !== 'completed') {
      return NextResponse.json(
        { success: false, error: 'Retour impossible : commande non payée ou annulée' },
        { status: 400 }
      )
    }
    if (order.status !== 'delivered') {
      return NextResponse.json(
        { success: false, error: 'Commande pas encore livrée : contactez-nous pour l\'annuler plutôt que la retourner' },
        { status: 400 }
      )
    }
    const deliveredAt = new Date(order.deliveredAt || order.updatedAt || order.createdAt).getTime()
    if (Date.now() - deliveredAt > RETURN_WINDOW_HOURS * 60 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: `Délai de retour dépassé (${RETURN_WINDOW_HOURS} h après la livraison)` },
        { status: 400 }
      )
    }

    // Quantités déjà retournées (demandes non refusées) : on ne retourne jamais plus que commandé
    const previousReturns = await ReturnRequest.find({ orderReference, status: { $ne: 'rejected' } }).select('items').lean() as any[]
    const returnedQty = new Map<string, number>()
    for (const r of previousReturns) {
      for (const it of r.items || []) returnedQty.set(String(it.productId), (returnedQty.get(String(it.productId)) || 0) + (Number(it.qty) || 0))
    }

    // Les articles retournés doivent appartenir à la commande, qté ≤ qté commandée
    const orderedQty = new Map<string, number>()
    const orderedName = new Map<string, string>()
    for (const it of order.items || []) {
      orderedQty.set(String(it.id), (orderedQty.get(String(it.id)) || 0) + (Number(it.qty) || 0))
      orderedName.set(String(it.id), it.name)
    }
    for (const i of items) {
      const pid = String(i.productId || i.id || '')
      const want = Math.max(1, Number(i.qty) || 1)
      const ordered = orderedQty.get(pid)
      if (ordered === undefined) {
        return NextResponse.json(
          { success: false, error: `Article hors commande : ${i.name || pid}` },
          { status: 400 }
        )
      }
      if (want > ordered - (returnedQty.get(pid) || 0)) {
        return NextResponse.json(
          { success: false, error: `Quantité retournée supérieure à la quantité encore retournable : ${orderedName.get(pid) || pid}` },
          { status: 400 }
        )
      }
    }

    // Vérifier que l'utilisateur est autorisé (propriétaire ou invité avec token)
    const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-order-token')
    const isOwner = userId && String(order.clientId) === userId
    let tokenValid = false
    if (!isOwner && token) {
      const tokenHash = hashTrackingToken(token)
      const expiresAt = order.trackingAccessTokenExpiresAt
        ? new Date(order.trackingAccessTokenExpiresAt).getTime()
        : new Date(order.trackingAccessTokenCreatedAt).getTime() + 90 * 24 * 60 * 60 * 1000
      tokenValid = order.trackingAccessTokenHash === tokenHash && expiresAt > Date.now()
    }
    if (!isOwner && !tokenValid) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    // Vérifier qu'il n'existe pas déjà une demande ouverte
    const existing = await ReturnRequest.findOne({
      orderReference,
      status: { $nin: ['refunded', 'rejected', 'closed'] }
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Une demande de retour est déjà en cours pour cette commande' },
        { status: 409 }
      )
    }

    const returnRequest = await ReturnRequest.create({
      orderId: order.orderId, // valeur canonique — pas le champ client
      orderReference,
      clientId: order.clientId ? String(order.clientId) : undefined,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      clientPhone: order.clientPhone,
      items: items.map((i: any) => {
        const pid = String(i.productId || i.id || '')
        return {
          productId: pid,
          name: orderedName.get(pid) || 'Article',
          qty: Math.max(1, Number(i.qty) || 1),
          reason: typeof i.reason === 'string' ? i.reason.slice(0, 300) : undefined
        }
      }),
      reason: String(reason).slice(0, 300),
      details: typeof details === 'string' ? details.slice(0, 2000) : undefined,
      photos: Array.isArray(photos)
        ? photos.map((p: unknown) => ownUploadPath(p, req.headers.get('host'))).filter((p): p is string => !!p).slice(0, 5)
        : [],
      status: 'requested',
      timeline: [{ status: 'requested', date: new Date(), by: userName }]
    })

    void notifyAdmins({
      type: 'info',
      title: 'Nouvelle demande de retour',
      message: `Commande ${order.orderId} : ${returnRequest.items.length} article(s) — ${String(reason).slice(0, 80)}`,
      actionUrl: '/admin/commandes',
      metadata: { returnId: String(returnRequest._id), orderId: order.orderId },
    })

    return NextResponse.json({ success: true, returnRequest }, { status: 201 })
  } catch (err) {
    console.error('[returns] Erreur création demande de retour:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminAuth = await requireAdminApi(req)
    const isAdmin = adminAuth.ok

    let userId: string | null = null
    if (!isAdmin) {
      try {
        const auth = await requireAuth(req)
        userId = auth.userId ? String(auth.userId) : null
      } catch {
        return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
      }
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const orderReference = searchParams.get('orderReference')
    const status = searchParams.get('status')

    const query: any = {}
    if (orderReference) query.orderReference = orderReference
    if (status) query.status = status
    if (!isAdmin && userId) query.clientId = userId

    const returns = await ReturnRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, returns })
  } catch (err) {
    console.error('[returns] Erreur liste demandes de retour:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
