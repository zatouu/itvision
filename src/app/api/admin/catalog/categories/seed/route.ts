import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { invalidateCatalogCache } from '@/lib/catalog-cache'
import { reorganizeCategories } from '@/lib/catalog/category-migration'

/**
 * Installe l'arborescence de référence et reclasse les produits.
 * Body `{ dryRun?: boolean }` — aperçu par défaut, `dryRun: false` pour appliquer.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const dryRun = body?.dryRun !== false

    await connectMongoose()
    const report = await reorganizeCategories({ dryRun })
    if (!dryRun) void invalidateCatalogCache()

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Aperçu de la réorganisation' : 'Catégories réorganisées',
      summary: {
        total: report.families.created.length + report.families.updated.length,
        created: report.families.created.length,
        updated: report.families.updated.length,
      },
      report,
    })
  } catch (error) {
    console.error('POST /api/admin/catalog/categories/seed error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}