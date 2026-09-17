/**
 * POST /api/group-orders/interests — « Préviens-moi »
 *   body: { productId?, name?, phone }
 *   → { success, already } — idempotent, pas de doublon par (scope, phone).
 *
 * GET /api/group-orders/interests?productId=… — compteur public (agrégat, pas de PII)
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import GroupInterest from '@/lib/models/GroupInterest'
import Product from '@/lib/models/Product'
import { validatePhone, formatPhone } from '@/lib/payment-service'
import { applyRateLimit, serviceWriteRateLimiter, authRateLimiter } from '@/lib/rate-limiter'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json().catch(() => ({}))
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : undefined
    const productIdRaw = typeof body?.productId === 'string' ? body.productId.trim() : ''

    if (!validatePhone(phone)) {
      return NextResponse.json({ success: false, error: 'Numéro de téléphone invalide' }, { status: 400 })
    }
    if (productIdRaw && !mongoose.isValidObjectId(productIdRaw)) {
      return NextResponse.json({ success: false, error: 'Produit invalide' }, { status: 400 })
    }

    await connectDB()

    let productName: string | undefined
    if (productIdRaw) {
      const product = await Product.findById(productIdRaw).select('name').lean() as any
      if (!product) {
        return NextResponse.json({ success: false, error: 'Produit introuvable' }, { status: 404 })
      }
      productName = product.name
    }

    const scope = productIdRaw || 'global'
    const phoneNorm = formatPhone(phone)

    const res = await GroupInterest.updateOne(
      { scope, phone: phoneNorm },
      {
        $setOnInsert: {
          productId: productIdRaw ? new mongoose.Types.ObjectId(productIdRaw) : null,
          productName,
          phone: phoneNorm,
          name,
          notified: false,
        },
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true, already: !res.upsertedCount })
  } catch (error) {
    console.error('POST /api/group-orders/interests error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await applyRateLimit(req, authRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId') || ''
    if (productId && !mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ success: false, error: 'Produit invalide' }, { status: 400 })
    }

    await connectDB()
    const count = await GroupInterest.countDocuments({ scope: productId || 'global' })
    return NextResponse.json({ success: true, count })
  } catch (error) {
    console.error('GET /api/group-orders/interests error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
