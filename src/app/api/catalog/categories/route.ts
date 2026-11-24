import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import Product from '@/lib/models/Product'
import { categoryScope } from '@/lib/catalog/category-match'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { formatCategoryForApi } from '@/lib/taxonomy/category-api-format'
import { getRedisClient } from '@/lib/redis'

const CATEGORIES_CACHE_KEY = 'catalog:categories:v2'
const CATEGORIES_CACHE_TTL = 300 // 5 min
const CATEGORIES_CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' }

const fallbackCategories = defaultProductCategories.map((category, index) => ({
  slug: category.id,
  name: category.name,
  labelFr: category.name,
  icon: category.icon,
  color: '#f97316',
  description: category.description,
  subCategories: (category.subCategories || []).map((s) => ({
    slug: s.id,
    name: s.name,
    labelFr: s.name,
    icon: s.icon
  })),
  order: index,
  isActive: true,
  taxonomyId: category.id,
  level: 1,
  isLeaf: false,
  allowedUnits: ['piece'],
  requiredAttributes: [],
  optionalAttributes: [],
  searchFilters: [],
  supportsWholesale: true,
  supportsDropshipping: true,
  supportsGroupBuying: true,
  commissionRate: 0.08,
}))

export async function GET() {
  try {
    const redis = getRedisClient()
    if (redis && redis.status === 'ready') {
      const cached = await redis.get(CATEGORIES_CACHE_KEY)
      if (cached) return NextResponse.json(JSON.parse(cached), { headers: CATEGORIES_CACHE_HEADERS })
    }

    await connectMongoose()
    let dbItems = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()

    if (dbItems.length === 0) {
      dbItems = fallbackCategories as any
    }

    // Comptage des produits publi?s : une famille agr?ge ses sous-cat?gories
    const rawCounts = await Product.aggregate<{ _id: string; count: number }>([
      { $match: { isPublished: { $ne: false } } },
      { $group: { _id: { $toLower: { $ifNull: ['$category', ''] } }, count: { $sum: 1 } } },
    ])
    const countsBySlug = new Map(rawCounts.map(r => [String(r._id), r.count]))
    const sumScope = (scope: Set<string>) => Array.from(scope).reduce((n, s) => n + (countsBySlug.get(s) || 0), 0)

    const items = dbItems.map((c: any) => {
      const scope = categoryScope(c.slug, (c.subCategories || []).map((s: any) => s.slug))
      return formatCategoryForApi(c, sumScope(scope), countsBySlug)
    })
    const response = { success: true, items }

    if (redis && redis.status === 'ready') {
      await redis.set(CATEGORIES_CACHE_KEY, JSON.stringify(response), 'EX', CATEGORIES_CACHE_TTL)
    }

    return NextResponse.json(response, { headers: CATEGORIES_CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/catalog/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
