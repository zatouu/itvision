/**
 * POST /api/group-orders/[groupId]/quantity  { addQty }
 * Ajoute des pièces à sa participation (groupe ouvert, rien payé) : réservations
 * de ses propres clients, besoin revu à la hausse. Tous les prix sont recalculés au nouveau volume.
 */
import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { connectDB } from '@/lib/db'
import { requireAuth } from '@/lib/jwt'
import { readPaymentSettings } from '@/lib/payments/settings'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { groupParticipantUnitPrice } from '@/lib/group-orders/pricing'
import { assignPaymentRefsAndNotify } from '@/lib/group-order-helpers'
import { creditGroupCompleteToParticipants } from '@/lib/grains'
import { invalidateGroupOrdersCache } from '@/lib/catalog-cache'

interface RouteContext {
  params: Promise<{ groupId: string }>
}

function tierPrice(group: any, qty: number): number {
  const tiers = [...(group.priceTiers || [])].sort((a: any, b: any) => b.minQty - a.minQty)
  for (const t of tiers) if (qty >= t.minQty) return t.price
  return group.product.basePrice
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { groupId } = await context.params
  const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  let auth
  try {
    auth = await requireAuth(req)
  } catch {
    return NextResponse.json({ success: false, error: 'Connectez-vous pour modifier votre participation' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const addQty = Number(body?.addQty)
  const rules = readPaymentSettings().groupOrders.rules
  if (!Number.isInteger(addQty) || addQty < 1) {
    return NextResponse.json({ success: false, error: 'Quantité invalide' }, { status: 400 })
  }

  try {
    await connectDB()
    // Mise à jour optimiste : réessayée si un autre inscrit a modifié le groupe entre-temps
    for (let attempt = 0; attempt < 3; attempt++) {
      const group = await GroupOrder.findOne({ groupId }).lean() as any
      if (!group) return NextResponse.json({ success: false, error: 'Achat groupé non trouvé' }, { status: 404 })
      if (group.status !== 'open' || new Date(group.deadline) < new Date()) {
        return NextResponse.json({ success: false, error: 'Cet achat groupé n\'accepte plus de modification' }, { status: 400 })
      }
      const me = (group.participants || []).find((p: any) => p.userId && String(p.userId) === String(auth.userId))
      if (!me) return NextResponse.json({ success: false, error: 'Vous ne participez pas encore à cet achat groupé' }, { status: 400 })
      if ((me.paidAmount || 0) > 0) {
        return NextResponse.json({ success: false, error: 'Un paiement a déjà été enregistré : contactez le support pour modifier la quantité' }, { status: 400 })
      }
      const newQty = me.qty + addQty
      if (newQty > rules.maxJoinQtyPerParticipant) {
        return NextResponse.json({ success: false, error: `Maximum ${rules.maxJoinQtyPerParticipant} pièces par participant` }, { status: 400 })
      }
      const currentQty = group.currentQty + addQty
      if (typeof group.maxQty === 'number' && group.maxQty > 0 && currentQty > group.maxQty) {
        return NextResponse.json({ success: false, error: `Il reste ${group.maxQty - group.currentQty} pièce(s) disponible(s)` }, { status: 400 })
      }

      const product = await Product.findById(group.product.productId).lean()
      const participants = (group.participants || []).map((p: any) => {
        const qty = String(p._id) === String(me._id) ? newQty : p.qty
        const unit = product
          ? groupParticipantUnitPrice(product, group.product.basePrice, group.priceTiers, p.variantIds, currentQty)
          : tierPrice(group, currentQty)
        return { ...p, qty, unitPrice: unit, totalAmount: qty * unit }
      })
      const reached = currentQty >= group.targetQty || (typeof group.maxQty === 'number' && group.maxQty > 0 && currentQty >= group.maxQty)
      const status = rules.autoFillOnTargetReached && reached ? 'filled' : 'open'

      const res = await GroupOrder.updateOne(
        { _id: group._id, status: 'open', updatedAt: group.updatedAt },
        { $set: { participants, currentQty, currentUnitPrice: tierPrice(group, currentQty), status } }
      )
      if (res.modifiedCount !== 1) continue

      void invalidateGroupOrdersCache()
      if (status === 'filled') {
        const doc = await GroupOrder.findOne({ groupId })
        if (doc) {
          await creditGroupCompleteToParticipants(doc).catch(() => {})
          await assignPaymentRefsAndNotify(doc).catch((err: unknown) => console.error('[group-quantity] liens paiement:', err))
        }
      }
      const mine = participants.find((p: any) => String(p._id) === String(me._id))
      return NextResponse.json({
        success: true,
        qty: newQty,
        unitPrice: mine?.unitPrice,
        totalAmount: mine?.totalAmount,
        currentQty,
        filled: status === 'filled',
      })
    }
    return NextResponse.json({ success: false, error: 'Le groupe bouge beaucoup en ce moment, réessayez' }, { status: 409 })
  } catch (error) {
    console.error('POST /api/group-orders/[groupId]/quantity error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
