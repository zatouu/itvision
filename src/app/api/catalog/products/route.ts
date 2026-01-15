import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { computeProductPricing } from '@/lib/logistics'
import { GroupOrder } from '@/lib/models/GroupOrder'
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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '24', 10)
    const skip = (page - 1) * limit

    // Filtres
    const q = (searchParams.get('q') || '').trim()
    const categoryRaw = (searchParams.get('category') || '').trim()
    const categories = categoryRaw
      ? categoryRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []

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

    if (categories.length > 0) {
      match.category = { $in: categories }
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
        { 'sourcing.platform': { $in: ['1688', 'alibaba', 'taobao'] } }
      ]
    }

    if (onlyGroupBuy) {
      match.groupBuyEnabled = true
    }

    if (onlyQuote) {
      match.requiresQuote = true
    }

    // Server-side search
    const searchMatch = q
      ? {
          $or: [
            { name: { $regex: escapeRegex(q), $options: 'i' } },
            { description: { $regex: escapeRegex(q), $options: 'i' } },
            { tagline: { $regex: escapeRegex(q), $options: 'i' } }
          ]
        }
      : null

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

     const pipeline: any[] = [{ $match: match }, { $addFields: addDerivedFields }]

     if (searchMatch) {
       pipeline.push({ $match: searchMatch })
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

     pipeline.push({ $sort: sort })

     pipeline.push({
       $facet: {
         data: [{ $skip: skip }, { $limit: limit }],
         totalCount: [{ $count: 'count' }]
       }
     })

     const agg = await Product.aggregate(pipeline)
     const data = agg?.[0]?.data ?? []
     const total = agg?.[0]?.totalCount?.[0]?.count ?? 0

    const payload = data.map((product: any) => {
      const pricing = computeProductPricing(product)
      
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
        image: product.image ?? '/file.svg',
        gallery: Array.isArray(product.gallery) && product.gallery.length > 0
          ? product.gallery
          : [product.image ?? '/file.svg'],
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
        // Backwards compat for older consumers
        price: pricing.salePrice ?? product.price ?? product.baseCost ?? null,
        weightKg,
        volumeM3,
        // Note: Les informations de sourcing et prix source ne sont pas exposées au public
        // Seul indicateur: si le produit est importé (pour affichage badge "Import")
        isImported: !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao'].includes(product.sourcing.platform))),
        // Configuration achat groupé
        groupBuyEnabled: product.groupBuyEnabled ?? false,
        groupBuyBestPrice,
        groupBuyDiscount,
        priceTiers: product.priceTiers ?? [],
        groupBuyMinQty: product.groupBuyMinQty,
        groupBuyTargetQty: product.groupBuyTargetQty,
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

    return NextResponse.json({ 
      success: true, 
      products: payload,
      // Backwards compat: some pages expect `items`
      items: payload,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to load catalog' }, { status: 500 })
  }
}

