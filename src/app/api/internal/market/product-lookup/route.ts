import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { isInternalCall } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

const MAX_NAMES = 50

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POST /api/internal/market/product-lookup
 * Résolution interne de produits marketplace par nom (appels serveur-à-serveur,
 * ex. génération de devis depuis une intervention corporate).
 * Body : { names: string[] }
 * Réponse : { results: [{ name, found, productId?, unitPrice?, marginRate? }] }
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const names = Array.isArray(body?.names)
      ? body.names.filter((n: unknown) => typeof n === 'string' && n.trim()).slice(0, MAX_NAMES)
      : []
    if (names.length === 0) {
      return NextResponse.json({ results: [] })
    }

    await connectMongoose()

    const results = await Promise.all(names.map(async (name: string) => {
      const product = await Product.findOne({ name: new RegExp(escapeRegExp(name.trim()), 'i') })
        .select('name price priceAmount marginRate')
        .lean() as any
      if (!product) return { name, found: false }
      return {
        name,
        found: true,
        productId: String(product._id),
        unitPrice: product.price ?? product.priceAmount ?? 0,
        marginRate: product.marginRate ?? 0
      }
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[POST /api/internal/market/product-lookup]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
