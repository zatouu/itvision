/**
 * Vérifications déterministes de la modération produit — du code, pas du LLM.
 * Une violation dure court-circuite l'analyse LLM (rejet proposé, 0 coût).
 */

import Product from '@/lib/models/Product'

const FORBIDDEN = /\b(contrefa[çc]on|contrefait|r[ée]pli(que|ca)|fake|clone\b|drogue|cannabis|cbd|arme[s]?\b|munition|viagra|cialis|st[ée]ro[ïi]de|passeport|faux billets?)\b/i

export interface ProductChecks {
  hasImage: boolean
  priceAboveMin: boolean
  forbiddenWord: string | null
  duplicateName: boolean
  priceVsMedian: number | null
  hardViolation: string | null
}

export async function runDeterministicChecks(product: {
  _id: unknown
  name: string
  price?: number
  category?: string
  image?: string
  gallery?: string[]
  sellerSlug?: string
}): Promise<ProductChecks> {
  const gallery = product.gallery || []
  const hasImage = !!(product.image || gallery.length > 0)
  const priceAboveMin = (product.price ?? 0) >= 100

  const haystack = `${product.name} ${product.category || ''}`
  const forbiddenMatch = haystack.match(FORBIDDEN)

  // Nom quasi-identique chez le même vendeur (autre produit)
  const normalized = product.name.trim().toLowerCase().replace(/\s+/g, ' ')
  const dup = product.sellerSlug
    ? await Product.findOne({
        sellerSlug: product.sellerSlug,
        _id: { $ne: product._id },
        name: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      }).select('_id').lean()
    : null

  // Prix vs médiane de la catégorie (produits publiés) — flag si <10% ou >20×
  let priceVsMedian: number | null = null
  if (product.category) {
    const medianAgg = await Product.aggregate([
      { $match: { category: product.category, isPublished: true, price: { $gt: 0 } } },
      { $sort: { price: 1 } },
      { $group: { _id: null, prices: { $push: '$price' }, count: { $sum: 1 } } },
    ])
    const prices = medianAgg[0]?.prices as number[] | undefined
    if (prices && prices.length >= 3) {
      const median = prices[Math.floor(prices.length / 2)]
      if (median > 0 && product.price) priceVsMedian = product.price / median
    }
  }

  let hardViolation: string | null = null
  if (!hasImage) hardViolation = 'Aucune photo produit'
  else if (!priceAboveMin) hardViolation = 'Prix inférieur au minimum (100 F)'
  else if (forbiddenMatch) hardViolation = `Contenu interdit détecté : « ${forbiddenMatch[0]} »`
  else if (dup) hardViolation = 'Doublon : un produit porte déjà ce nom dans cette boutique'

  return { hasImage, priceAboveMin, forbiddenWord: forbiddenMatch?.[0] ?? null, duplicateName: !!dup, priceVsMedian, hardViolation }
}
