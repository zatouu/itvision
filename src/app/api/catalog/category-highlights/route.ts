import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import ProductCategory from '@/lib/models/ProductCategory'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { countProductsByCategory } from '@/lib/catalog/category-match'
import { getRedisClient } from '@/lib/redis'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

/** URLs externes acceptées telles quelles ; un upload local doit exister sur le disque. */
function localUploadExists(url: string): boolean {
  const match = /(?:^|\/)(?:api\/)?uploads\/(.+?)(?:[?#].*)?$/.exec(url)
  if (!match || /^https?:\/\/(?!(?:www\.)?(?:ddm\.sn|itvisionplus\.sn|market\.itvisionplus\.sn))/i.test(url)) return true
  const file = path.normalize(path.join(UPLOADS_DIR, decodeURIComponent(match[1])))
  return file.startsWith(UPLOADS_DIR) && fs.existsSync(file)
}

const CACHE_KEY = 'catalog:category-highlights:v3'
const CACHE_TTL = 300 // 5 min
const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' }

/**
 * Highlights par catégorie taxonomie : comptage réel + image représentative.
 * Endpoint léger (~2 KB) pour l'accueil — évite de télécharger tout le catalogue.
 * Une famille compte ses produits et ceux de ses sous-catégories.
 */
export async function GET() {
  try {
    const redis = getRedisClient()
    if (redis && redis.status === 'ready') {
      const cached = await redis.get(CACHE_KEY)
      if (cached) return NextResponse.json(JSON.parse(cached), { headers: CACHE_HEADERS })
    }

    await connectMongoose()

    let categories = await ProductCategory.find({ isActive: true }).sort({ order: 1, name: 1 }).lean()
    if (categories.length === 0) {
      categories = defaultProductCategories.map((c: any) => ({
        slug: c.id, name: c.name, icon: c.icon, labelFr: c.name,
        subCategories: (c.subCategories || []).map((s: any) => ({ slug: s.id })),
      })) as any
    }

    const products = await Product.find({ isPublished: { $ne: false } })
      .select({ name: 1, category: 1, image: 1, gallery: { $slice: 3 } })
      .lean()

    const slugs = categories.map((c: any) => String(c.slug || c._id || c.name || '').toLowerCase())
    const subSlugs: Record<string, string[]> = {}
    categories.forEach((c: any, i: number) => {
      subSlugs[slugs[i]] = (c.subCategories || []).map((s: any) => String(s?.slug || s?.id || '').toLowerCase())
    })
    const stats = countProductsByCategory(products as any, slugs, subSlugs)

    // Une image ne doit illustrer qu'une seule catégorie : on pioche dans le
    // pool de chaque slug la première image pas encore utilisée ailleurs.
    const usedImages = new Set<string>()
    const items = categories.map((c: any) => {
      const slug = String(c.slug || c._id || c.name || '').toLowerCase()
      const stat = stats.get(slug)
      // Fichier local supprimé (produit nettoyé, upload perdu) : on passe à l'image suivante
      const pool = (stat?.images ?? []).filter(localUploadExists)
      const image = pool.find((u) => !usedImages.has(u)) ?? pool[0] ?? null
      if (image) usedImages.add(image)
      return {
        slug,
        name: c.name,
        labelFr: c.labelFr || c.name,
        icon: c.icon,
        count: stat?.count ?? 0,
        image,
      }
    })

    const response = { success: true, items }
    if (redis && redis.status === 'ready') {
      await redis.set(CACHE_KEY, JSON.stringify(response), 'EX', CACHE_TTL)
    }
    return NextResponse.json(response, { headers: CACHE_HEADERS })
  } catch (error) {
    console.error('GET /api/catalog/category-highlights error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
