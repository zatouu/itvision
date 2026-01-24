import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product, { type IProduct } from '@/lib/models/Product.validated'
import type { ProductVariantGroup } from '@/lib/types/product.types'
import { randomUUID } from 'crypto'
import { requireAuth } from '@/lib/jwt'

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

const normalizeCondition = (value: any): 'new' | 'used' | 'refurbished' | undefined => {
  if (value === null || value === undefined) return undefined
  const v = String(value).trim().toLowerCase()
  if (!v) return undefined

  if (v === 'new' || v === 'neuf' || v === 'brandnew' || v === 'brand new') return 'new'
  if (
    v === 'used' ||
    v === 'occasion' ||
    v === 'occas' ||
    v === '2nd main' ||
    v === '2ndmain' ||
    v === 'second main' ||
    v === 'secondmain' ||
    v === 'secondhand' ||
    v === 'second hand' ||
    v === '2ndhand' ||
    v === '2nd hand' ||
    v === 'seconde main' ||
    v === 'seconde-main' ||
    v === 'seconde_main'
  ) {
    return 'used'
  }
  if (
    v === 'refurb' ||
    v === 'refurbished' ||
    v === 'reconditionne' ||
    v === 'reconditionné' ||
    v === 'reconditionné'
  ) {
    return 'refurbished'
  }

  return undefined
}

const parseNumber = (value: any): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

const parseStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/) // accept comma or newline separated
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return undefined
}

const buildProductPayload = (payload: any): Partial<IProduct> => {
  const {
    name,
    category,
    description,
    tagline,
    condition,
    price,
    baseCost,
    marginRate,
    currency,
    image,
    gallery,
    features,
    requiresQuote,
    deliveryDays,
    stockStatus,
    stockQuantity,
    leadTimeDays,
    netWeightKg,
    weightKg,
    grossWeightKg,
    lengthCm,
    widthCm,
    heightCm,
    volumeM3,
    packagingWeightKg,
    colorOptions,
    variantOptions,
    variantGroups,
    availabilityNote,
    isPublished,
    isFeatured,
    sourcing,
    shippingOverrides,
    // Champs 1688
    price1688,
    price1688Currency,
    exchangeRate,
    serviceFeeRate,
    insuranceRate,
    // Champs achat groupé
    groupBuyEnabled,
    groupBuyMinQty,
    groupBuyTargetQty,
    priceTiers
  } = payload || {}

  const normalized: Partial<IProduct> = {
    name,
    category,
    description,
    tagline,
    condition: normalizeCondition(condition),
    currency: (currency === 'FCFA' || currency === 'EUR' || currency === 'USD' || currency === 'CNY') 
      ? currency 
      : 'FCFA',
    availabilityNote,
    requiresQuote: typeof requiresQuote === 'boolean' ? requiresQuote : undefined,
    stockStatus: stockStatus === 'in_stock' ? 'in_stock' : stockStatus === 'preorder' ? 'preorder' : stockStatus === 'out_of_stock' ? 'out_of_stock' : undefined,
    isPublished: typeof isPublished === 'boolean' ? isPublished : undefined,
    isFeatured: typeof isFeatured === 'boolean' ? isFeatured : undefined,
  }

  normalized.price = parseNumber(price)
  normalized.baseCost = parseNumber(baseCost)
  normalized.marginRate = parseNumber(marginRate)
  normalized.deliveryDays = parseNumber(deliveryDays)
  normalized.stockQuantity = parseNumber(stockQuantity)
  normalized.leadTimeDays = parseNumber(leadTimeDays)
  normalized.netWeightKg = parseNumber(netWeightKg)
  normalized.weightKg = parseNumber(weightKg)
  normalized.grossWeightKg = parseNumber(grossWeightKg)
  normalized.lengthCm = parseNumber(lengthCm)
  normalized.widthCm = parseNumber(widthCm)
  normalized.heightCm = parseNumber(heightCm)
  normalized.volumeM3 = parseNumber(volumeM3)
  normalized.packagingWeightKg = parseNumber(packagingWeightKg)

  if (typeof image === 'string') normalized.image = image

  const parsedGallery = parseStringArray(gallery)
  if (parsedGallery) normalized.gallery = parsedGallery

  const parsedFeatures = parseStringArray(features)
  if (parsedFeatures) normalized.features = parsedFeatures

  const parsedColors = parseStringArray(colorOptions)
  if (parsedColors) normalized.colorOptions = parsedColors

  const parsedVariants = parseStringArray(variantOptions)
  if (parsedVariants) normalized.variantOptions = parsedVariants

  if (sourcing && typeof sourcing === 'object') {
    const normalizedSourcing: IProduct['sourcing'] = {
      platform: typeof sourcing.platform === 'string' ? sourcing.platform : undefined,
      supplierName: typeof sourcing.supplierName === 'string' ? sourcing.supplierName : undefined,
      supplierContact: typeof sourcing.supplierContact === 'string' ? sourcing.supplierContact : undefined,
      productUrl: typeof sourcing.productUrl === 'string' ? sourcing.productUrl : undefined,
      notes: typeof sourcing.notes === 'string' ? sourcing.notes : undefined
    }
    normalized.sourcing = normalizedSourcing
  }

  // Toujours traiter les shippingOverrides (même tableau vide pour réinitialiser)
  if (Array.isArray(shippingOverrides)) {
    const overrides: NonNullable<IProduct['shippingOverrides']> = []
    for (const raw of shippingOverrides) {
      if (!raw || typeof raw !== 'object' || typeof raw.methodId !== 'string') continue
      // Ne conserver que les overrides avec au moins une valeur définie
      const hasValue = parseNumber(raw.ratePerKg) !== undefined || 
                       parseNumber(raw.ratePerM3) !== undefined || 
                       parseNumber(raw.flatFee) !== undefined
      if (hasValue) {
        overrides.push({
          methodId: raw.methodId,
          ratePerKg: parseNumber(raw.ratePerKg),
          ratePerM3: parseNumber(raw.ratePerM3),
          flatFee: parseNumber(raw.flatFee)
        })
      }
    }
    // Toujours définir les overrides (tableau vide = réinitialisation aux valeurs par défaut)
    normalized.shippingOverrides = overrides
  }

  // Champs 1688
  normalized.price1688 = parseNumber(price1688)
  normalized.exchangeRate = parseNumber(exchangeRate)
  const parsedServiceFeeRate = parseNumber(serviceFeeRate)
  normalized.serviceFeeRate = (parsedServiceFeeRate === 5 || parsedServiceFeeRate === 10 || parsedServiceFeeRate === 15) 
    ? parsedServiceFeeRate 
    : undefined
  normalized.insuranceRate = parseNumber(insuranceRate)
  if (typeof price1688Currency === 'string') {
    const validCurrencies = ['FCFA', 'EUR', 'USD', 'CNY'] as const
    normalized.price1688Currency = validCurrencies.includes(price1688Currency as any) 
      ? (price1688Currency as 'FCFA' | 'EUR' | 'USD' | 'CNY')
      : undefined
  }

  // Variantes avec images et prix (style 1688)
  if (Array.isArray(variantGroups)) {
    const normalizedGroups: ProductVariantGroup[] = []
    for (const group of variantGroups) {
      if (!group || typeof group !== 'object' || typeof group.name !== 'string') continue
      if (!Array.isArray(group.variants)) continue
      const normalizedVariants: ProductVariantGroup['variants'] = []
      for (const v of group.variants) {
        if (!v || typeof v !== 'object' || typeof v.name !== 'string') continue
        const rawId = typeof v.id === 'string' ? v.id.trim() : ''
        normalizedVariants.push({
          id: rawId || randomUUID(),
          name: v.name,
          sku: typeof v.sku === 'string' ? v.sku : undefined,
          image: typeof v.image === 'string' ? v.image : undefined,
          price1688: parseNumber(v.price1688),
          priceFCFA: parseNumber(v.priceFCFA),
          stock: parseNumber(v.stock),
          isDefault: typeof v.isDefault === 'boolean' ? v.isDefault : undefined
        })
      }
      if (normalizedVariants.length > 0) {
        normalizedGroups.push({
          name: group.name,
          variants: normalizedVariants
        })
      }
    }
    normalized.variantGroups = normalizedGroups
  }

  // Champs achat groupé
  if (typeof groupBuyEnabled === 'boolean') {
    normalized.groupBuyEnabled = groupBuyEnabled
  }
  normalized.groupBuyMinQty = parseNumber(groupBuyMinQty)
  normalized.groupBuyTargetQty = parseNumber(groupBuyTargetQty)
  
  // Paliers de prix dégressifs
  if (Array.isArray(priceTiers)) {
    const normalizedTiers: NonNullable<IProduct['priceTiers']> = []
    for (const tier of priceTiers) {
      if (!tier || typeof tier !== 'object') continue
      const minQty = parseNumber(tier.minQty)
      const price = parseNumber(tier.price)
      if (minQty === undefined || price === undefined) continue
      normalizedTiers.push({
        minQty,
        maxQty: parseNumber(tier.maxQty),
        price,
        discount: parseNumber(tier.discount)
      })
    }
    normalized.priceTiers = normalizedTiers
  }

  return normalized
}

// GET /api/products?search=&category=&limit=20&skip=0
export async function GET(request: NextRequest) {
  try {
    const auth = await requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('search') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = {}
    if (q) query.name = new RegExp(q, 'i')
    if (category) query.category = category

    const [items, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({ success: true, items, total, skip, limit })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/products (create)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const payload = buildProductPayload(body)
    if (!payload.name) return NextResponse.json({ success: false, error: 'Le nom du produit est requis' }, { status: 400 })

    // Validation des prix - par défaut, un prix doit être défini sauf si explicitement sur devis
    if (!payload.requiresQuote && !payload.price && !payload.baseCost && !payload.price1688) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un prix doit être défini (prix public, coût de base ou prix 1688). Cochez "Sur devis" pour les produits sans prix.' 
      }, { status: 400 })
    }

    const created = await Product.create(payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (e: any) {
    console.error('Erreur création produit:', e)
    // Extraction du message d'erreur Mongoose/MongoDB
    let errorMessage = 'Erreur lors de la création du produit'
    if (e.name === 'ValidationError') {
      const messages = Object.values(e.errors || {}).map((err: any) => err.message)
      errorMessage = messages.join(', ') || 'Erreur de validation'
    } else if (e.message) {
      errorMessage = e.message
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// PATCH /api/products (update)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...rest } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID du produit requis' }, { status: 400 })
    const payload = buildProductPayload(rest)
    
    // Récupérer le produit existant pour vérifier
    const existing = await Product.findById(id).lean()
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Produit non trouvé' }, { status: 404 })
    }
    
    // Validation des prix - un prix doit être défini sauf si explicitement sur devis
    const finalRequiresQuote = payload.requiresQuote ?? (existing as any).requiresQuote
    const finalPrice = payload.price ?? (existing as any).price
    const finalBaseCost = payload.baseCost ?? (existing as any).baseCost
    const finalPrice1688 = payload.price1688 ?? (existing as any).price1688
    
    if (!finalRequiresQuote && !finalPrice && !finalBaseCost && !finalPrice1688) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un prix doit être défini (prix public, coût de base ou prix 1688). Cochez "Sur devis" pour les produits sans prix.' 
      }, { status: 400 })
    }
    
    await Product.updateOne({ _id: id }, { $set: payload })
    const updated = await Product.findById(id).lean()
    return NextResponse.json({ success: true, item: updated })
  } catch (e: any) {
    console.error('Erreur mise à jour produit:', e)
    let errorMessage = 'Erreur lors de la mise à jour du produit'
    if (e.name === 'ValidationError') {
      const messages = Object.values(e.errors || {}).map((err: any) => err.message)
      errorMessage = messages.join(', ') || 'Erreur de validation'
    } else if (e.message) {
      errorMessage = e.message
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// DELETE /api/products?id=
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    await Product.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 })
  }
}


