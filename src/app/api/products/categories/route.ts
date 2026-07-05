import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import Product from '@/lib/models/Product.validated'
import { defaultProductCategories } from '@/lib/data/default-categories'

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
}))

export async function GET() {
  try {
    await connectMongoose()

    const dbCategories = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()
    const categories = dbCategories.length > 0 ? dbCategories : fallbackCategories

    // Count products per category (top-level slug only)
    const counts = await Product.aggregate([
      { $match: { category: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])
    const countMap = new Map(counts.map((c: any) => [String(c._id), Number(c.count) || 0]))

    const items = categories.map((c: any) => ({
      category: c.slug,
      name: c.labelFr || c.name,
      label: c.labelFr || c.name,
      icon: c.icon,
      color: c.color,
      subCategories: (c.subCategories || []).map((s: any) => ({
        slug: s.slug,
        name: s.labelFr || s.name,
        icon: s.icon
      })),
      count: countMap.get(c.slug) || 0
    }))

    const knownCategories = new Set(items.map(item => item.category))
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

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/products/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
