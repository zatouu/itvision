/**
 * POST /api/admin/catalog/image-embeddings/backfill
 *   Calcule les embeddings d'image pour les produits qui n'en ont pas encore.
 *   Réservé aux ADMIN / SUPER_ADMIN / PRODUCT_MANAGER.
 *
 *   Query params:
 *     ?limit=50    (défaut 50, max 200 par appel — éviter timeout serverless)
 *     ?force=1     recalcule même les produits qui ont déjà un embedding
 *
 *   Idéal pour être appelé via un cron / button admin pour amorcer le corpus.
 *
 * GET /api/admin/catalog/image-embeddings/backfill
 *   Retourne la couverture courante (combien de produits indexés).
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { requireAuth } from '@/lib/jwt'
import { computeImageEmbedding, fetchImageBuffer } from '@/lib/image-hash'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
const CURRENT_IMAGE_EMBEDDING_VERSION = 2
const MAX_FAILED_ATTEMPTS = 3

async function requireAdmin(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!ADMIN_ROLES.has(String(auth.role).toUpperCase())) {
      return { ok: false as const, status: 403, error: 'Accès refusé' }
    }
    return { ok: true as const, auth }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' }
  }
}

function buildBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = (request.headers.get('host') || '').replace(/^market\./i, '')
  return `${proto}://${host}`
}

export async function GET(request: NextRequest) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ error: adm.error }, { status: adm.status })

  await connectMongoose()
  const total = await Product.countDocuments(buildIndexableProductQuery())
  const indexed = await Product.countDocuments(buildIndexedProductQuery())

  return NextResponse.json({
    success: true,
    coverage: {
      totalIndexable: total,
      indexed,
      missing: total - indexed,
      percent: total > 0 ? +((indexed / total) * 100).toFixed(1) : 0
    }
  })
}

export async function POST(request: NextRequest) {
  const adm = await requireAdmin(request)
  if (!adm.ok) return NextResponse.json({ error: adm.error }, { status: adm.status })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50)))
  const force = searchParams.get('force') === '1'

  await connectMongoose()

  const query: any = {
    ...buildIndexableProductQuery()
  }
  if (!force) {
    query.$and = [
      {
        $or: [
          { imageEmbedding: { $in: [null, undefined] } },
          { imageEmbeddingVersion: { $ne: CURRENT_IMAGE_EMBEDDING_VERSION } }
        ]
      },
      {
        $or: [
          { imageEmbeddingStatus: { $ne: 'failed' } },
          { imageEmbeddingAttempts: { $lt: MAX_FAILED_ATTEMPTS } },
          { imageEmbeddingAttempts: { $exists: false } }
        ]
      }
    ]
  }

  const products = await Product.find(query)
    .select('_id image gallery name imageEmbeddingAttempts')
    .limit(limit)
    .lean()

  const baseUrl = buildBaseUrl(request)
  let processed = 0
  let failed = 0
  const errors: Array<{ id: string; name: string; error: string }> = []

  await Promise.allSettled(
    (products as any[]).map(async (p) => {
      const imgUrl = p.image || p.gallery?.[0]
      if (!imgUrl) {
        failed++
        return
      }
      try {
        const buf = await fetchImageBuffer(imgUrl, { baseUrl })
        const { embedding } = await computeImageEmbedding(buf)
        await Product.updateOne(
          { _id: p._id },
          {
            $set: {
              imageEmbedding: embedding,
              embeddingUpdatedAt: new Date(),
              imageEmbeddingStatus: 'ready',
              imageEmbeddingAttempts: 0,
              imageEmbeddingVersion: CURRENT_IMAGE_EMBEDDING_VERSION
            },
            $unset: { imageEmbeddingError: '' }
          }
        )
        processed++
      } catch (err: any) {
        const errorMessage = err?.message?.slice(0, 180) || 'unknown'
        await Product.updateOne(
          { _id: p._id },
          {
            $set: {
              imageEmbeddingStatus: 'failed',
              imageEmbeddingError: errorMessage,
              imageEmbeddingVersion: CURRENT_IMAGE_EMBEDDING_VERSION
            },
            $inc: { imageEmbeddingAttempts: 1 }
          }
        ).catch(() => null)
        failed++
        errors.push({
          id: String(p._id),
          name: p.name || '?',
          error: errorMessage.slice(0, 120)
        })
      }
    })
  )

  const indexed = await Product.countDocuments(buildIndexedProductQuery())
  const total = await Product.countDocuments(buildIndexableProductQuery())

  return NextResponse.json({
    success: true,
    requested: products.length,
    processed,
    failed,
    errors: errors.slice(0, 20), // limit payload
    coverage: {
      totalIndexable: total,
      indexed,
      missing: total - indexed,
      percent: total > 0 ? +((indexed / total) * 100).toFixed(1) : 0
    }
  })
}

function buildIndexableProductQuery() {
  return {
    isPublished: true,
    $or: [
      { image: { $exists: true, $ne: null } },
      { 'gallery.0': { $exists: true } }
    ]
  }
}

function buildIndexedProductQuery() {
  return {
    ...buildIndexableProductQuery(),
    imageEmbedding: { $exists: true, $ne: null },
    imageEmbeddingStatus: { $ne: 'failed' },
    imageEmbeddingVersion: CURRENT_IMAGE_EMBEDDING_VERSION
  }
}
