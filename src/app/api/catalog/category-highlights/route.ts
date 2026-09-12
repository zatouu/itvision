import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import ProductCategory from '@/lib/models/ProductCategory'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { countProductsByCategory } from '@/lib/catalog/category-match'
import { getRedisClient } from '@/lib/redis'

const CACHE_KEY = 'catalog:category-highlights:v1'
const CACHE_TTL = 300 // 5 min
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' }

/**
 * Highlights par catégorie taxonomie : comptage réel + image représentative.
 * Endpoint léger (~2 KB) pour l'accueil — évite de télécharger tout le catalogue.
 * Les produits portent des `category` texte libres → matching par mots-clés.
 */
export async function GET() {
  try {
    const redis = getRedisClient()
    if (redis && redis.status === 'ready') {
      const cached = await redis.get(CACHE_KEY)
      if (cached) return NextResponse.json(JSON.parse(cached), { headers: CACHE_HEADERS })
    }

    await connectMongoose()

    let categories = await ProductCategory.find({ isActive: true }).sort({ order: 1, name: 1 }).lean()
    if (categories.length === 0) {
      categories = defaultProductCategories.map((c: any) => ({
        slug: c.id, name: c.name, icon: c.icon, labelFr: c.name,
      })) as any
    }

    const products = await Product.find({ isPublished: { $ne: false } })
      .select('name category image')
      .lean()

    const slugs = categories.map((c: any) => String(c.slug || c._id || c.name || '').toLowerCase())
    const stats = countProductsByCategory(products as any, slugs)

    const items = categories.map((c: any) => {
      const slug = String(c.slug || c._id || c.name || '').toLowerCase()
      const stat = stats.get(slug)
      return {
        slug,
        name: c.name,
        labelFr: c.labelFr || c.name,
        icon: c.icon,
        count: stat?.count ?? 0,
        image: stat?.image ?? null,
      }
    })

    const response = { success: true, items }
    if (redis && redis.status === 'ready') {
      await redis.set(CACHE_KEY, JSON.stringify(response), 'EX', CACHE_TTL)
    }
    return NextResponse.json(response, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/catalog/category-highlights error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
