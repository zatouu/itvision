import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'

// PATCH - Mettre à jour le prix B2B d'un ou plusieurs produits
// Appelé automatiquement lors de la sauvegarde d'un devis entreprise
export async function PATCH(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN' && role !== 'PRODUCT_MANAGER') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()

    const body = await request.json()
    const updates: Array<{ productId: string; b2bPrice: number }> = body.updates

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Aucune mise à jour fournie' }, { status: 400 })
    }

    const results: Array<{ productId: string; success: boolean; b2bPrice?: number }> = []

    for (const { productId, b2bPrice } of updates) {
      if (!productId || typeof b2bPrice !== 'number' || b2bPrice < 0) {
        results.push({ productId, success: false })
        continue
      }

      const updated = await Product.findByIdAndUpdate(
        productId,
        { $set: { b2bPrice } },
        { new: true, select: 'name b2bPrice price' }
      )

      results.push({
        productId,
        success: !!updated,
        b2bPrice: updated?.b2bPrice
      })
    }

    return NextResponse.json({
      success: true,
      updated: results.filter(r => r.success).length,
      results
    })
  } catch (error) {
    console.error('Erreur mise à jour b2bPrice:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// GET - Récupérer les prix B2B de tous les produits qui en ont un
export async function GET(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN' && role !== 'PRODUCT_MANAGER') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()

    const products = await Product.find(
      { b2bPrice: { $exists: true, $gt: 0 } },
      { name: 1, category: 1, price: 1, b2bPrice: 1, baseCost: 1, stockStatus: 1, image: 1 }
    ).sort({ updatedAt: -1 }).lean()

    return NextResponse.json({
      success: true,
      products: products.map((p: any) => ({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        price: p.price,
        b2bPrice: p.b2bPrice,
        baseCost: p.baseCost,
        stockStatus: p.stockStatus,
        image: p.image
      }))
    })
  } catch (error) {
    console.error('Erreur récupération prix B2B:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
