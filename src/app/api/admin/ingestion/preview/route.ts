import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    if (!ADMIN_ROLES.includes(String(role).toUpperCase())) throw new Error('Accès non autorisé')
  })
}

const isPrivateHostname = (hostname: string) => {
  const h = hostname.toLowerCase().trim()
  if (!h) return true
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true
  if (h === '0.0.0.0' || h === '127.0.0.1' || h === '::1') return true

  // IPv4 private ranges (simple string-based checks)
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  const m172 = h.match(/^172\.(\d+)\./)
  if (m172) {
    const n = Number(m172[1])
    if (n >= 16 && n <= 31) return true
  }

  return false
}

const extractMeta = (html: string, keys: Array<{ attr: 'property' | 'name'; key: string }>) => {
  const results: Record<string, string> = {}
  for (const k of keys) {
    // Match: <meta property="og:title" content="...">
    const re = new RegExp(
      `<meta[^>]+${k.attr}=["']${k.key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}["'][^>]*>`,
      'i'
    )
    const tagMatch = html.match(re)
    const tag = tagMatch?.[0] || ''
    const contentMatch = tag.match(/content=["']([^"']+)["']/i)
    const content = contentMatch?.[1]?.trim()
    if (content) results[k.key] = content
  }
  return results
}

const extractTitle = (html: string) => {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim() || ''
}

const resolveUrl = (maybeUrl: string, base: URL) => {
  const raw = String(maybeUrl || '').trim()
  if (!raw) return null
  if (raw.startsWith('data:')) return null
  try {
    return new URL(raw, base).toString()
  } catch {
    return null
  }
}

const extractAllMetaContents = (html: string, attr: 'property' | 'name', key: string) => {
  const escaped = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
  const re = new RegExp(`<meta[^>]+${attr}=["']${escaped}["'][^>]*>`, 'gi')
  const out: string[] = []
  const tags = html.match(re) || []
  for (const tag of tags) {
    const contentMatch = tag.match(/content=["']([^"']+)["']/i)
    const content = contentMatch?.[1]?.trim()
    if (content) out.push(content)
  }
  return out
}

const extractJsonLdImages = (html: string) => {
  const out: string[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  const blocks = html.match(re) || []
  for (const b of blocks) {
    const m = b.match(/>([\s\S]*?)<\/script>/i)
    const json = m?.[1]
    if (!json) continue
    try {
      const parsed = JSON.parse(json)
      const candidates: any[] = Array.isArray(parsed) ? parsed : [parsed]
      for (const c of candidates) {
        const img = (c && (c.image || c.thumbnailUrl || c.thumbnail)) ?? null
        if (typeof img === 'string') out.push(img)
        if (Array.isArray(img)) out.push(...img.filter((x) => typeof x === 'string'))
      }
    } catch {
      // ignore
    }
  }
  return out
}

const extractImgSrcFallback = (html: string) => {
  const out: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(html))) {
    const src = match[1]?.trim()
    if (src) out.push(src)
    if (out.length >= 30) break
  }
  return out
}

const normalizeImages = (urls: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    const v = (u || '').trim()
    if (!v) continue
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out.slice(0, 12)
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json().catch(() => null)
    const urlRaw = String(body?.url || '').trim()
    if (!urlRaw) return NextResponse.json({ error: 'URL requise' }, { status: 400 })

    let url: URL
    try {
      url = new URL(urlRaw)
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      return NextResponse.json({ error: 'Protocole non autorisé' }, { status: 400 })
    }

    if (isPrivateHostname(url.hostname)) {
      return NextResponse.json({ error: 'Hôte non autorisé' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)

    const res = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ITVisionIngestion/1.0)',
        accept: 'text/html,application/xhtml+xml'
      }
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      return NextResponse.json({ error: `Fetch failed (${res.status})` }, { status: 400 })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ error: 'Contenu non HTML' }, { status: 400 })
    }

    const html = await res.text()

    const meta = extractMeta(html, [
      { attr: 'property', key: 'og:title' },
      { attr: 'property', key: 'og:description' },
      { attr: 'property', key: 'og:image' },
      { attr: 'property', key: 'og:image:secure_url' },
      { attr: 'property', key: 'og:video' },
      { attr: 'property', key: 'og:video:url' },
      { attr: 'property', key: 'og:video:secure_url' },
      { attr: 'name', key: 'description' }
    ])

    const title = meta['og:title'] || extractTitle(html)
    const description = meta['og:description'] || meta['description'] || ''
    const ogVideo = meta['og:video:secure_url'] || meta['og:video:url'] || meta['og:video'] || ''

    const rawImages = [
      ...extractAllMetaContents(html, 'property', 'og:image:secure_url'),
      ...extractAllMetaContents(html, 'property', 'og:image'),
      ...extractAllMetaContents(html, 'name', 'twitter:image'),
      ...extractAllMetaContents(html, 'name', 'twitter:image:src'),
      ...extractJsonLdImages(html),
      ...extractImgSrcFallback(html)
    ]

    const resolvedImages = rawImages
      .map((u) => resolveUrl(u, url))
      .filter((u): u is string => typeof u === 'string' && u.length > 0)

    const gallery = normalizeImages(resolvedImages)
    const draft = {
      name: title || 'Produit occasion',
      description: description || null,
      image: gallery[0] || '/file.svg',
      gallery,
      sourceUrl: url.toString(),
      videoUrl: ogVideo || null
    }

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
