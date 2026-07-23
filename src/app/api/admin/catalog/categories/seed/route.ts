import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import { requireAdminApi } from '@/lib/api-auth'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { invalidateCatalogCache } from '@/lib/catalog-cache'

function toSeedCategories() {
  return defaultProductCategories.map((category, index) => ({
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
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectMongoose()

    const categories = toSeedCategories()
    let created = 0
    let updated = 0

    for (const [index, category] of categories.entries()) {
      const existing = await ProductCategory.findOne({ slug: category.slug }).lean()

      await ProductCategory.findOneAndUpdate(
        { slug: category.slug },
        {
          $set: {
            ...category,
            order: index,
            isActive: true,
          },
        },
        {
          upsert: true,
          new: true,
        }
      )

      if (existing) {
        updated += 1
      } else {
        created += 1
      }
    }

    void invalidateCatalogCache()

    return NextResponse.json({
      success: true,
      message: 'Catégories produits seedées',
      summary: {
        total: categories.length,
        created,
        updated,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/catalog/categories/seed error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
