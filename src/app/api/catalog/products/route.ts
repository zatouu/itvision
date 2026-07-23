import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { computeProductPricing } from '@/lib/logistics'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import { expandCategorySlugs } from '@/lib/taxonomy/expand-categories'
import { tokenizeQuery, expandToken, expandQuery } from '@/lib/search/synonyms'
import { buildFacetStages, formatFacets } from '@/lib/search/facets'
import { getRedisClient } from '@/lib/redis'
import mongoose from 'mongoose'

const DEFAULT_EXCHANGE_RATE = 100

const asBool = (value: string | null) => {
  if (!value) return false
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes'
}

const asNumber = (value: string | null) => {
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const CATALOG_CACHE_TTL = 60 // secondes

function sortedCatalogCacheKey(searchParams: URLSearchParams): string {
  const sorted = new URLSearchParams()
  for (const key of Array.from(searchParams.keys()).sort()) {
    for (const value of searchParams.getAll(key).sort()) {
      sorted.append(key, value)
    }
  }
  return `catalog:v1:${sorted.toString()}`
}

async function getCatalogCache(key: string): Promise<any | null> {
  const redis = getRedisClient()
  if (!redis || redis.status !== 'ready') return null
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

async function setCatalogCache(key: string, payload: any): Promise<void> {
  const redis = getRedisClient()
  if (!redis || redis.status !== 'ready') return
  try {
    await redis.set(key, JSON.stringify(payload), 'EX', CATALOG_CACHE_TTL)
  } catch {
    // ignore
  }
}

const computeVolumeM3 = (product: any): number | null => {
  const direct = typeof product.volumeM3 === 'number' && product.volumeM3 > 0 ? product.volumeM3 : null
  if (direct !== null) return direct
  const lengthCm = typeof product.lengthCm === 'number' ? product.lengthCm : null
  const widthCm = typeof product.widthCm === 'number' ? product.widthCm : null
  const heightCm = typeof product.heightCm === 'number' ? product.heightCm : null
  if (!lengthCm || !widthCm || !heightCm) return null
  const volume = (lengthCm * widthCm * heightCm) / 1_000_000
  return Number.isFinite(volume) ? Number(volume.toFixed(4)) : null
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const cacheKey = sortedCatalogCacheKey(searchParams)
    const cached = await getCatalogCache(cacheKey)
    if (cached) return NextResponse.json(cached)

    const ids = (searchParams.get('ids') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 50)
    const productIds = ids.map((id) => new mongoose.Types.ObjectId(id))
    const isIdLookup = productIds.length > 0
    const page = isIdLookup ? 1 : parseInt(searchParams.get('page') || '1', 10)
    const limit = isIdLookup ? productIds.length : parseInt(searchParams.get('limit') || '24', 10)
    const skip = isIdLookup ? 0 : (page - 1) * limit

    // Filtres
    const q = (searchParams.get('q') || '').trim()
    const categoryRaw = (searchParams.get('category') || '').trim()
    const categories = categoryRaw
      ? categoryRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const shopId = (searchParams.get('shopId') || '').trim()
    const sellerSlug = (searchParams.get('sellerSlug') || '').trim()

    const segment = (searchParams.get('segment') || 'all') as 'all' | 'import' | 'in_stock' | 'group_buy'
    const availability = (searchParams.get('availability') || 'all') as 'all' | 'in_stock' | 'preorder' | 'out_of_stock'

    const onlyGroupBuy = asBool(searchParams.get('onlyGroupBuy'))
    const onlyPrice = asBool(searchParams.get('onlyPrice'))
    const onlyQuote = asBool(searchParams.get('onlyQuote'))

    const minPrice = asNumber(searchParams.get('minPrice'))
    const maxPrice = asNumber(searchParams.get('maxPrice'))
    const minDeliveryDays = asNumber(searchParams.get('minDeliveryDays'))
    const maxDeliveryDays = asNumber(searchParams.get('maxDeliveryDays'))

    const includeGroupStats = asBool(searchParams.get('includeGroupStats'))
    const includeFacets = asBool(searchParams.get('includeFacets')) || asBool(searchParams.get('facets'))

    // Backwards-compatible alias: sort=popular -> sortBy=rating-desc
    const sortLegacy = (searchParams.get('sort') || '').trim().toLowerCase()
    const sortBy = ((searchParams.get('sortBy') || '') || (sortLegacy === 'popular' ? 'rating-desc' : 'default')) as
      | 'default'
      | 'price-asc'
      | 'price-desc'
      | 'name-asc'
      | 'name-desc'
      | 'rating-desc'
      | 'groupbuy-discount-desc'

    // Base match (public catalogue)
    const match: any = {
      isPublished: { $ne: false }
    }

    if (isIdLookup) {
      match._id = { $in: productIds }
    }

    if (categories.length > 0) {
      const expandedCategories = await expandCategorySlugs(categories)
      match.category = { $in: expandedCategories }
    }

    if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
      match.shopId = new mongoose.Types.ObjectId(shopId)
    }

    if (sellerSlug) {
      match.sellerSlug = sellerSlug
    }

    if (availability !== 'all') {
      match.stockStatus = availability
    }

    if (segment === 'in_stock') {
      match.stockStatus = 'in_stock'
    } else if (segment === 'group_buy') {
      match.groupBuyEnabled = true
    } else if (segment === 'import') {
      match.$or = [
        { price1688: { $gt: 0 } },
        { 'sourcing.platform': { $in: ['1688', 'alibaba', 'taobao', 'xianyu', 'idlefish'] } }
      ]
    }

    if (onlyGroupBuy) {
      match.groupBuyEnabled = true
    }

    if (onlyQuote) {
      match.requiresQuote = true
    }

    // Server-side search: $text index quand possible, regex fallback pour tokens courts
    let useTextSearch = false
    let regexSearchMatch: any = null
    if (!isIdLookup && q) {
      const tokens = tokenizeQuery(q).filter(Boolean)
      const allLong = tokens.length > 0 && tokens.every((t: string) => t.length >= 3)
      if (allLong) {
        const terms = [...new Set(tokens.flatMap((t: string) => expandToken(t)).filter((t: string) => t.length >= 2))].slice(0, 30)
        match.$text = { $search: terms.join(' ') }
        useTextSearch = true
      } else if (tokens.length > 0) {
        const terms = [...new Set(expandQuery(q).filter((t: string) => t.length >= 1))].slice(0, 20)
        const clauses = terms.flatMap((term: string) => [
          { name: { $regex: escapeRegex(term), $options: 'i' } },
          { tagline: { $regex: escapeRegex(term), $options: 'i' } },
          { tags: { $regex: escapeRegex(term), $options: 'i' } },
        ])
        regexSearchMatch = clauses.length === 1 ? clauses[0] : { $or: clauses }
      }
    }

    // Derived fields used for filtering/sorting
    // shownPrice ~= ce que le catalogue affiche (baseCost si dispo, sinon prix calculé)
    const addDerivedFields: any = {
      __exchangeRate: { $ifNull: ['$exchangeRate', DEFAULT_EXCHANGE_RATE] },
      __marginRate: { $ifNull: ['$marginRate', 0] },
      __costFrom1688: {
        $cond: [
          { $gt: ['$price1688', 0] },
          { $multiply: ['$price1688', { $ifNull: ['$exchangeRate', DEFAULT_EXCHANGE_RATE] }] },
          null
        ]
      }
    }

    addDerivedFields.__productCostFCFA = {
      $ifNull: ['$baseCost', addDerivedFields.__costFrom1688]
    }

    // NOTE: Mongo ne permet pas de référencer directement une clé calculée dans la même étape
    // de manière portable; on calcule __salePriceCalc à partir des inputs.
    addDerivedFields.__salePriceCalc = {
       $cond: [
         { $gt: [addDerivedFields.__productCostFCFA, 0] },
         {
           $multiply: [
             addDerivedFields.__productCostFCFA,
             { $add: [1, { $divide: [addDerivedFields.__marginRate, 100] }] }
           ]
         },
         { $ifNull: ['$price', null] }
       ]
     }

     addDerivedFields.__shownPrice = {
       $ifNull: ['$baseCost', addDerivedFields.__salePriceCalc]
     }

     addDerivedFields.__deliveryDaysEst = {
       $cond: [
         { $eq: ['$stockStatus', 'in_stock'] },
         0,
         { $ifNull: ['$leadTimeDays', 15] }
       ]
     }

     addDerivedFields.__bestTierPrice = {
       $cond: [
         { $and: [{ $isArray: '$priceTiers' }, { $gt: [{ $size: '$priceTiers' }, 0] }] },
         { $min: '$priceTiers.price' },
         null
       ]
     }

     addDerivedFields.__groupBuyDiscountCalc = {
       $cond: [
         {
           $and: [
             { $eq: ['$groupBuyEnabled', true] },
             { $gt: [addDerivedFields.__shownPrice, 0] },
             { $gt: [addDerivedFields.__bestTierPrice, 0] }
           ]
         },
         {
           $round: [
             {
               $multiply: [
                 {
                   $divide: [
                     { $subtract: [addDerivedFields.__shownPrice, addDerivedFields.__bestTierPrice] },
                     addDerivedFields.__shownPrice
                   ]
                 },
                 100
               ]
             },
             0
           ]
         },
         null
       ]
     }

     if (useTextSearch) {
       addDerivedFields.__textScore = { $meta: 'textScore' }
     }

     const pipeline: any[] = [{ $match: match }, { $addFields: addDerivedFields }]

    if (isIdLookup) {
      pipeline.push({ $addFields: { __imageSearchRank: { $indexOfArray: [productIds, '$_id'] } } })
    }

     if (regexSearchMatch) {
       pipeline.push({ $match: regexSearchMatch })
     }

     // onlyPrice: produits avec prix affichable (hors devis)
     if (onlyPrice) {
       pipeline.push({
         $match: {
           requiresQuote: { $ne: true },
           __shownPrice: { $ne: null }
         }
       })
     }

     if (typeof minPrice === 'number' || typeof maxPrice === 'number') {
       const range: any = {}
       if (typeof minPrice === 'number') range.$gte = minPrice
       if (typeof maxPrice === 'number') range.$lte = maxPrice
       pipeline.push({ $match: { __shownPrice: range } })
     }

     if (typeof minDeliveryDays === 'number' || typeof maxDeliveryDays === 'number') {
       const range: any = {}
       if (typeof minDeliveryDays === 'number') range.$gte = minDeliveryDays
       if (typeof maxDeliveryDays === 'number') range.$lte = maxDeliveryDays
       pipeline.push({ $match: { __deliveryDaysEst: range } })
     }

     // Tri
     const sort: any = (() => {
       if (useTextSearch && (sortBy === 'default' || sortBy === 'rating-desc')) {
         return { __textScore: -1, isFeatured: -1, createdAt: -1 }
       }
       switch (sortBy) {
         case 'price-asc':
           return { __shownPrice: 1, isFeatured: -1, createdAt: -1 }
         case 'price-desc':
           return { __shownPrice: -1, isFeatured: -1, createdAt: -1 }
         case 'name-asc':
           return { name: 1, createdAt: -1 }
         case 'name-desc':
           return { name: -1, createdAt: -1 }
         case 'rating-desc':
           // Pas de champ rating persisté: approximation via isFeatured
           return { isFeatured: -1, updatedAt: -1 }
         case 'groupbuy-discount-desc':
           return { groupBuyEnabled: -1, __groupBuyDiscountCalc: -1, __bestTierPrice: 1, name: 1 }
         case 'default':
         default:
           return { isFeatured: -1, createdAt: -1 }
       }
     })()

     pipeline.push({ $sort: isIdLookup ? { __imageSearchRank: 1 } : sort })

     const facetDefinition: any = {
       data: [{ $skip: skip }, { $limit: limit }],
       totalCount: [{ $count: 'count' }]
     }
     if (includeFacets) {
       facetDefinition.facets = [{ $facet: buildFacetStages() }]
     }

     pipeline.push({ $facet: facetDefinition })

     const agg = await Product.aggregate(pipeline)
     const data = agg?.[0]?.data ?? []
     const total = agg?.[0]?.totalCount?.[0]?.count ?? 0
     const rawFacets = includeFacets ? agg?.[0]?.facets?.[0] : undefined
     const facets = rawFacets ? formatFacets(rawFacets) : undefined

     const shippingRates = getConfiguredShippingRates()

     const payload = data.map((product: any) => {
       const pricing = computeProductPricing(product, shippingRates)

       // Calcul du meilleur prix et discount pour l'achat groupé
       let groupBuyBestPrice: number | undefined
       let groupBuyDiscount: number | undefined

       if (product.groupBuyEnabled && Array.isArray(product.priceTiers) && product.priceTiers.length > 0) {
         // Aligner le discount sur le prix affiché au catalogue (baseCost si dispo, sinon prix calculé)
         const basePrice = product.baseCost ?? pricing.salePrice ?? product.price ?? 0
         const bestTierPrice = Math.min(...product.priceTiers.map((t: any) => t.price || Infinity))
         if (bestTierPrice && bestTierPrice < Infinity && basePrice > 0) {
           groupBuyBestPrice = bestTierPrice
           groupBuyDiscount = Math.round(((basePrice - bestTierPrice) / basePrice) * 100)
         }
       }

       const volumeM3 = computeVolumeM3(product)
       const weightKg =
         typeof product.weightKg === 'number' ? product.weightKg :
         (typeof product.grossWeightKg === 'number' ? product.grossWeightKg :
         (typeof product.netWeightKg === 'number' ? product.netWeightKg : null))

       return {
         id: String(product._id),
         _id: String(product._id),
         name: product.name,
         tagline: product.tagline ?? null,
         description: product.description ?? null,
         category: product.category ?? null,
         condition: product.condition ?? 'new',
         image: product.image ?? '/placeholder.svg',
         gallery: Array.isArray(product.gallery) && product.gallery.length > 0
           ? product.gallery
           : [product.image ?? '/placeholder.svg'],
         features: Array.isArray(product.features) ? product.features : [],
         requiresQuote: product.requiresQuote ?? false,
         availability: {
           status: product.stockStatus ?? 'preorder',
           label: pricing.availabilityLabel,
           note: pricing.availabilitySubLabel ?? null,
           stockQuantity: product.stockQuantity ?? 0,
           leadTimeDays: product.leadTimeDays ?? null
         },
         logistics: {
           weightKg,
           volumeM3,
           dimensions: product.lengthCm && product.widthCm && product.heightCm
             ? {
                 lengthCm: product.lengthCm,
                 widthCm: product.widthCm,
                 heightCm: product.heightCm
               }
             : null
         },
         pricing,
         b2bPrice: product.b2bPrice ?? null,
         // Backwards compat for older consumers
         price: pricing.salePrice ?? product.price ?? product.baseCost ?? null,
         weightKg,
         volumeM3,
         // Note: Les informations de sourcing et prix source ne sont pas exposées au public
         // Seul indicateur: si le produit est importé (pour affichage badge "Import")
         isImported: !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao', 'xianyu', 'idlefish'].includes(product.sourcing.platform))),
         // Configuration achat groupé
         groupBuyEnabled: product.groupBuyEnabled ?? false,
         groupBuyBestPrice,
         groupBuyDiscount,
         priceTiers: product.priceTiers ?? [],
         groupBuyMinQty: product.groupBuyMinQty,
         groupBuyTargetQty: product.groupBuyTargetQty,
         sellerName: product.sellerName ?? null,
         sellerSlug: product.sellerSlug ?? null,
         sellerVerified: product.sellerVerified ?? false,
         sellerRating: product.sellerRating ?? null,
         createdAt: product.createdAt,
         updatedAt: product.updatedAt,
         isFeatured: product.isFeatured ?? false
       }
     })

    if (includeGroupStats && payload.length > 0) {
      const now = new Date()
      const productObjectIds = payload
        .map((p: any) => {
          try {
            return new mongoose.Types.ObjectId(p.id)
          } catch {
            return null
          }
        })
        .filter((id: any) => id !== null)

      if (productObjectIds.length === 0) {
        // nothing to enrich
      }

      const groups = await GroupOrder.find({
        'product.productId': { $in: productObjectIds },
        status: { $in: ['open', 'filled'] },
        deadline: { $gte: now }
      })
        .select('groupId currentQty targetQty currentUnitPrice participants deadline product.productId status')
        .lean()

      const byProductId = new Map<string, any[]>()
      for (const g of groups) {
        const pid = String((g as any).product?.productId)
        if (!byProductId.has(pid)) byProductId.set(pid, [])
        byProductId.get(pid)!.push(g)
      }

      const chooseBestGroup = (gs: any[]) => {
        const scored = gs
          .map((g) => {
            const currentQty = typeof g.currentQty === 'number' ? g.currentQty : 0
            const targetQty = typeof g.targetQty === 'number' && g.targetQty > 0 ? g.targetQty : 0
            const progress = targetQty > 0 ? currentQty / targetQty : 0
            const deadline = g.deadline ? new Date(g.deadline) : null
            const msLeft = deadline ? deadline.getTime() - now.getTime() : Number.POSITIVE_INFINITY
            const statusPriority = g.status === 'open' ? 2 : g.status === 'filled' ? 1 : 0
            return { g, progress, msLeft, statusPriority }
          })
          .sort((a, b) => {
            if (b.statusPriority !== a.statusPriority) return b.statusPriority - a.statusPriority
            if (b.progress !== a.progress) return b.progress - a.progress
            return a.msLeft - b.msLeft
          })
        return scored[0]?.g ?? null
      }

      for (const p of payload as any[]) {
        const gs = byProductId.get(p.id) ?? []
        const best = gs.length > 0 ? chooseBestGroup(gs) : null
        const bestSummary = best
          ? {
              groupId: best.groupId,
              status: best.status,
              currentQty: best.currentQty,
              targetQty: best.targetQty,
              currentPrice: best.currentUnitPrice,
              participantCount: Array.isArray(best.participants) ? best.participants.length : 0,
              deadline: best.deadline
            }
          : null

        p.groupStats = {
          activeGroupCount: gs.length,
          bestActiveGroup: bestSummary
        }
      }
    }

    const response: any = { 
      success: true, 
      products: payload,
      // Backwards compat: some pages expect `items`
      items: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: !isIdLookup && skip + limit < total
      }
    }
    if (includeFacets) response.facets = facets
    await setCatalogCache(cacheKey, response)
    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load catalog' }, { status: 500 })
  }
}

