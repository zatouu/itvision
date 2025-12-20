import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product, { type IProduct } from '@/lib/models/Product.validated'
import jwt from 'jsonwebtoken'

function requireManagerRole(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'Non authentifié' as const }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false, status: 403, error: 'Accès refusé' as const }
    return { ok: true }
  } catch {
    return { ok: false, status: 401, error: 'Token invalide' as const }
  }
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
    weightKg,
    lengthCm,
    widthCm,
    heightCm,
    volumeM3,
    packagingWeightKg,
    colorOptions,
    variantOptions,
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
    insuranceRate
  } = payload || {}

  const normalized: Partial<IProduct> = {
    name,
    category,
    description,
    tagline,
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
  normalized.weightKg = parseNumber(weightKg)
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

  if (Array.isArray(shippingOverrides)) {
    const overrides: NonNullable<IProduct['shippingOverrides']> = []
    for (const raw of shippingOverrides) {
      if (!raw || typeof raw !== 'object' || typeof raw.methodId !== 'string') continue
      overrides.push({
        methodId: raw.methodId,
        ratePerKg: parseNumber(raw.ratePerKg),
        ratePerM3: parseNumber(raw.ratePerM3),
        flatFee: parseNumber(raw.flatFee)
      })
    }
    if (overrides.length > 0) {
      normalized.shippingOverrides = overrides
    }
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

  return normalized
}

// GET /api/products?search=&category=&limit=20&skip=0
export async function GET(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
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
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const payload = buildProductPayload(body)
    if (!payload.name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 })

    const created = await Product.create(payload)
    return NextResponse.json({ success: true, item: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 })
  }
}

// PATCH /api/products (update)
export async function PATCH(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    await connectMongoose()
    const body = await request.json()
    const { id, ...rest } = body || {}
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })
    const payload = buildProductPayload(rest)
    await Product.updateOne({ _id: id }, { $set: payload })
    const updated = await Product.findById(id).lean()
    return NextResponse.json({ success: true, item: updated })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/products?id=
export async function DELETE(request: NextRequest) {
  try {
    const auth = requireManagerRole(request)
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


