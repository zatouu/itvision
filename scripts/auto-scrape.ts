#!/usr/bin/env node
/**
 * Scraping automatique headless 1688 / AliExpress → IT Vision smart-import
 *
 * Usage:
 *   npx tsx scripts/auto-scrape.ts --file data/auto-scrape-urls.txt
 *   npx tsx scripts/auto-scrape.ts --file data/auto-scrape-urls.txt --dry-run
 *   npx tsx scripts/auto-scrape.ts --file data/auto-scrape-urls.txt --api https://app.itvision.sn --token <JWT_ADMIN>
 *
 * Env:
 *   NEXT_PUBLIC_SITE_URL | API_BASE_URL    base URL de l'API (défaut http://localhost:3000)
 *   IMPORT_API_TOKEN                     JWT admin (sinon généré avec JWT_SECRET)
 *   JWT_SECRET                           utilisé pour signer un token admin temporaire
 */

import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { BrowserScraper } from '../src/lib/browser-scraper'
import { signAuthTokenWithExpiry } from '../src/lib/jwt'

interface ScrapeResult {
  url: string
  ok: boolean
  name?: string
  error?: string
  imported?: boolean
  productId?: string
  pricing?: { price: number; b2bPrice: number }
}

function parseArgs(): { file: string; dryRun: boolean; concurrency: number; baseUrl: string; token?: string } {
  const args = process.argv.slice(2)
  let file = ''
  let dryRun = false
  let concurrency = 1
  let baseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  let token = process.env.IMPORT_API_TOKEN

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        file = args[++i]
        break
      case '--dry-run':
      case '-d':
        dryRun = true
        break
      case '--concurrency':
      case '-c':
        concurrency = parseInt(args[++i], 10) || 1
        break
      case '--api':
        baseUrl = args[++i]
        break
      case '--token':
      case '-t':
        token = args[++i]
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/auto-scrape.ts [options]

Options:
  -f, --file <path>      Fichier contenant une URL par ligne
  -d, --dry-run          Scraper sans appeler l'API
  -c, --concurrency <n>  Nombre d'URLs en parallèle (défaut 1)
      --api <url>        Base URL de l'API IT Vision
  -t, --token <jwt>      Token admin (ou IMPORT_API_TOKEN)
  -h, --help             Afficher cette aide
`)
        process.exit(0)
    }
  }

  if (!file) {
    console.error('❌ Erreur: fichier d\'URLs requis (--file)')
    process.exit(1)
  }

  return { file, dryRun, concurrency, baseUrl, token }
}

async function loadUrls(filePath: string): Promise<string[]> {
  const content = await fs.readFile(path.resolve(filePath), 'utf-8')
  return content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .filter(l => l.includes('1688.com') || l.includes('aliexpress.com'))
}

function toPositiveNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function dedupeImages(images: unknown[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const url of images || []) {
    if (typeof url !== 'string' || !url.startsWith('http')) continue
    const normalized = url.replace(/_\d+x\d+[^.]*/i, '').trim()
    if (!normalized) continue
    const key = normalized.split('?')[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

function normalizeVariantGroups(groups: unknown) {
  if (!Array.isArray(groups)) return []
  return groups
    .map((g: any, gi: number) => {
      const groupName = String(g?.name || '').trim()
      if (!groupName) return null
      const variants = (Array.isArray(g?.variants) ? g.variants : [])
        .map((v: any, vi: number) => {
          const name = String(v?.name || '').trim()
          if (!name) return null
          return {
            id: String(v?.id || `g${gi}-v${vi}`),
            name,
            image: typeof v?.image === 'string' && v.image.startsWith('http') ? v.image : undefined,
            price1688: toPositiveNumber(v?.price1688),
            stock: Number.isFinite(Number(v?.stock)) ? Math.max(0, Number(v.stock)) : 0,
          }
        })
        .filter(Boolean)
      if (variants.length === 0) return null
      return { name: groupName, variants }
    })
    .filter(Boolean) as Array<{ name: string; variants: any[] }>
}

function transformForSmartApi(p: Record<string, unknown>) {
  const normalizedVariantGroups = normalizeVariantGroups(p.variantGroups || [])
  const variantImages = normalizedVariantGroups.flatMap(g =>
    (g.variants || []).map((v: any) => v.image).filter(Boolean)
  )

  const gallery = dedupeImages((p.gallery as any[]) || []).slice(0, 20)
  const descriptionImages = dedupeImages((p.descriptionImages as any[]) || []).slice(0, 30)
  const images = dedupeImages([...gallery, ...descriptionImages, ...variantImages]).slice(0, 10)

  const lengthCm = toPositiveNumber(p.lengthCm)
  const widthCm = toPositiveNumber(p.widthCm)
  const heightCm = toPositiveNumber(p.heightCm)
  const hasDimensions = Boolean(lengthCm && widthCm && heightCm)
  const volumeM3 = hasDimensions ? Number(((lengthCm! * widthCm! * heightCm!) / 1000000).toFixed(4)) : undefined

  const is1688 = String(p.platform).toLowerCase() === '1688' || String(p.url).includes('1688.com')

  return {
    name: String(p.name || 'Produit'),
    description: String(p.description || Object.entries((p.specifications as any) || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') || ''),
    images,
    gallery,
    descriptionImages,
    videos: (p.videos as string[]) || [],
    price1688: toPositiveNumber(p.price1688),
    promoPrice1688: toPositiveNumber(p.promoPrice1688),
    price: toPositiveNumber(p.price),
    priceTiers: (p.priceTiers as any[]) || [],
    category: String(p.category || 'Catalogue import Chine'),
    features: (p.features as string[]) || [],
    variants: normalizedVariantGroups.flatMap(g =>
      (g.variants || []).map((v: any) => ({ ...v, groupName: g.name }))
    ),
    variantGroups: normalizedVariantGroups,
    weightKg: toPositiveNumber(p.weightKg),
    lengthCm: hasDimensions ? lengthCm : undefined,
    widthCm: hasDimensions ? widthCm : undefined,
    heightCm: hasDimensions ? heightCm : undefined,
    volumeM3,
    sourceUrl: String(p.url || ''),
    sourcePlatform: is1688 ? ('1688' as const) : ('aliexpress' as const),
    supplierName: String((p as any).shopName || (p as any).supplier?.name || ''),
    moq: toPositiveNumber(p.moq),
    specifications: (p.specifications as Record<string, string>) || {},
  }
}

async function getAdminToken(token?: string): Promise<string> {
  if (token) return token
  if (!process.env.JWT_SECRET) {
    throw new Error('IMPORT_API_TOKEN ou JWT_SECRET doit être défini dans l\'env')
  }
  const t = await signAuthTokenWithExpiry(
    {
      userId: 'cron-auto-import',
      email: 'cron@itvision.local',
      username: 'Auto Import',
      role: 'ADMIN',
    },
    '7d'
  )
  console.log('🔑 Token admin auto-généré (valide 7j)')
  return t
}

async function callSmartImport(baseUrl: string, token: string, products: any[]): Promise<{ imported: number; failed: number; results: any[] }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/admin/products/smart-import?smart=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      products,
      options: {
        reformatDescriptions: true,
        filterImages: true,
        skipExisting: true,
        exchangeRate: 85,
        serviceFeeRate: 10,
        b2bDiscountPercent: 15,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  return await res.json()
}

async function scrapeOneUrl(
  scraper: BrowserScraper,
  url: string,
  dryRun: boolean,
  baseUrl: string,
  token: string
): Promise<ScrapeResult> {
  const start = Date.now()
  try {
    console.log(`🌐 ${url}`)
    const raw = await scraper.scrapeWithExtension(url)

    if (!raw.success || !raw.data) {
      throw new Error(raw.error || 'Scraping échoué')
    }

    const product = raw.data
    console.log(`   └─ ${product.name || 'sans nom'} | ${(product.gallery as any[])?.length || 0} img | ${(product.price1688 as number) || '?'} ¥`)

    if (dryRun) {
      return { url, ok: true, name: String(product.name || ''), imported: false }
    }

    const payload = transformForSmartApi(product)
    const { results } = await callSmartImport(baseUrl, token, [payload])
    const r = results?.[0]

    return {
      url,
      ok: r?.success || false,
      name: payload.name,
      imported: r?.success,
      productId: r?.productId,
      pricing: r?.pricing,
      error: r?.error,
    }
  } catch (err: any) {
    return { url, ok: false, error: err.message || String(err) }
  } finally {
    console.log(`   (${Date.now() - start}ms)`)
  }
}

async function runInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

async function main() {
  const { file, dryRun, concurrency, baseUrl, token } = parseArgs()
  const urls = await loadUrls(file)

  if (urls.length === 0) {
    console.error('❌ Aucune URL 1688/AliExpress trouvée dans', file)
    process.exit(1)
  }

  console.log(`🚀 Auto-scrape: ${urls.length} URL(s) → ${baseUrl} (dryRun=${dryRun})`)

  const authToken = dryRun ? '' : await getAdminToken(token)
  const scraper = new BrowserScraper({ headless: true, timeout: 120000 })

  try {
    await scraper.init()
    const results = await runInBatches(urls, concurrency, url => scrapeOneUrl(scraper, url, dryRun, baseUrl, authToken))

    const created = results.filter(r => r.imported).length
    const okButNotImported = results.filter(r => r.ok && !r.imported).length
    const failed = results.filter(r => !r.ok).length

    console.log('\n📊 Résumé')
    console.log(`   Créés: ${created}`)
    console.log(`   OK sans import (dry-run/skipped): ${okButNotImported}`)
    console.log(`   Échecs: ${failed}`)

    if (failed > 0) {
      console.log('\n❌ Erreurs:')
      results.filter(r => !r.ok).forEach(r => console.log(`   - ${r.url}: ${r.error}`))
    }

    const outputFile = `auto-scrape-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    await fs.writeFile(outputFile, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2))
    console.log(`\n💾 Résultats sauvegardés dans ${outputFile}`)
  } finally {
    await scraper.close()
  }
}

main().catch(err => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
