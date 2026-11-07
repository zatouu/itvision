import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { requireAdminApi, PRODUCT_STAFF_ROLES } from '@/lib/api-auth'
import { invalidateCatalogCache } from '@/lib/catalog-cache'

/**
 * POST /api/admin/products/duplicate  { id }
 *
 * Copie complète d'un produit (contenu, médias, prix, variantes, logistique) créée en brouillon :
 * non publiée, sans slug ni historique de prix, et détachée de l'offre source
 * (un ré-import de l'offre met à jour l'original, pas la copie).
 */
const NOT_COPIED = [
  '_id', '__v', 'slug', 'createdAt', 'updatedAt', 'priceHistory', 'lastPriceCheckAt',
  'imageEmbedding', 'embeddingUpdatedAt', 'imageEmbeddingStatus', 'imageEmbeddingError',
  'imageEmbeddingAttempts', 'imageEmbeddingVersion',
]

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, PRODUCT_STAFF_ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const body = await request.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: 'Identifiant produit invalide' }, { status: 400 })
  }

  try {
    await connectMongoose()
    const original = await Product.findById(id).lean() as Record<string, any> | null
    if (!original) return NextResponse.json({ success: false, error: 'Produit introuvable' }, { status: 404 })

    const copy: Record<string, any> = { ...original }
    for (const key of NOT_COPIED) delete copy[key]

    const sourceUrl = original.sourcing?.productUrl
    copy.name = `${String(original.name || 'Produit').trim()} (copie)`
    copy.isPublished = false
    copy.isFeatured = false
    copy.sourcing = {
      ...(original.sourcing || {}),
      externalId: undefined,
      productUrl: undefined,
      notes: [original.sourcing?.notes, `Copie de « ${original.name} »${sourceUrl ? ` — offre source : ${sourceUrl}` : ''}`]
        .filter(Boolean).join('\n'),
    }
    if (Array.isArray(copy.variantGroups)) {
      copy.variantGroups = copy.variantGroups.map((group: any) => {
        const { _id: _groupId, ...rest } = group || {}
        return {
          ...rest,
          variants: Array.isArray(group?.variants)
            ? group.variants.map((variant: any) => {
              const { _id: _variantId, ...v } = variant || {}
              return v
            })
            : [],
        }
      })
    }

    const created = await Product.create(copy)
    void invalidateCatalogCache()
    return NextResponse.json({ success: true, item: created.toObject() }, { status: 201 })
  } catch (error) {
    console.error('[products/duplicate] échec:', error)
    return NextResponse.json({ success: false, error: 'Duplication impossible' }, { status: 500 })
  }
}
