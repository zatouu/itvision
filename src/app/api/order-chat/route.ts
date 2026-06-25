import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import OrderChatMessage from '@/lib/models/OrderChatMessage'
import { requireAuth } from '@/lib/jwt'
import { requireAdminApi } from '@/lib/api-auth'

function hashTrackingToken(token: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderReference = searchParams.get('orderReference')
    if (!orderReference) {
      return NextResponse.json({ success: false, error: 'orderReference requis' }, { status: 400 })
    }

    let userId: string | null = null
    let isAdmin = false
    try {
      const auth = await requireAuth(req)
      userId = auth.userId ? String(auth.userId) : null
    } catch {}

    if (!userId) {
      const adminAuth = await requireAdminApi(req)
      isAdmin = adminAuth.ok
    }

    await connectDB()

    const order = await Order.findOne({ orderId: orderReference }).lean() as any
    if (!order) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 })
    }

    const token = searchParams.get('token')
    const isOwner = userId && String(order.clientId) === userId
    let tokenValid = false
    if (!isOwner && token) {
      const tokenHash = hashTrackingToken(token)
      tokenValid = order.trackingAccessTokenHash === tokenHash &&
        new Date(order.trackingAccessTokenCreatedAt).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
    }
    if (!isOwner && !tokenValid && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const messages = await OrderChatMessage.find({ orderReference, isInternal: false })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean()

    return NextResponse.json({ success: true, messages })
  } catch (err) {
    console.error('[order-chat] Erreur GET:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderReference, text } = body
    if (!orderReference || !text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'orderReference et text requis' }, { status: 400 })
    }

    let userId: string | null = null
    let senderName = 'Invité'
    let senderRole: 'client' | 'admin' = 'client'
    try {
      const auth = await requireAuth(req)
      userId = auth.userId ? String(auth.userId) : null
      senderName = auth.username || auth.email || 'Client'
    } catch {}

    const adminAuth = await requireAdminApi(req)
    if (adminAuth.ok) {
      senderRole = 'admin'
      senderName = 'Support IT Vision'
    }

    await connectDB()

    const order = await Order.findOne({ orderId: orderReference }).lean() as any
    if (!order) {
      return NextResponse.json({ success: false, error: 'Commande introuvable' }, { status: 404 })
    }

    const token = req.nextUrl.searchParams.get('token') || body.token
    const isOwner = userId && String(order.clientId) === userId
    let tokenValid = false
    if (!isOwner && token) {
      const tokenHash = hashTrackingToken(token)
      tokenValid = order.trackingAccessTokenHash === tokenHash &&
        new Date(order.trackingAccessTokenCreatedAt).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000
    }
    if (!isOwner && !tokenValid && !adminAuth.ok) {
      return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
    }

    const message = await OrderChatMessage.create({
      orderId: orderReference,
      orderReference,
      senderId: userId || undefined,
      senderRole,
      senderName,
      text: text.trim().slice(0, 2000)
    })

    return NextResponse.json({ success: true, message }, { status: 201 })
  } catch (err) {
    console.error('[order-chat] Erreur POST:', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
