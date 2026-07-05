import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import { defaultProductCategories } from '@/lib/data/default-categories'

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
}))

export async function GET() {
  try {
    await connectMongoose()
    const dbItems = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()

    const items = dbItems.length > 0 ? dbItems : fallbackCategories

    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/catalog/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
