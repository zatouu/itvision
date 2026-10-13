import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { isInternalCall } from '@/lib/internal-auth'
import { computeProductPricing } from '@/lib/logistics'

export const dynamic = 'force-dynamic'

const MAX_TERMS = 8

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * POST /api/internal/market/pro-supplies { terms: string[] }
 * « Mon stock » Xeuy → DDM+ : produits publiés (prix public et prix pro) et achats groupés ouverts
 * correspondant aux consommables d'un prestataire.
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const terms: string[] = Array.isArray(body?.terms)
      ? [...new Set(body.terms
          .filter((t: unknown): t is string => typeof t === 'string' && t.trim().length >= 3)
          .map((t: string) => t.trim().toLowerCase().slice(0, 60)))].slice(0, MAX_TERMS) as string[]
      : []
    if (terms.length === 0) return NextResponse.json({ products: [], groups: [] })

    // Un terme correspond si tous ses mots significatifs figurent dans le nom (ou les tags pour un produit)
    const wordSets = terms
      .map(term => term.split(/\s+/).filter(w => w.length >= 3).slice(0, 4))
      .filter(words => words.length > 0)
    if (wordSets.length === 0) return NextResponse.json({ products: [], groups: [] })
    const re = (w: string) => new RegExp(escapeRegExp(w), 'i')

    await connectMongoose()
    const [docs, groups] = await Promise.all([
      Product.find({
        isPublished: { $ne: false },
        stockStatus: { $ne: 'out_of_stock' },
        $or: wordSets.map(ws => ({ $and: ws.map(w => ({ $or: [{ name: re(w) }, { tags: re(w) }] })) })),
      })
        .select('name image price b2bPrice baseCost marginRate price1688 exchangeRate serviceFeeRate insuranceRate currency stockStatus sourcing.platform groupBuyEnabled')
        .limit(12)
        .lean() as Promise<any[]>,
      GroupOrder.find({
        status: 'open',
        deadline: { $gt: new Date() },
        $or: wordSets.map(ws => ({ $and: ws.map(w => ({ 'product.name': re(w) })) })),
      })
        .select('groupId product.name product.image currentUnitPrice currentQty targetQty minQty deadline')
        .sort({ deadline: 1 })
        .limit(6)
        .lean() as Promise<any[]>,
    ])

    const products = docs.map(d => {
      const pricing = computeProductPricing(d)
      const price = pricing.totalWithFees ?? pricing.salePrice ?? (typeof d.price === 'number' ? d.price : null)
      const proPrice = typeof d.b2bPrice === 'number' && d.b2bPrice > 0 && (price === null || d.b2bPrice < price) ? d.b2bPrice : null
      return {
        id: String(d._id),
        name: d.name,
        image: d.image || null,
        priceFcfa: price,
        proPriceFcfa: proPrice,
        stockStatus: d.stockStatus || 'preorder',
        groupBuy: !!d.groupBuyEnabled,
        path: `/produits/${String(d._id)}`,
      }
    })

    return NextResponse.json({
      products,
      groups: groups.map(g => ({
        groupId: g.groupId,
        name: g.product?.name,
        image: g.product?.image || null,
        unitPriceFcfa: g.currentUnitPrice,
        currentQty: g.currentQty,
        targetQty: g.targetQty || g.minQty,
        deadline: g.deadline,
        path: `/achats-groupes/${g.groupId}`,
      })),
    })
  } catch (err) {
    console.error('[POST /api/internal/market/pro-supplies]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
