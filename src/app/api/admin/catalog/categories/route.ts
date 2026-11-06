import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'
import { requireAdminApi } from '@/lib/api-auth'
import { invalidateCatalogCache } from '@/lib/catalog-cache'

const DEFAULT_COLOR = '#f97316'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const name = String(body?.name || '').trim()
    const slugInput = String(body?.slug || '').trim()

    if (!name) {
      return NextResponse.json({ success: false, error: 'Le nom de la catégorie est requis' }, { status: 400 })
    }

    const slug = slugify(slugInput || name)
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug de catégorie invalide' }, { status: 400 })
    }

    await connectMongoose()

    const existing = await ProductCategory.findOne({ slug }).lean()
    const order = Number.isFinite(Number(body?.order)) ? Number(body.order) : await ProductCategory.countDocuments()
    const icon = typeof body?.icon === 'string' && body.icon.trim() ? body.icon.trim() : 'tag'
    const color = typeof body?.color === 'string' && body.color.trim() ? body.color.trim() : DEFAULT_COLOR
    const description = typeof body?.description === 'string' ? body.description.trim() : ''

    // Parse subcategories if provided; otherwise preserve existing ones
    const providedSubCategories = Array.isArray(body?.subCategories)
      ? body.subCategories
          .map((s: any) => ({
            slug: slugify(String(s?.slug || '')),
            name: String(s?.name || '').trim(),
            labelFr: String(s?.labelFr || s?.name || '').trim(),
            icon: typeof s?.icon === 'string' && s.icon.trim() ? s.icon.trim() : 'tag'
          }))
          .filter((s: any) => s.slug && s.name)
      : undefined

    const updateSet: any = {
      slug,
      name,
      labelFr: name,
      icon,
      color,
      description,
      order,
      isActive: true,
    }
    if (providedSubCategories !== undefined) {
      updateSet.subCategories = providedSubCategories
    }

    const category = await ProductCategory.findOneAndUpdate(
      { slug },
      { $set: updateSet },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    )
    void invalidateCatalogCache()

    return NextResponse.json({
      success: true,
      action: existing ? 'updated' : 'created',
      item: {
        slug: category.slug,
        name: category.labelFr || category.name,
      },
    })
  } catch (error) {
    console.error('POST /api/admin/catalog/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
