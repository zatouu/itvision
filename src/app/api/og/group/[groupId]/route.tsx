import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { MARKET_BRAND } from '@/lib/branding'

export const runtime = 'nodejs'

// Séparateur de milliers en espace simple : l'espace fine de toLocaleString n'existe pas dans la police par défaut
const fcfa = (n: number) => `${String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`

/** Image produit en data URL (PNG/JPEG uniquement : le moteur de rendu ne lit pas le WebP). */
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
 * GET /api/og/group/[groupId]?format=story|card
 * Visuel de partage d'un achat groupé : story 1080×1920 (statut WhatsApp, TikTok, Instagram)
 * ou carte 1200×630 (aperçu de lien WhatsApp / Facebook).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const story = req.nextUrl.searchParams.get('format') !== 'card'
  const W = story ? 1080 : 1200
  const H = story ? 1920 : 630

  await connectMongoose()
  const g = await GroupOrder.findOne({ groupId })
    .select('product currentUnitPrice currentQty targetQty priceTiers deadline participants.qty status')
    .lean() as any
  if (!g) return new Response('Not found', { status: 404 })

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/+$/, '')
  const img = await imageDataUrl(g.product?.image, origin)

  // Photo seule, servie depuis notre domaine : un canvas dessiné avec une image externe ne peut pas être enregistré en vidéo
  if (req.nextUrl.searchParams.get('format') === 'photo') {
    if (!img) return new Response('No photo', { status: 404 })
    return new ImageResponse(
      // eslint-disable-next-line @next/next/no-img-element
      <div style={{ display: 'flex', width: 720, height: 720 }}><img src={img} alt="" width={720} height={720} style={{ objectFit: 'cover' }} /></div>,
      { width: 720, height: 720, headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  }
  const unit = g.currentUnitPrice || g.product?.basePrice || 0
  const base = g.product?.basePrice || unit
  const save = base > unit ? Math.round(((base - unit) / base) * 100) : 0
  const tiers = [...(g.priceTiers || [])].sort((a: any, b: any) => a.minQty - b.minQty)
  const next = tiers.find((t: any) => t.minQty > (g.currentQty || 0))
  const best = tiers.length ? tiers[tiers.length - 1] : null
  const pct = g.targetQty > 0 ? Math.min(100, Math.round(((g.currentQty || 0) / g.targetQty) * 100)) : 0
  const people = Array.isArray(g.participants) ? g.participants.length : 0
  const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''
  const link = `${origin.replace(/^https?:\/\//, '')}/achats-groupes/${groupId}`
  const s = (n: number) => Math.round(n * (story ? 1 : 0.62))

  const priceBlock = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: s(34), color: '#ddd6fe', fontWeight: 700 }}>PRIX ACTUEL DU GROUPE</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: s(20) }}>
        <div style={{ display: 'flex', fontSize: s(120), fontWeight: 800, color: '#fff' }}>{fcfa(unit)}</div>
        <div style={{ display: 'flex', fontSize: s(40), color: '#ddd6fe' }}>/pièce</div>
      </div>
      {save > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: s(16), marginTop: s(6) }}>
          <div style={{ display: 'flex', fontSize: s(40), color: '#c4b5fd', textDecoration: 'line-through' }}>{fcfa(base)}</div>
          <div style={{ display: 'flex', fontSize: s(40), fontWeight: 800, color: '#064e3b', background: '#6ee7b7', borderRadius: s(14), padding: `${s(4)}px ${s(16)}px` }}>-{save} %</div>
        </div>
      )}
    </div>
  )

  const ladder = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: s(14), marginTop: s(30) }}>
      <div style={{ display: 'flex', fontSize: s(46), fontWeight: 800, color: '#fff' }}>Plus on est nombreux, plus ça baisse</div>
      {next && (
        <div style={{ display: 'flex', fontSize: s(38), color: '#ede9fe' }}>
          {`Encore ${next.minQty - (g.currentQty || 0)} pièces et tout le groupe passe à ${fcfa(next.price)}`}
        </div>
      )}
      {best && best !== next && best.minQty > (g.currentQty || 0) && (
        <div style={{ display: 'flex', fontSize: s(38), color: '#ede9fe' }}>{`Jusqu'à ${fcfa(best.price)} à ${best.minQty} pièces`}</div>
      )}
      <div style={{ display: 'flex', width: '100%', height: s(30), background: 'rgba(255,255,255,0.25)', borderRadius: s(30), marginTop: s(10) }}>
        <div style={{ display: 'flex', width: `${Math.max(4, pct)}%`, height: '100%', background: '#6ee7b7', borderRadius: s(30) }} />
      </div>
      <div style={{ display: 'flex', fontSize: s(34), color: '#ddd6fe' }}>
        {`${g.currentQty || 0}/${g.targetQty} pièces · ${people} participant${people > 1 ? 's' : ''}${deadline ? ` · clôture le ${deadline}` : ''}`}
      </div>
    </div>
  )

  const cta = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: story ? 'center' : 'flex-start', gap: s(10), marginTop: s(30) }}>
      <div style={{ display: 'flex', fontSize: s(48), fontWeight: 800, color: '#4c1d95', background: '#fff', borderRadius: s(60), padding: `${s(22)}px ${s(56)}px` }}>
        Rejoindre le groupe
      </div>
      <div style={{ display: 'flex', fontSize: s(32), color: '#ede9fe' }}>{link}</div>
      <div style={{ display: 'flex', fontSize: s(30), color: '#c4b5fd' }}>Aucun paiement maintenant · prix final à la clôture</div>
    </div>
  )

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: s(16) }}>
      <div style={{ display: 'flex', fontSize: s(52), fontWeight: 800, color: '#fff' }}>{MARKET_BRAND.name}</div>
      <div style={{ display: 'flex', fontSize: s(30), fontWeight: 700, color: '#4c1d95', background: '#ddd6fe', borderRadius: s(30), padding: `${s(6)}px ${s(20)}px` }}>ACHAT GROUPÉ</div>
    </div>
  )

  const photo = img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="" width={story ? 600 : 420} height={story ? 600 : 420} style={{ objectFit: 'cover', borderRadius: s(48) }} />
  ) : null

  const title = (
    <div style={{ display: 'flex', fontSize: s(54), fontWeight: 800, color: '#fff', lineHeight: 1.15, marginTop: s(24), marginBottom: s(20) }}>
      {String(g.product?.name || 'Produit').slice(0, story ? 70 : 60)}
    </div>
  )

  const background = 'linear-gradient(160deg, #4c1d95 0%, #6d28d9 45%, #047857 100%)'

  return new ImageResponse(
    story ? (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, padding: 90, background, fontFamily: 'sans-serif' }}>
        {header}
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: '#fff', marginTop: 50, lineHeight: 1.1 }}>Achetez moins cher en groupe</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>{photo}</div>
        {title}
        {priceBlock}
        {ladder}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        {cta}
      </div>
    ) : (
      <div style={{ display: 'flex', width: W, height: H, padding: 48, gap: 44, background, fontFamily: 'sans-serif' }}>
        {photo && <div style={{ display: 'flex', alignItems: 'center' }}>{photo}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {header}
          {title}
          {priceBlock}
          {ladder}
        </div>
      </div>
    ),
    { width: W, height: H, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } }
  )
}
