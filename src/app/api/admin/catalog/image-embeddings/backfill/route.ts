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
  const total = await Product.countDocuments({ isPublished: true, image: { $exists: true, $ne: null } })
  const indexed = await Product.countDocuments({
    isPublished: true,
    imageEmbedding: { $exists: true, $ne: null }
  })

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
    isPublished: true,
    image: { $exists: true, $ne: null }
  }
  if (!force) {
    query.imageEmbedding = { $in: [null, undefined] }
  }

  const products = await Product.find(query)
    .select('_id image gallery name')
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
          { $set: { imageEmbedding: embedding, embeddingUpdatedAt: new Date() } }
        )
        processed++
      } catch (err: any) {
        failed++
        errors.push({
          id: String(p._id),
          name: p.name || '?',
          error: err?.message?.slice(0, 120) || 'unknown'
        })
      }
    })
  )

  const indexed = await Product.countDocuments({
    isPublished: true,
    imageEmbedding: { $exists: true, $ne: null }
  })
  const total = await Product.countDocuments({
    isPublished: true,
    image: { $exists: true, $ne: null }
  })

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
