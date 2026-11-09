import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import Product from '@/lib/models/Product'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { categoryScope } from '@/lib/catalog/category-match'
import { getProductCategoriesCache, setProductCategoriesCache } from '@/lib/catalog-cache'

const PRODUCT_CATEGORIES_CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' }

const fallbackCategories = defaultProductCategories.map((category, index) => ({
  slug: category.id,
  name: category.name,
  labelFr: category.name,
  icon: category.icon,
  color: '#f97316',
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
    const cached = await getProductCategoriesCache()
    if (cached) return NextResponse.json(cached, { headers: PRODUCT_CATEGORIES_CACHE_HEADERS })

    await connectMongoose()

    let dbCategories = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()
    if (dbCategories.length === 0) {
      dbCategories = fallbackCategories as any
    }

    const counts = await Product.aggregate([
      { $match: { category: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
    const countMap = new Map<string, number>(counts.map((r: any) => [String(r._id), Number(r.count) || 0]))
    // Une famille agrège ses propres produits et ceux de ses sous-catégories (arbre + base)
    const sumScope = (scope: Set<string>) => Array.from(scope).reduce((n, slug) => n + (countMap.get(slug) || 0), 0)
    const scopes = new Map(dbCategories.map((c: any) => [c.slug, categoryScope(c.slug, (c.subCategories || []).map((s: any) => s.slug))]))

    const items = dbCategories.map((c: any) => ({
      category: c.slug,
      name: c.labelFr || c.name,
      label: c.labelFr || c.name,
      icon: c.icon,
      color: c.color,
      subCategories: (c.subCategories || []).map((s: any) => ({
        slug: s.slug,
        name: s.labelFr || s.name,
        icon: s.icon,
        count: countMap.get(s.slug) || 0,
      })),
      count: sumScope(scopes.get(c.slug) || new Set([c.slug])),
    }))

    // Slugs couverts (familles + sous-catégories) : seuls les textes libres restants
    // apparaissent comme pseudo-catégories.
    const knownCategories = new Set<string>()
    for (const scope of Array.from(scopes.values())) for (const slug of Array.from(scope)) knownCategories.add(slug)
    for (const [category, count] of countMap.entries()) {
      if (!category || knownCategories.has(category)) continue
      items.push({
        category,
        name: category,
        label: category,
        icon: 'tag',
        color: '#f97316',
        subCategories: [],
        count,
      })
    }

    const response = { success: true, items }
    await setProductCategoriesCache(response)
    return NextResponse.json(response, { headers: PRODUCT_CATEGORIES_CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/products/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
