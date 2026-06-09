/**
 * POST /api/market/sourcing/search-external
 *
 * Recherche un produit sur 1688 via image upload (bridge Playwright).
 * Utilisé quand le catalogue interne n'a pas de match.
 *
 * Body:
 *   imageUrl: string   — URL de l'image uploadée (/api/uploads/...)
 *   description?: string — texte optionnel pour affiner la recherche
 *
 * Flow:
 *   1. Télécharge l'image localement
 *   2. Ouvre 1688.com
 *   3. Upload l'image dans leur moteur de recherche par image
 *   4. Scrape les résultats (3-5 produits)
 *   5. Retourne { success, results[], meta }
 *
 * Timeout: ~15s. Fragile car dépend du DOM 1688.
 */

import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'

interface ExternalProductResult {
  title: string
  price1688?: number
  image: string
  url: string
  supplier?: string
  minOrder?: number
  location?: string
  platform: '1688'
}

function normalize1688ImageUrl(src: string): string {
  if (!src) return ''
  let clean = src
    .replace(/_\d+x\d+[^.]*/i, '')
    .replace(/\.\d+x\d+\./i, '.')
  if (clean.startsWith('//')) clean = 'https:' + clean
  return clean
}

export async function POST(request: NextRequest) {
  let imagePath: string | null = null

  try {
    const body = await request.json().catch(() => ({}))
    const imageUrl = body.imageUrl?.trim()
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl requis' }, { status: 400 })
    }

    // Résoudre le chemin local de l'image
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    let localPath: string | null = null

    if (imageUrl.startsWith('/api/uploads/')) {
      const filename = path.basename(imageUrl)
      localPath = path.join(process.cwd(), 'public', 'uploads', filename)
      if (!existsSync(localPath)) {
        // Essaye aussi sans le public/ (uploads directs)
        localPath = path.join(process.cwd(), 'uploads', filename)
      }
    } else if (imageUrl.startsWith('http')) {
      // Télécharger l'image temporairement
      const res = await fetch(imageUrl)
      if (!res.ok) {
        return NextResponse.json({ success: false, error: 'Impossible de télécharger l\'image' }, { status: 400 })
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const tmpDir = path.join(process.cwd(), 'tmp')
      await fs.mkdir(tmpDir, { recursive: true })
      localPath = path.join(tmpDir, `search-${Date.now()}.jpg`)
      await fs.writeFile(localPath, buf)
      imagePath = localPath
    }

    if (!localPath || !existsSync(localPath)) {
      return NextResponse.json({ success: false, error: 'Image introuvable' }, { status: 400 })
    }
    imagePath = localPath

    // === Lancement Playwright ===
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    })

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    })

    // Anti-detection
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    })

    const page = await context.newPage()

    // 1. Aller sur 1688 homepage
    await page.goto('https://www.1688.com', { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1500)

    // 2. Chercher l'input file pour upload d'image (icône caméra)
    // Plusieurs stratégies car le DOM change
    let uploaded = false
    const imageInputSelectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
      '[class*="upload"] input[type="file"]',
      '[class*="imageSearch"] input[type="file"]',
    ]

    for (const sel of imageInputSelectors) {
      const input = await page.$(sel)
      if (input) {
        try {
          await input.setInputFiles(localPath)
          uploaded = true
          break
        } catch {
          // continue
        }
      }
    }

    // Si pas trouvé directement, chercher le bouton caméra et cliquer
    if (!uploaded) {
      const cameraBtnSelectors = [
        '[class*="camera"]',
        '[class*="imageSearch"]',
        '[class*="pic"]',
        '[title*="图片"]',
        '[title*="拍照"]',
        'i[class*="camera"]',
        'span[class*="camera"]',
      ]
      for (const sel of cameraBtnSelectors) {
        try {
          const btn = await page.$(sel)
          if (btn) {
            await btn.click()
            await page.waitForTimeout(1000)
            // Chercher l'input file qui aurait apparu
            const input = await page.$('input[type="file"]')
            if (input) {
              await input.setInputFiles(localPath)
              uploaded = true
              break
            }
          }
        } catch {
          // continue
        }
      }
    }

    if (!uploaded) {
      await browser.close()
      return NextResponse.json({
        success: false,
        error: 'Impossible de trouver le champ upload sur 1688 (DOM probablement changé)',
        code: 'UPLOAD_NOT_FOUND',
      }, { status: 502 })
    }

    // 3. Attendre les résultats (max 12s)
    await page.waitForTimeout(3000)

    // Scroll pour charger les résultats lazy-load
    await page.evaluate(() => {
      window.scrollBy(0, 800)
    })
    await page.waitForTimeout(2000)

    // 4. Scraper les résultats
    const results: ExternalProductResult[] = await page.evaluate(() => {
      const out: ExternalProductResult[] = []

      // Sélecteurs multiples car 1688 change souvent
      const itemSelectors = [
        '[class*="offer"]',
        '[class*="result"]',
        '[class*="item"]',
        '.offer-list .item',
        '[data-offer]',
        '[class*="product"]',
      ]

      const items: Element[] = []
      for (const sel of itemSelectors) {
        const found = document.querySelectorAll(sel)
        if (found.length >= 3) {
          items.push(...Array.from(found))
          break
        }
      }

      for (const item of items.slice(0, 5)) {
        try {
          const titleEl =
            item.querySelector('[class*="title"], [class*="name"], h3, h4, a') ||
            item.querySelector('a')
          const title = titleEl?.textContent?.trim() || ''
          if (!title || title.length < 5) continue

          const imgEl = item.querySelector('img')
          const img = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || ''

          const priceEl = item.querySelector('[class*="price"], [class*="Price"]')
          const priceText = priceEl?.textContent || ''
          const priceMatch = priceText.match(/(\d+(?:\.\d+)?)/)
          const price1688 = priceMatch ? parseFloat(priceMatch[1]) : undefined

          const linkEl = item.querySelector('a[href]')
          let url = linkEl?.getAttribute('href') || ''
          if (url.startsWith('//')) url = 'https:' + url
          if (url && !url.startsWith('http')) url = 'https://www.1688.com' + url

          const supplierEl = item.querySelector('[class*="company"], [class*="shop"], [class*="supplier"]')
          const supplier = supplierEl?.textContent?.trim()

          const moqEl = item.querySelector('[class*="moq"], [class*="min"]')
          const moqMatch = moqEl?.textContent?.match(/(\d+)/)
          const minOrder = moqMatch ? parseInt(moqMatch[1]) : undefined

          out.push({
            title,
            price1688,
            image: img,
            url,
            supplier,
            minOrder,
            location: '',
            platform: '1688',
          })
        } catch {
          // ignorer item malformé
        }
      }

      return out
    })

    await browser.close()

    // Nettoyer images temporaires
    if (imagePath && imagePath.includes('tmp')) {
      await fs.unlink(imagePath).catch(() => {})
    }

    // Normaliser les URLs image
    const normalized = results
      .map(r => ({
        ...r,
        image: normalize1688ImageUrl(r.image),
      }))
      .filter(r => r.image && r.title.length > 3)

    return NextResponse.json({
      success: true,
      results: normalized,
      meta: {
        source: '1688',
        count: normalized.length,
        searchedAt: new Date().toISOString(),
        note: normalized.length === 0
          ? 'Aucun résultat trouvé sur 1688. L\'équipe sourcing fera une recherche manuelle.'
          : undefined,
      },
    })

  } catch (error: any) {
    // Nettoyage
    if (imagePath && imagePath.includes('tmp')) {
      await fs.unlink(imagePath).catch(() => {})
    }

    console.error('[search-external] Erreur:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Erreur recherche externe',
      code: 'SEARCH_FAILED',
    }, { status: 500 })
  }
}

// Heartbeat / info
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/market/sourcing/search-external',
    method: 'POST',
    body: { imageUrl: 'string (URL image uploadée)', description: 'string? (optionnel)' },
    note: 'Fragile : dépend du DOM 1688. Timeout ~15s.',
  })
}
