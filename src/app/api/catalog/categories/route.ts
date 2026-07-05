import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { formatCategoryForApi } from '@/lib/taxonomy/category-api-format'

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
    await connectMongoose()
    let dbItems = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()

    if (dbItems.length === 0) {
      dbItems = fallbackCategories as any
    }

    const items = dbItems.map(c => formatCategoryForApi(c as any))

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/catalog/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
