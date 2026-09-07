import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import PromoCode from '@/lib/models/PromoCode'

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code promo manquant' }, { status: 400 })
    }

    const orderSubtotal = typeof subtotal === 'number' ? subtotal : 0

    await connectDB()

    const promo = await PromoCode.findOne({ code: code.toUpperCase().trim() })

    if (!promo || !promo.active) {
      return NextResponse.json({ error: 'Code promo invalide' }, { status: 404 })
    }

    const now = new Date()
    if (promo.validFrom && now < promo.validFrom) {
      return NextResponse.json({ error: 'Code promo non encore actif' }, { status: 400 })
    }
    if (promo.validUntil && now > promo.validUntil) {
      return NextResponse.json({ error: 'Code promo expiré' }, { status: 400 })
    }
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: 'Code promo épuisé' }, { status: 400 })
    }
    if (orderSubtotal < promo.minOrderAmount) {
      return NextResponse.json(
        { error: `Montant minimum requis: ${promo.minOrderAmount.toLocaleString('fr-FR')} FCFA` },
        { status: 400 }
      )
    }

    let discount = 0
    if (typeof promo.discountPercent === 'number' && promo.discountPercent > 0) {
      discount = Math.round(orderSubtotal * (promo.discountPercent / 100))
    }
    if (typeof promo.discountAmount === 'number' && promo.discountAmount > 0) {
      discount = Math.max(discount, promo.discountAmount)
    }
    if (typeof promo.maxDiscountAmount === 'number' && promo.maxDiscountAmount > 0) {
      discount = Math.min(discount, promo.maxDiscountAmount)
    }
    discount = Math.min(discount, orderSubtotal)

    return NextResponse.json({
      success: true,
      code: promo.code,
      description: promo.description,
      discount,
      discountPercent: promo.discountPercent,
      discountAmount: promo.discountAmount,
    })
  } catch (error: any) {
    console.error('[Promo Validate] Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
