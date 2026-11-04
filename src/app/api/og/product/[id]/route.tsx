import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { MARKET_BRAND } from '@/lib/branding'

export const runtime = 'nodejs'

const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`

async function imageDataUrl(src: string | undefined, origin: string): Promise<string | null> {
  if (!src) return null
  try {
    const res = await fetch(src.startsWith('http') ? src : `${origin}${src}`, { signal: AbortSignal.timeout(4000) })
    const type = res.headers.get('content-type') || ''
    if (!res.ok || !/^image\/(png|jpe?g)/.test(type)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 3_000_000) return null
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * GET /api/og/product/[id]?format=story|card|photo
 * Visuels du kit revendeur pour un produit de boutique publié : story 1080×1920, carte 1200×630,
 * photo 720×720 servie depuis notre domaine (utilisée par la vidéo générée dans le navigateur).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) return new Response('Not found', { status: 404 })
  const format = req.nextUrl.searchParams.get('format')
  const story = format !== 'card'
  const W = story ? 1080 : 1200
  const H = story ? 1920 : 630

  await connectMongoose()
  const p = await Product.findOne({ _id: id, isPublished: true })
    .select('name price image gallery stockStatus stockQuantity shopId sellerName')
    .lean() as any
  if (!p) return new Response('Not found', { status: 404 })

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/+$/, '')
  const img = await imageDataUrl(p.image || p.gallery?.[0], origin)

  if (format === 'photo') {
    if (!img) return new Response('No photo', { status: 404 })
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <div style={{ display: 'flex', width: 720, height: 720 }}><img src={img} alt="" width={720} height={720} style={{ objectFit: 'cover' }} /></div>,
      { width: 720, height: 720, headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  }

  const local = !!p.shopId && p.stockStatus === 'in_stock' && (p.stockQuantity || 0) > 0
  const badge = local ? 'En stock à Dakar · livré en 24 h' : 'Sur commande'
  const shop = String(p.sellerName || MARKET_BRAND.name).slice(0, 40)
  const link = `${origin.replace(/^https?:\/\//, '')}/produits/${id}`
  const s = (n: number) => Math.round(n * (story ? 1 : 0.62))
  const background = 'linear-gradient(160deg, #064e3b 0%, #047857 50%, #0f172a 100%)'

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: s(16) }}>
      <div style={{ display: 'flex', fontSize: s(50), fontWeight: 800, color: '#fff' }}>{shop}</div>
      <div style={{ display: 'flex', fontSize: s(26), fontWeight: 700, color: '#064e3b', background: '#a7f3d0', borderRadius: s(30), padding: `${s(6)}px ${s(18)}px` }}>{`BOUTIQUE ${MARKET_BRAND.name.toUpperCase()}`}</div>
    </div>
  )
  const photo = img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="" width={story ? 760 : 460} height={story ? 760 : 460} style={{ objectFit: 'cover', borderRadius: s(48) }} />
  ) : null
  const title = (
    <div style={{ display: 'flex', fontSize: s(56), fontWeight: 800, color: '#fff', lineHeight: 1.15, marginTop: s(28) }}>
      {String(p.name || 'Produit').slice(0, story ? 80 : 60)}
    </div>
  )
  const price = (
    <div style={{ display: 'flex', fontSize: s(130), fontWeight: 800, color: '#fff', marginTop: s(16) }}>{fcfa(p.price || 0)}</div>
  )
  const badgeEl = (
    <div style={{ display: 'flex', alignSelf: 'flex-start', fontSize: s(40), fontWeight: 800, color: '#78350f', background: '#fde68a', borderRadius: s(40), padding: `${s(12)}px ${s(30)}px`, marginTop: s(16) }}>{badge}</div>
  )
  const cta = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: story ? 'center' : 'flex-start', gap: s(10), marginTop: s(30) }}>
      <div style={{ display: 'flex', fontSize: s(50), fontWeight: 800, color: '#064e3b', background: '#fff', borderRadius: s(60), padding: `${s(22)}px ${s(56)}px` }}>Commander</div>
      <div style={{ display: 'flex', fontSize: s(32), color: '#d1fae5' }}>{link}</div>
      <div style={{ display: 'flex', fontSize: s(30), color: '#a7f3d0' }}>Paiement garanti · remboursé si non livré</div>
    </div>
  )

  return new ImageResponse(
    story ? (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, padding: 90, background, fontFamily: 'sans-serif' }}>
        {header}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>{photo}</div>
        {title}
        {price}
        {badgeEl}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        {cta}
      </div>
    ) : (
      <div style={{ display: 'flex', width: W, height: H, padding: 48, gap: 44, background, fontFamily: 'sans-serif' }}>
        {photo && <div style={{ display: 'flex', alignItems: 'center' }}>{photo}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {header}
          {title}
          {price}
          {badgeEl}
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
  )
}
