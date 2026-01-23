import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    if (!ADMIN_ROLES.includes(String(role).toUpperCase())) throw new Error('Accès non autorisé')
  })
}

const asStringArray = (value: any) => {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v || '').trim()).filter(Boolean)
}

const normalizeCondition = (value: any): 'new' | 'used' | 'refurbished' => {
  const v = String(value || 'used').toLowerCase()
  if (v === 'refurb' || v === 'refurbished' || v === 'reconditionne' || v === 'reconditionné') return 'refurbished'
  if (v === 'used' || v === 'occasion') return 'used'
  return 'new'
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json().catch(() => null)

    const name = String(body?.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

    const condition = normalizeCondition(body?.condition)
    const category = String(body?.category || 'Occasion (Chine)').trim()
    const description = body?.description ? String(body.description) : undefined
    const tagline = body?.tagline ? String(body.tagline) : undefined

    const image = String(body?.image || '').trim() || undefined
    const gallery = asStringArray(body?.gallery)

    const requiresQuote = body?.requiresQuote !== undefined ? !!body.requiresQuote : true

    const price = body?.price !== undefined && body?.price !== null && String(body.price).trim() !== ''
      ? Number(body.price)
      : undefined

    const currency = String(body?.currency || 'FCFA').trim() || 'FCFA'

    const sourceUrl = String(body?.sourceUrl || '').trim()
    const platform = String(body?.platform || 'xianyu').trim() || 'xianyu'

    const videoUrl = body?.videoUrl ? String(body.videoUrl).trim() : undefined

    // If they want a fixed price, keep requiresQuote false; otherwise stay in quote mode.
    const finalRequiresQuote = requiresQuote || !(typeof price === 'number' && Number.isFinite(price) && price > 0)

    const doc: any = {
      name,
      category,
      description,
      tagline,
      condition,
      requiresQuote: finalRequiresQuote,
      currency,
      // For used/refurb imports we default to preorder (shipping from China)
      stockStatus: body?.stockStatus ? String(body.stockStatus) : 'preorder',
      image: image || gallery[0] || '/file.svg',
      gallery: gallery.length ? gallery : (image ? [image] : []),
      // Keep the public price simple; admins can refine later
      price: !finalRequiresQuote && typeof price === 'number' && Number.isFinite(price) ? price : undefined,
      sourcing: {
        platform,
        productUrl: sourceUrl || undefined,
        notes: 'Ingestion (occasion/refurb)'
      }
    }

    // If there is a video URL, include it in gallery so the product detail carousel can render it.
    if (videoUrl) {
      doc.gallery = Array.isArray(doc.gallery) ? doc.gallery : []
      if (!doc.gallery.includes(videoUrl)) {
        doc.gallery.unshift(videoUrl)
      }
    }

    const created = await Product.create(doc)

    return NextResponse.json({ success: true, id: String(created._id) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
