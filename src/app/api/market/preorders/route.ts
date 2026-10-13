/**
 * Précommandes revendeur
 *   GET  /api/market/preorders — mes campagnes (avec réservations et état de ma participation au groupe)
 *   POST /api/market/preorders { groupId, resalePrice, message?, deposit? } — ouvrir (ou mettre à jour) la campagne d'un groupe
 */
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { GroupOrder } from '@/lib/models/GroupOrder'
import ResellerPreorder from '@/lib/models/ResellerPreorder'
import User from '@/lib/models/User'
import VendorProfile from '@/lib/models/VendorProfile'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { MARKET_BRAND } from '@/lib/branding'

export const dynamic = 'force-dynamic'

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function newCode(): string {
  const bytes = crypto.randomBytes(8)
  return Array.from(bytes, (b) => ALPHANUM[b % ALPHANUM.length]).join('')
}

export async function GET(req: NextRequest) {
  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  try {
    await connectDB()
    const uid = new mongoose.Types.ObjectId(auth.userId)
    const campaigns = await ResellerPreorder.find({ ownerUserId: uid }).sort({ updatedAt: -1 }).limit(50).lean() as any[]
    const groups = await GroupOrder.find({ groupId: { $in: campaigns.map(c => c.groupId) } })
      .select('groupId status deadline currentQty targetQty currentUnitPrice shippingMethod shippingCostPerUnit participants.userId participants.qty participants.unitPrice participants.totalAmount participants.paymentStatus participants.transport.amount')
      .lean() as any[]
    const byId = new Map(groups.map(g => [g.groupId, g]))
    return NextResponse.json({
      success: true,
      campaigns: campaigns.map(c => {
        const g = byId.get(c.groupId)
        const me = (g?.participants || []).find((p: any) => p.userId && String(p.userId) === auth.userId)
        const active = (c.reservations || []).filter((r: any) => r.status !== 'cancelled')
        return {
          code: c.code,
          url: `${MARKET_BRAND.url}/precommande/${c.code}`,
          groupId: c.groupId,
          productName: c.productName,
          productImage: c.productImage,
          resalePrice: c.resalePrice,
          deposit: c.deposit,
          message: c.message,
          closed: c.closed,
          reservedQty: active.reduce((s: number, r: any) => s + r.qty, 0),
          reservations: (c.reservations || []).map((r: any) => ({
            id: String(r._id), name: r.name, phone: r.phone, qty: r.qty, note: r.note, status: r.status, createdAt: r.createdAt,
          })),
          group: g ? {
            status: g.status,
            deadline: g.deadline,
            currentQty: g.currentQty,
            targetQty: g.targetQty,
            currentUnitPrice: g.currentUnitPrice,
            myQty: me?.qty || 0,
            myUnitPrice: me?.unitPrice,
            myPaymentStatus: me?.paymentStatus,
            shippingMethod: g.shippingMethod,
            // Transport réel par pièce une fois le lot pesé, sinon estimation
            transportPerPiece: me?.transport?.amount && me.qty ? Math.round(me.transport.amount / me.qty) : g.shippingCostPerUnit || 0,
            transportIsReal: !!me?.transport,
          } : null,
        }
      }),
    })
  } catch (error) {
    console.error('GET /api/market/preorders error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse
  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour ouvrir des précommandes' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : ''
    const resalePrice = Math.round(Number(body?.resalePrice))
    const deposit = body?.deposit != null && body.deposit !== '' ? Math.round(Number(body.deposit)) : undefined
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 300) : undefined
    if (!/^GRP-[\w-]{3,40}$/.test(groupId)) return NextResponse.json({ success: false, error: 'Achat groupé invalide' }, { status: 400 })
    if (!Number.isFinite(resalePrice) || resalePrice < 100) return NextResponse.json({ success: false, error: 'Prix de revente invalide (100 F minimum)' }, { status: 400 })
    if (deposit !== undefined && (!Number.isFinite(deposit) || deposit < 0 || deposit > resalePrice)) {
      return NextResponse.json({ success: false, error: 'Acompte invalide' }, { status: 400 })
    }

    await connectDB()
    const group = await GroupOrder.findOne({ groupId }).select('status deadline product').lean() as any
    if (!group || group.status !== 'open' || new Date(group.deadline) < new Date()) {
      return NextResponse.json({ success: false, error: 'Les précommandes ne s\'ouvrent que sur un achat groupé ouvert' }, { status: 409 })
    }
    const [user, vendor] = await Promise.all([
      User.findById(auth.userId).select('name phone').lean() as any,
      VendorProfile.findOne({ userId: auth.userId }).select('name slug').lean() as any,
    ])
    if (!user) return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })

    const uid = new mongoose.Types.ObjectId(auth.userId)
    const existing = await ResellerPreorder.findOne({ groupId, ownerUserId: uid })
    if (existing) {
      existing.resalePrice = resalePrice
      existing.deposit = deposit
      existing.message = message
      existing.closed = false
      await existing.save()
      return NextResponse.json({ success: true, code: existing.code, url: `${MARKET_BRAND.url}/precommande/${existing.code}` })
    }

    for (let i = 0; i < 3; i++) {
      try {
        const created = await ResellerPreorder.create({
          code: newCode(),
          groupId,
          ownerUserId: uid,
          ownerName: vendor?.name || user.name || 'Revendeur',
          ownerPhone: user.phone,
          shopSlug: vendor?.slug,
          productName: group.product?.name || 'Produit',
          productImage: group.product?.image,
          resalePrice,
          deposit,
          message,
        })
        return NextResponse.json({ success: true, code: created.code, url: `${MARKET_BRAND.url}/precommande/${created.code}` }, { status: 201 })
      } catch (err: any) {
        if (err?.code !== 11000) throw err
      }
    }
    return NextResponse.json({ success: false, error: 'Réessayez' }, { status: 409 })
  } catch (error) {
    console.error('POST /api/market/preorders error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
