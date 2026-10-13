/**
 * GET /api/vendor/products/prefill?groupId=GRP-…
 * Lot d'achat groupé livré → fiche boutique pré-remplie (nom, photos, description, quantité),
 * prix de revient réel (payé ÷ pièces, transport compris) et prix de vente suggéré.
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireRole } from '@/lib/auth-server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { computeEffectivePricing } from '@/lib/pricing/quote-cart'

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step

export async function GET(req: NextRequest) {
  const auth = await requireRole(['VENDOR', 'ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
  if (!auth || !auth.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })

  const groupId = new URL(req.url).searchParams.get('groupId') || ''
  if (!/^GRP-[\w-]{3,40}$/.test(groupId)) return NextResponse.json({ success: false, error: 'Achat groupé invalide' }, { status: 400 })

  await connectMongoose()
  const uid = new mongoose.Types.ObjectId(auth.user.id)
  const group = await GroupOrder.findOne({ groupId, 'participants.userId': uid }).lean() as any
  if (!group) return NextResponse.json({ success: false, error: 'Vous ne participez pas à cet achat groupé' }, { status: 404 })
  if (group.status !== 'delivered') {
    return NextResponse.json({ success: false, error: 'Le lot n\'est pas encore livré : la mise en vente s\'ouvre à la réception' }, { status: 409 })
  }
  const me = (group.participants || []).find((p: any) => p.userId && String(p.userId) === auth.user!.id)
  if (!me || me.paymentStatus !== 'paid') {
    return NextResponse.json({ success: false, error: 'Votre participation n\'est pas réglée' }, { status: 409 })
  }

  const product = await Product.findById(group.product.productId)
    .select('name description category image gallery features weightKg tags price baseCost price1688 marginRate exchangeRate variantGroups priceTiers b2bPrice')
    .lean() as any
  const qty = Number(me.qty) || 0
  const paid = Number(me.paidAmount) > 0 ? Math.min(Number(me.paidAmount), Number(me.totalAmount) || Infinity) : Number(me.totalAmount) || 0
  const transport = Number(me.transport?.amount) || 0
  const unitCost = qty > 0 ? Math.round((paid + transport) / qty) : 0
  // Référence : prix DDM+ d'une pièce à l'import (sans transport, délai de plusieurs semaines)
  const importUnitPrice = product ? Math.round(computeEffectivePricing(product, me.variantIds).displayPrice || 0) : 0
  const suggested = Math.max(roundUp(unitCost * 1.3, 500), importUnitPrice > unitCost ? roundUp(importUnitPrice, 500) : 0)

  const photos = [product?.image || group.product.image, ...(product?.gallery || [])]
    .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0 && u.length <= 500)
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 8)

  const variantNote = Array.isArray(me.variantLabels) && me.variantLabels.length > 0 ? `\nVariante : ${me.variantLabels.join(', ')}` : ''

  return NextResponse.json({
    success: true,
    prefill: {
      groupId,
      alreadyListedProductId: me.resaleProductId ? String(me.resaleProductId) : undefined,
      name: String(product?.name || group.product.name).slice(0, 200),
      description: `${String(product?.description || '').slice(0, 1800)}${variantNote}`.trim(),
      category: product?.category,
      photos,
      features: Array.isArray(product?.features) ? product.features.slice(0, 10) : [],
      weightKg: product?.weightKg,
      stockQuantity: qty,
      unitCost,
      importUnitPrice,
      suggestedPrice: suggested,
    },
  })
}
