/**
 * Recherche de produits par image — version "vraie" perceptual hashing.
 *
 * Stratégie :
 *  1. L'image uploadée est validée (sharp), redimensionnée et hashée en dHash 64 bits
 *     + histogramme couleur 8 bins (voir lib/image-hash).
 *  2. On compare ce vecteur aux embeddings déjà stockés dans `Product.imageEmbedding`.
 *  3. Si la couverture des embeddings est faible, on lance un backfill asynchrone
 *     (non bloquant) sur quelques produits sans embedding.
 *  4. On retourne les meilleurs candidats triés par score combiné (forme + couleur)
 *     + un fallback texte (catégorie/tags) si trop peu de résultats.
 *
 * Sécurité :
 *  - Rate-limit dédié (8 / minute / IP).
 *  - Max 5 Mo, types image/* uniquement.
 *  - Pas d'auth requise (recherche publique).
 *
 * Pour les anciens produits, voir POST /api/admin/catalog/search-by-image/backfill
 * qui calcule les embeddings en batch (cron ou manuel).
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import {
  computeImageEmbedding,
  similarityScore,
  fetchImageBuffer,
  EMBEDDING_LENGTH,
  isValidEmbedding,
  type ImageEmbedding
} from '@/lib/image-hash'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

const imageSearchLimiter = new RateLimiter(60 * 1000, 8) // 8 / min / IP

const MAX_BYTES = 5 * 1024 * 1024
const MIN_SCORE = 25 // sous ce score on n'affiche rien

// Combien de produits sans embedding on calcule à la volée
// (limité pour ne pas pénaliser la latence ; le reste passe par le backfill batch)
const ON_DEMAND_BACKFILL = 8

interface ScoredResult {
  id: string
  name: string
  image: string | null
  category: string | null
  priceAmount: number | null
  currency: string
  similarity: number
}

export async function POST(request: NextRequest) {
  // 1. Rate limit
  const limited = applyRateLimit(request, imageSearchLimiter)
  if (limited) return limited

  // 2. Parse + validation image
  let imageFile: File | null = null
  let searchText: string | null = null
  try {
    const formData = await request.formData()
    const file = formData.get('image')
    if (file instanceof File) imageFile = file
    const txt = formData.get('searchText')
    if (typeof txt === 'string') searchText = txt.trim().slice(0, 200) || null
  } catch {
    return NextResponse.json({ success: false, error: 'Requête invalide' }, { status: 400 })
  }
  if (!imageFile) {
    return NextResponse.json({ success: false, error: 'Aucune image fournie' }, { status: 400 })
  }
  if (!imageFile.type.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Le fichier doit être une image' }, { status: 400 })
  }
  if (imageFile.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: "L'image ne doit pas dépasser 5 Mo" },
      { status: 400 }
    )
  }

  // 3. Embedding de la requête
  let queryEmbedding: ImageEmbedding
  try {
    const buf = Buffer.from(await imageFile.arrayBuffer())
    const result = await computeImageEmbedding(buf)
    queryEmbedding = result.embedding
  } catch (err) {
    console.error('[search-by-image] hash erreur:', err)
    return NextResponse.json(
      { success: false, error: 'Image illisible ou format non supporté' },
      { status: 400 }
    )
  }

  // 4. DB — récupérer uniquement ce dont on a besoin
  await connectMongoose()

  // Produits avec embedding déjà calculé : comparaison directe
  const projection = {
    name: 1,
    category: 1,
    image: 1,
    gallery: 1,
    price: 1,
    baseCost: 1,
    currency: 1,
    isFeatured: 1,
    stockStatus: 1,
    tags: 1,
    description: 1,
    imageEmbedding: 1
  }

  const withEmbedding = await Product.find({
    isPublished: true,
    imageEmbedding: { $exists: true, $ne: null }
  })
    .select(projection)
    .lean()

  const scored: ScoredResult[] = []
  for (const p of withEmbedding as any[]) {
    if (!isValidEmbedding(p.imageEmbedding)) continue
    const sim = similarityScore(queryEmbedding, p.imageEmbedding as ImageEmbedding)
    if (sim >= MIN_SCORE) {
      scored.push(toResult(p, sim))
    }
  }

  // 5. Backfill on-demand : quelques produits sans embedding (synchrone limité)
  //    Permet aux premières recherches d'enrichir progressivement le corpus.
  const missing = await Product.find({
    isPublished: true,
    imageEmbedding: { $in: [null, undefined] },
    image: { $exists: true, $ne: null }
  })
    .select(projection)
    .limit(ON_DEMAND_BACKFILL)
    .lean()

  if (missing.length > 0) {
    await Promise.allSettled(
      (missing as any[]).map(async (p) => {
        const imgUrl = p.image || p.gallery?.[0]
        if (!imgUrl) return
        try {
          const buf = await fetchImageBuffer(imgUrl, { baseUrl: buildBaseUrl(request) })
          const { embedding } = await computeImageEmbedding(buf)
          // persiste (ne fait pas échouer la requête si KO)
          await Product.updateOne(
            { _id: p._id },
            { $set: { imageEmbedding: embedding, embeddingUpdatedAt: new Date() } }
          ).catch(() => null)
          const sim = similarityScore(queryEmbedding, embedding)
          if (sim >= MIN_SCORE) scored.push(toResult(p, sim))
        } catch (err) {
          // Échec individuel acceptable, on continue
          console.warn('[search-by-image] backfill KO pour', String(p._id), err instanceof Error ? err.message : err)
        }
      })
    )
  }

  // 6. Fallback texte : si on a < 4 résultats, on enrichit via tags/catégorie/nom
  if (scored.length < 4 && searchText) {
    const re = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const textHits = await Product.find({
      isPublished: true,
      $or: [{ name: re }, { tags: re }, { category: re }, { description: re }],
      _id: { $nin: scored.map((r) => r.id) }
    })
      .select(projection)
      .limit(8)
      .lean()
    for (const p of textHits as any[]) {
      scored.push(toResult(p, 30)) // score "ok" pour les hits texte
    }
  }

  // 7. Tri + top 12 + dédup
  const dedup = new Map<string, ScoredResult>()
  for (const r of scored.sort((a, b) => b.similarity - a.similarity)) {
    if (!dedup.has(r.id)) dedup.set(r.id, r)
  }
  const results = Array.from(dedup.values()).slice(0, 12)

  // 8. Stats de couverture (utile pour debug / UX)
  const totalIndexed = withEmbedding.length
  const totalProducts = await Product.countDocuments({ isPublished: true })

  return NextResponse.json({
    success: true,
    results,
    meta: {
      totalAnalyzed: totalIndexed + missing.length,
      totalProducts,
      embeddingsCoverage: totalProducts > 0 ? +(((totalIndexed + missing.length) / totalProducts) * 100).toFixed(1) : 0,
      backfilledThisRequest: missing.length,
      threshold: MIN_SCORE
    }
  })
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toResult(p: any, similarity: number): ScoredResult {
  return {
    id: String(p._id),
    name: p.name,
    image: p.image || p.gallery?.[0] || null,
    category: p.category || null,
    priceAmount: p.price ?? p.baseCost ?? null,
    currency: p.currency || 'FCFA',
    similarity
  }
}

function buildBaseUrl(request: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = (request.headers.get('host') || '').replace(/^market\./i, '')
  return `${proto}://${host}`
}

// ── GET : description (utile pour debug / API doc) ─────────────────────────

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/catalog/search-by-image',
    method: 'POST',
    description: 'Recherche visuelle par perceptual hash (dHash + histogramme couleur)',
    accepts: 'multipart/form-data',
    fields: {
      image: 'File (required) — JPG/PNG/WebP/GIF, max 5 Mo',
      searchText: 'String (optional) — fallback textuel si peu de résultats'
    },
    rateLimit: '8 / min / IP',
    embeddingLength: EMBEDDING_LENGTH
  })
}
