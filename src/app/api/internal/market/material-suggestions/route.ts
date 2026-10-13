import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { isInternalCall } from '@/lib/internal-auth'
import { computeProductPricing } from '@/lib/logistics'

export const dynamic = 'force-dynamic'

const MAX_TERMS = 5
const PER_TERM = 2

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POST /api/internal/market/material-suggestions
 * Pont Xeuy → DDM+ : pour les fournitures identifiées par l'analyse IA d'une demande
 * de service, renvoie les produits publiés correspondants du catalogue marketplace.
 * Body : { terms: string[] }
 * Réponse : { results: [{ term, products: [{ id, name, image, priceFcfa, stockStatus, path }] }] }
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const terms: string[] = Array.isArray(body?.terms)
      ? body.terms
          .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length >= 3)
          .map((t: string) => t.trim().slice(0, 60))
          .slice(0, MAX_TERMS)
      : []
    if (terms.length === 0) return NextResponse.json({ results: [] })

    await connectMongoose()
    const seen = new Set<string>()

    const results = await Promise.all(terms.map(async (term) => {
      // Tous les mots significatifs doivent apparaître dans le nom ou les tags
      const words = term.split(/\s+/).filter(w => w.length >= 3).slice(0, 4)
      if (words.length === 0) return { term, products: [] }
      const filter = {
        isPublished: { $ne: false },
        stockStatus: { $ne: 'out_of_stock' },
        $and: words.map(w => {
          const re = new RegExp(escapeRegExp(w), 'i')
          return { $or: [{ name: re }, { tags: re }] }
        }),
      }
      const docs = await Product.find(filter)
        .select('name image price baseCost marginRate price1688 exchangeRate serviceFeeRate insuranceRate currency stockStatus sourcing.platform shopId')
        .limit(PER_TERM * 3)
        .lean() as any[]
      // Une mission a besoin du matériel tout de suite : stock local (boutique ou en stock à Dakar) d'abord
      const isLocal = (d: any) => !!d.shopId || d.stockStatus === 'in_stock'
      docs.sort((a, b) => Number(isLocal(b)) - Number(isLocal(a)))

      const products = docs
        .filter(d => !seen.has(String(d._id)))
        .slice(0, PER_TERM)
        .map(d => {
          seen.add(String(d._id))
          const pricing = computeProductPricing(d)
          const priceFcfa = pricing.totalWithFees ?? pricing.salePrice ?? (typeof d.price === 'number' ? d.price : null)
          return {
            id: String(d._id),
            name: d.name,
            image: d.image || null,
            priceFcfa,
            stockStatus: d.stockStatus || 'preorder',
            local: isLocal(d),
            path: `/produits/${String(d._id)}`,
          }
        })
      return { term, products }
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[POST /api/internal/market/material-suggestions]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
