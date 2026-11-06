import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { isInternalCall } from '@/lib/internal-auth'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 8 * 1024 * 1024 // 8MB
const FETCH_TIMEOUT_MS = 15_000
const ALLOWED_HOSTS = /(^|\.)(alicdn\.com|aliexpress\.com|aliexpress-media\.com|alibaba\.com|1688\.com|taobao\.com|tbcdn\.cn|alibabausercontent\.com)$/i

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/gif': '.gif', 'image/avif': '.avif',
  'image/svg+xml': '.svg',
}

function refererFor(host: string): string {
  if (/1688\.com$/.test(host)) return 'https://www.1688.com/'
  if (/aliexpress\.com$|aliexpress-media\.com$/.test(host)) return 'https://www.aliexpress.com/'
  if (/alibaba\.com$/.test(host)) return 'https://www.alibaba.com/'
  return `https://${host}/`
}

/**
 * POST /api/internal/media/localize
 * Télécharge une image distante (CDN chinois) et l'héberge dans
 * public/uploads/products/ — immunise le catalogue contre le hotlink
 * protection, les placeholders lazy-load et l'indisponibilité des CDN.
 * Body : { url: string }
 * Réponse : { ok, url?, reason? } — url = chemin local /api/uploads/products/<f>
 */
export async function POST(request: NextRequest) {
  if (!isInternalCall(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''

    let parsed: URL
    try { parsed = new URL(url) } catch {
      return NextResponse.json({ ok: false, reason: 'invalid_url' }, { status: 400 })
    }
    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.test(parsed.hostname)) {
      return NextResponse.json({ ok: false, reason: 'host_not_allowed' }, { status: 400 })
    }

    // Idempotent : même URL → même fichier
    const hash = crypto.createHash('sha1').update(url).digest('hex').slice(0, 24)
    const dir = path.join(process.cwd(), 'public', 'uploads', 'products')
    const existing = ['.jpg', '.png', '.webp', '.gif', '.avif', '.svg']
      .map(ext => path.join(dir, `${hash}${ext}`))
      .find(f => existsSync(f))
    if (existing) {
      return NextResponse.json({ ok: true, url: `/api/uploads/products/${path.basename(existing)}`, cached: true })
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': refererFor(parsed.hostname),
        'Accept': 'image/avif,image/webp,image/png,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: `fetch_${res.status}` })
    }

    const mime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const ext = EXT_BY_MIME[mime]
    if (!ext) {
      return NextResponse.json({ ok: false, reason: `not_image:${mime}` })
    }

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) {
      return NextResponse.json({ ok: false, reason: 'placeholder_or_empty' })
    }
    if (buf.length > MAX_SIZE) {
      return NextResponse.json({ ok: false, reason: 'too_large' })
    }

    await mkdir(dir, { recursive: true })
    const filename = `${hash}${ext}`
    await writeFile(path.join(dir, filename), buf)

    return NextResponse.json({
      ok: true,
      url: `/api/uploads/products/${filename}`,
      size: buf.length,
      mime,
    })
  } catch (err) {
    console.error('[POST /api/internal/media/localize]', err)
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })
  }
}
