import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { verifyAuthServer } from '@/lib/auth-server'
import crypto from 'crypto'

function hashTrackingToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const VALID_ADD_ONS = [
  { id: 'assurance', name: 'Assurance transport', price: 1500 },
  { id: 'express', name: 'Livraison express Dakar', price: 2500 },
  { id: 'gift', name: 'Emballage cadeau', price: 1000 },
]

async function getAuthContext(req: NextRequest) {
  const auth = await verifyAuthServer(req).catch(() => null)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const token = body?.token || new URL(req.url).searchParams.get('token')
  return { auth, token: token || null, body }
}

async function authorizeOrder(req: NextRequest, order: any) {
  const { auth, token } = await getAuthContext(req)
  if (auth?.user?.id && order.clientId && String(order.clientId) === String(auth.user.id)) {
    return true
  }
  if (!token) return false
  const tokenHash = hashTrackingToken(token)
  return order.trackingAccessTokenHash === tokenHash
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
    }

    await connectDB()

    const order = await Order.findOne({ orderId: reference })
    if (order) {
      if (!(await authorizeOrder(req, order))) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
      return NextResponse.json({
        success: true,
        addOns: order.addOns || [],
        addOnsTotal: order.addOnsTotal || 0,
      })
    }

    const groupOrder = await GroupOrder.findOne({ 'participants.paymentReference': reference })
    if (groupOrder) {
      const participant = groupOrder.participants.find((p: any) => p.paymentReference === reference)
      if (!participant) {
        return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 })
      }
      const ctx = await getAuthContext(req)
      const isOwner = ctx.auth?.user?.id && participant.userId && String(participant.userId) === String(ctx.auth.user.id)
      if (!isOwner) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
      return NextResponse.json({
        success: true,
        addOns: participant.addOns || [],
        addOnsTotal: participant.addOnsTotal || 0,
      })
    }

    return NextResponse.json({ error: 'Référence introuvable' }, { status: 404 })
  } catch (error: any) {
    console.error('[Payment Add-ons] GET Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { auth, token, body } = await getAuthContext(req)
    const { reference, addOnIds } = body

    if (!reference || !Array.isArray(addOnIds)) {
      return NextResponse.json({ error: 'Référence ou add-ons manquants' }, { status: 400 })
    }

    const selectedAddOns = addOnIds
      .map((id: string) => VALID_ADD_ONS.find(a => a.id === id))
      .filter(Boolean) as typeof VALID_ADD_ONS

    if (selectedAddOns.length !== addOnIds.length) {
      return NextResponse.json({ error: 'Add-on invalide' }, { status: 400 })
    }

    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0)

    await connectDB()

    const order = await Order.findOne({ orderId: reference })
    if (order) {
      if (order.paymentStatus === 'completed') {
        return NextResponse.json({ error: 'Commande déjà payée' }, { status: 409 })
      }

      if (auth?.user?.id && order.clientId && String(order.clientId) === String(auth.user.id)) {
        // owner via auth
      } else if (token) {
        const tokenHash = hashTrackingToken(token)
        if (order.trackingAccessTokenHash !== tokenHash) {
          return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
      }

      order.addOns = selectedAddOns
      order.addOnsTotal = addOnsTotal
      order.total = Math.max(
        0,
        (order.subtotal || 0) +
          (order.shipping?.totalCost || 0) +
          addOnsTotal -
          (order.grainsDiscount || 0) -
          (order.promoDiscount || 0)
      )
      await order.save()
      return NextResponse.json({ success: true, addOns: selectedAddOns, addOnsTotal, total: order.total })
    }

    const groupOrder = await GroupOrder.findOne({ 'participants.paymentReference': reference })
    if (groupOrder) {
      const participant = groupOrder.participants.find((p: any) => p.paymentReference === reference)
      if (!participant) {
        return NextResponse.json({ error: 'Participant introuvable' }, { status: 404 })
      }
      if (participant.paymentStatus === 'paid') {
        return NextResponse.json({ error: 'Déjà payé' }, { status: 409 })
      }
      const isOwner = auth?.user?.id && participant.userId && String(participant.userId) === String(auth.user.id)
      if (!isOwner) {
        return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
      }

      // Recalculer le montant de base pour éviter accumulation
      const baseAmount = participant.qty * (participant.unitPrice || groupOrder.currentUnitPrice || groupOrder.product.basePrice)
      participant.addOns = selectedAddOns
      participant.addOnsTotal = addOnsTotal
      participant.totalAmount = baseAmount + addOnsTotal
      await groupOrder.save()
      return NextResponse.json({ success: true, addOns: selectedAddOns, addOnsTotal, total: participant.totalAmount })
    }

    return NextResponse.json({ error: 'Référence introuvable' }, { status: 404 })
  } catch (error: any) {
    console.error('[Payment Add-ons] Error:', error)
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 })
  }
}
