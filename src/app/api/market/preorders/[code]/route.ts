/**
 * Page de précommande d'un revendeur
 *   GET   /api/market/preorders/[code] — infos publiques (jamais le prix DDM+ ni les clients)
 *   POST  /api/market/preorders/[code] { name, phone, qty, note? } — réservation d'un client (sans paiement)
 *   PATCH /api/market/preorders/[code] { reservationId, status } | { closed } — gestion par le revendeur
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ResellerPreorder from '@/lib/models/ResellerPreorder'
import { validatePhone, formatPhone } from '@/lib/payment-service'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { notifyUser } from '@/lib/notify'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ code: string }>
}

const CODE = /^[A-Z0-9]{6,12}$/
const SHIPPING_DAYS: Record<string, string> = { express_3j: '3 à 5 jours', air_15j: '10 à 15 jours', maritime_60j: '45 à 50 jours' }

export async function GET(_req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  if (!CODE.test(code)) return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 })
  try {
    await connectDB()
    const c = await ResellerPreorder.findOne({ code }).lean() as any
    if (!c) return NextResponse.json({ success: false, error: 'Précommande introuvable' }, { status: 404 })
    const g = await GroupOrder.findOne({ groupId: c.groupId }).select('status deadline shippingMethod').lean() as any
    const open = !c.closed && !!g && g.status === 'open' && new Date(g.deadline) > new Date()
    const reservedQty = (c.reservations || []).filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => s + r.qty, 0)
    return NextResponse.json({
      success: true,
      preorder: {
        code: c.code,
        productName: c.productName,
        productImage: c.productImage,
        sellerName: c.ownerName,
        shopSlug: c.shopSlug,
        price: c.resalePrice,
        deposit: c.deposit,
        message: c.message,
        open,
        closesAt: g?.deadline,
        transit: g?.shippingMethod ? SHIPPING_DAYS[g.shippingMethod] : undefined,
        reservedQty,
      },
    })
  } catch (error) {
    console.error('GET /api/market/preorders/[code] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse
  if (!CODE.test(code)) return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 200) : undefined
  const qty = Number(body?.qty)
  if (name.length < 2) return NextResponse.json({ success: false, error: 'Indiquez votre nom' }, { status: 400 })
  if (!validatePhone(phone)) return NextResponse.json({ success: false, error: 'Numéro de téléphone invalide' }, { status: 400 })
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return NextResponse.json({ success: false, error: 'Quantité invalide (1 à 100)' }, { status: 400 })

  try {
    await connectDB()
    const c = await ResellerPreorder.findOne({ code }).select('groupId closed ownerUserId productName reservations.phone reservations.status').lean() as any
    if (!c) return NextResponse.json({ success: false, error: 'Précommande introuvable' }, { status: 404 })
    const g = await GroupOrder.findOne({ groupId: c.groupId }).select('status deadline').lean() as any
    if (c.closed || !g || g.status !== 'open' || new Date(g.deadline) < new Date()) {
      return NextResponse.json({ success: false, error: 'Les précommandes sont fermées' }, { status: 409 })
    }
    if ((c.reservations || []).length >= 500) {
      return NextResponse.json({ success: false, error: 'Les précommandes sont complètes' }, { status: 409 })
    }
    const phoneNorm = formatPhone(phone)
    // Même numéro : la réservation est mise à jour au lieu d'être dupliquée
    const updated = await ResellerPreorder.updateOne(
      { code, reservations: { $elemMatch: { phone: phoneNorm, status: { $ne: 'cancelled' } } } },
      { $set: { 'reservations.$.qty': qty, 'reservations.$.name': name, 'reservations.$.note': note } }
    )
    const already = updated.modifiedCount === 1 || updated.matchedCount === 1
    if (!already) {
      await ResellerPreorder.updateOne(
        { code },
        { $push: { reservations: { name, phone: phoneNorm, qty, note, status: 'reserved', createdAt: new Date() } } }
      )
    }
    void notifyUser(String(c.ownerUserId), {
      type: 'success',
      title: already ? 'Réservation modifiée' : 'Nouvelle précommande',
      message: `${name.split(/\s+/)[0]} : ${qty} × ${c.productName}`,
      actionUrl: '/compte/precommandes',
      metadata: { code },
    })
    return NextResponse.json({ success: true, updated: already })
  } catch (error) {
    console.error('POST /api/market/preorders/[code] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { code } = await context.params
  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  if (!CODE.test(code)) return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 })
  const body = await req.json().catch(() => ({}))
  try {
    await connectDB()
    const owner = { code, ownerUserId: new mongoose.Types.ObjectId(auth.userId) }
    if (typeof body?.closed === 'boolean') {
      const res = await ResellerPreorder.updateOne(owner, { $set: { closed: body.closed } })
      if (res.matchedCount === 0) return NextResponse.json({ success: false, error: 'Précommande introuvable' }, { status: 404 })
      return NextResponse.json({ success: true })
    }
    const reservationId = String(body?.reservationId || '')
    const status = body?.status
    if (!mongoose.isValidObjectId(reservationId) || !['reserved', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
    }
    const res = await ResellerPreorder.updateOne(
      { ...owner, 'reservations._id': new mongoose.Types.ObjectId(reservationId) },
      { $set: { 'reservations.$.status': status } }
    )
    if (res.matchedCount === 0) return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/market/preorders/[code] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
