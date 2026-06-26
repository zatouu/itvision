import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'

const CORPORATE_CATEGORIES = [
  'vidéosurveillance',
  'caméra',
  'caméras',
  'dahua',
  'hikvision',
  'imou',
  'tplink',
  'tp-link',
  'nvr',
  'dvr',
  'switch',
  'routeur',
  'onduleur',
  'ups',
  'serveur',
  'biométrie',
  'contrôle d\'accès',
  'alarme',
  'pointeuse',
  'badgeuse'
]

function buildCategoryRegexes() {
  return CORPORATE_CATEGORIES.map((c) => new RegExp(c, 'i'))
}

// GET /api/corporate/products?q=&category=&limit=80
// Catalogue public corporate (itvisionplus.sn/produits)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const category = (searchParams.get('category') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '80'), 1), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const regexes = buildCategoryRegexes()

    const query: any = {
      isPublished: { $ne: false },
      $or: [
        { corporateVisible: true },
        { channels: { $in: ['corporate'] } },
        // Fallback : produits tech existants avec un prix, en attendant le tagging explicite
        {
          $and: [
            { category: { $in: regexes } },
            { $or: [{ b2bPrice: { $gt: 0 } }, { price: { $gt: 0 } }] }
          ]
        }
      ]
    }

    if (q) {
      query.$and = [{ name: new RegExp(q, 'i') }]
    }

    if (category) {
      query.category = new RegExp(`^${category}$`, 'i')
    }

    const [items, total] = await Promise.all([
      Product.find(query)
        .select(
          'name category description tagline image price b2bPrice currency features stockStatus stockQuantity leadTimeDays isFeatured corporateVisible channels'
        )
        .sort({ isFeatured: -1, corporateVisible: -1, category: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ])

    return NextResponse.json({ success: true, items, total, skip, limit, domain: 'corporate' })
  } catch (e) {
    console.error('[GET /api/corporate/products]', e)
    return NextResponse.json({ success: false, error: 'Failed to fetch corporate products' }, { status: 500 })
  }
}
