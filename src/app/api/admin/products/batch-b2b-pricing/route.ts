import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'
import { readPricingDefaults } from '@/lib/pricing/settings'

/**
 * POST /api/admin/products/batch-b2b-pricing
 * 
 * Calcule et applique automatiquement le b2bPrice sur tous les produits
 * qui ont un prix retail (price ou baseCost) mais pas de b2bPrice,
 * OU recalcule tous les b2bPrice existants si force=true.
 * 
 * Body:
 *   discountPercent: number (ex: 15 = -15% sur le prix retail) — defaut 15
 *   force: boolean — recalculer meme si b2bPrice existe deja
 *   dryRun: boolean — simuler sans ecrire
 *   minPrice: number — prix minimum pour appliquer (defaut 0)
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    const role = auth.role?.toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const defaults = readPricingDefaults()
    const defaultDiscount = typeof defaults.defaultB2BDiscountPercent === 'number' ? defaults.defaultB2BDiscountPercent : 15
    const discountPercent = typeof body.discountPercent === 'number' ? body.discountPercent : defaultDiscount
    const force = body.force === true
    const dryRun = body.dryRun === true
    const minPrice = typeof body.minPrice === 'number' ? body.minPrice : 0

    if (discountPercent < 1 || discountPercent > 50) {
      return NextResponse.json(
        { error: 'discountPercent doit etre entre 1 et 50' },
        { status: 400 }
      )
    }

    await connectMongoose()

    // Trouver les produits eligibles
    const filter: any = {
      $or: [
        { price: { $exists: true, $gt: minPrice } },
        { baseCost: { $exists: true, $gt: minPrice } },
      ],
    }
    if (!force) {
      // Seulement ceux sans b2bPrice ou b2bPrice = 0
      filter.$and = [
        { $or: [{ b2bPrice: { $exists: false } }, { b2bPrice: null }, { b2bPrice: 0 }] },
      ]
    }

    const products = await Product.find(filter)
      .select('name price baseCost b2bPrice price1688 exchangeRate serviceFeeRate category')
      .lean()

    const results: Array<{
      id: string
      name: string
      retailPrice: number
      oldB2bPrice: number | null
      newB2bPrice: number
      discount: string
    }> = []

    const bulkOps: any[] = []

    for (const p of products as any[]) {
      // Determiner le prix retail de reference
      const retailPrice = p.price || p.baseCost || 0
      if (retailPrice <= minPrice) continue

      const newB2bPrice = Math.round(retailPrice * (1 - discountPercent / 100))

      // Ne pas mettre a jour si le b2bPrice existant est deja correct (tolerance 1 FCFA)
      if (!force && p.b2bPrice && Math.abs(p.b2bPrice - newB2bPrice) <= 1) continue

      results.push({
        id: String(p._id),
        name: p.name || 'Sans nom',
        retailPrice,
        oldB2bPrice: p.b2bPrice || null,
        newB2bPrice,
        discount: `-${discountPercent}%`,
      })

      if (!dryRun) {
        bulkOps.push({
          updateOne: {
            filter: { _id: p._id },
            update: { $set: { b2bPrice: newB2bPrice } },
          },
        })
      }
    }

    // Executer les mises a jour en bulk
    let writeResult = null
    if (!dryRun && bulkOps.length > 0) {
      writeResult = await Product.bulkWrite(bulkOps)
    }

    return NextResponse.json({
      success: true,
      dryRun,
      discountPercent,
      defaultDiscount,
      force,
      totalProducts: products.length,
      updatedCount: dryRun ? 0 : (writeResult?.modifiedCount ?? 0),
      previewCount: results.length,
      preview: results.slice(0, 100),
    })
  } catch (error) {
    console.error('Erreur batch-b2b-pricing:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// GET — Preview sans modifier (equivalent dryRun)
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    const role = auth.role?.toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    await connectMongoose()

    const products = await Product.find({
      $or: [
        { price: { $exists: true, $gt: 0 } },
        { baseCost: { $exists: true, $gt: 0 } },
      ],
    })
      .select('name price baseCost b2bPrice category')
      .sort({ updatedAt: -1 })
      .lean()

    const summary = {
      total: products.length,
      withB2bPrice: 0,
      withoutB2bPrice: 0,
      products: [] as any[],
    }

    for (const p of products as any[]) {
      const hasB2b = typeof p.b2bPrice === 'number' && p.b2bPrice > 0
      if (hasB2b) summary.withB2bPrice++
      else summary.withoutB2bPrice++

      summary.products.push({
        id: String(p._id),
        name: p.name,
        category: p.category,
        price: p.price || p.baseCost || 0,
        b2bPrice: p.b2bPrice || null,
        hasB2bPrice: hasB2b,
      })
    }

    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    console.error('Erreur batch-b2b-pricing GET:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
