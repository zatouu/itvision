import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import ReturnRequest from '@/lib/models/ReturnRequest'
import { requireAuth } from '@/lib/jwt'
import { requireAdminApi } from '@/lib/api-auth'

function hashTrackingToken(token: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
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

    // Vérifier que l'utilisateur est autorisé (propriétaire ou invité avec token)
    const token = req.nextUrl.searchParams.get('token') || req.headers.get('x-order-token')
    const isOwner = userId && String(order.clientId) === userId
    let tokenValid = false
    if (!isOwner && token) {
      const tokenHash = hashTrackingToken(token)
      tokenValid = order.trackingAccessTokenHash === tokenHash &&
        new Date(order.trackingAccessTokenCreatedAt).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
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
      orderId,
      orderReference,
      clientId: order.clientId ? String(order.clientId) : undefined,
      clientName: order.clientName,
      clientEmail: order.clientEmail,
      clientPhone: order.clientPhone,
      items: items.map((i: any) => ({
        productId: String(i.productId || i.id || ''),
        name: i.name || 'Article',
        qty: Math.max(1, Number(i.qty) || 1),
        reason: i.reason || undefined
      })),
      reason,
      details,
      photos: Array.isArray(photos) ? photos.filter((p: any) => typeof p === 'string' && p.startsWith('http')).slice(0, 5) : [],
      status: 'requested',
      timeline: [{ status: 'requested', date: new Date(), by: userName }]
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
