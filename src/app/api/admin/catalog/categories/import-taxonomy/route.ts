import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { seedTaxonomyToMongoDB } from '@/lib/taxonomy/mongodb'
import { requireAdminApi } from '@/lib/api-auth'

/**
 * POST /api/admin/catalog/categories/import-taxonomy
 * Importe la taxonomy complète depuis src/lib/taxonomy/taxonomy.json
 * dans la collection ProductCategory MongoDB.
 * Requires ADMIN / SUPER_ADMIN / PRODUCT_MANAGER.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectMongoose()

    const { dryRun = false } = await request.json().catch(() => ({}))
    const result = await seedTaxonomyToMongoDB(Boolean(dryRun))

    return NextResponse.json({
      success: true,
      message: dryRun ? 'Dry-run terminé' : 'Taxonomy importée avec succès',
      dryRun: Boolean(dryRun),
      summary: result,
    })
  } catch (error) {
    console.error('POST /api/admin/catalog/categories/import-taxonomy error', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de l\'import de la taxonomy' },
      { status: 500 }
    )
  }
}
