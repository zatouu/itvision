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

// Playwright-extra + stealth pour anti-détection
let chromiumExtra: any = null
try {
  const { chromium: chromiumExtraModule } = require('playwright-extra')
  const stealth = require('puppeteer-extra-plugin-stealth')
  chromiumExtraModule.use(stealth())
  chromiumExtra = chromiumExtraModule
} catch {
  // fallback sur chromium standard
}

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
      console.warn('[search-external] 400 — imageUrl manquant. Body:', JSON.stringify(body))
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

    // === Lancement Playwright avec retry et anti-detection ===
    async function doSearchAttempt(imagePathLocal: string): Promise<{ results: ExternalProductResult[]; blocked: boolean; error?: string }> {
      const launcher = chromiumExtra || chromium
      const browser = await launcher.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests',
        ],
      })

      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: ['notifications'],
      })

      // Anti-detection renforcée
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
        Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] })
        // @ts-ignore
        window.chrome = { runtime: {} }
        // @ts-ignore
        if (window.Notification) {
          // @ts-ignore
          window.Notification.permission = 'default'
        }
      })

      const page = await context.newPage()

      try {
        // 1. Aller sur 1688 image search directement
        await page.goto('https://s.1688.com/youyuan/index.htm?tab=imageSearch', { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)

        // Détection de blocage (captcha, wall, page vide)
        const pageContent = await page.content()
        const isBlocked = /captcha|验证码|滑块|安全验证|访问受限|login wall|请登录|登录/i.test(pageContent)
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '')
        const isEmpty = bodyText.length < 100

        if (isBlocked || isEmpty) {
          console.warn('[search-external] 1688 semble bloqué ou page vide. blocked=', isBlocked, 'empty=', isEmpty)
          await browser.close()
          return { results: [], blocked: true }
        }

        // 2. Chercher l'input file pour upload d'image
        let uploaded = false
        const imageInputSelectors = [
          'input[type="file"][accept*="image"]',
          'input[type="file"][name*="image"]',
          'input[type="file"]',
          '[class*="upload"] input[type="file"]',
          '[class*="imageSearch"] input[type="file"]',
          '[class*="search"] input[type="file"]',
        ]

        for (const sel of imageInputSelectors) {
          const input = await page.$(sel)
          if (input) {
            try {
              await input.setInputFiles(imagePathLocal)
              uploaded = true
              console.log('[search-external] Image uploadée via', sel)
              break
            } catch (e: any) {
              console.log('[search-external] Échec upload avec', sel, e.message)
            }
          }
        }

        // Chercher le bouton caméra / recherche par image et cliquer
        if (!uploaded) {
          const cameraBtnSelectors = [
            '[class*="camera"]',
            '[class*="imageSearch"]',
            '[class*="image-search"]',
            '[class*="pic"]',
            '[title*="图片"]',
            '[title*="拍照"]',
            '[title*="以图搜货"]',
            'i[class*="camera"]',
            'span[class*="camera"]',
            'a[class*="image"]',
            'div[class*="upload"]',
          ]
          for (const sel of cameraBtnSelectors) {
            try {
              const btn = await page.$(sel)
              if (btn) {
                await btn.click()
                await page.waitForTimeout(2000)
                const input = await page.$('input[type="file"]')
                if (input) {
                  await input.setInputFiles(imagePathLocal)
                  uploaded = true
                  console.log('[search-external] Image uploadée après clic sur', sel)
                  break
                }
              }
            } catch (e: any) {
              console.log('[search-external] Échec clic avec', sel, e.message)
            }
          }
        }

        if (!uploaded) {
          console.warn('[search-external] Impossible de trouver le champ d\'upload sur 1688')
          await browser.close()
          return { results: [], blocked: false, error: 'UPLOAD_NOT_FOUND' }
        }

        // 3. Attendre les résultats (1688 met parfois 5-10s à charger)
        await page.waitForTimeout(6000)

        // Scroll pour lazy-load
        await page.evaluate(() => { window.scrollBy(0, 800) })
        await page.waitForTimeout(3000)

        // 4. Scraper — sélecteurs enrichis
        const scraped = await page.evaluate(() => {
          const out: any[] = []
          const itemSelectors = [
            '[class*="offer"]',
            '[class*="result"]',
            '[class*="item"]',
            '[class*="product"]',
            '.offer-list .item',
            '.sm-offer-item',
            '[data-offer]',
            '[data-spm*="offer"]',
            '.common-offer',
            '.coms-layout-item',
          ]

          const items: Element[] = []
          for (const sel of itemSelectors) {
            const found = document.querySelectorAll(sel)
            if (found.length >= 2) {
              items.push(...Array.from(found))
              break
            }
          }

          for (const item of items.slice(0, 5)) {
            try {
              const titleEl =
                item.querySelector('[class*="title"], [class*="name"], [class*="Title"], h3, h4, a') ||
                item.querySelector('a')
              const title = titleEl?.textContent?.trim() || ''
              if (!title || title.length < 3) continue

              const imgEl = item.querySelector('img')
              const img = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || ''

              const priceEl = item.querySelector('[class*="price"], [class*="Price"], [class*="cost"]')
              const priceText = priceEl?.textContent || ''
              const priceMatch = priceText.match(/(\d+(?:\.\d+)?)/)
              const price1688 = priceMatch ? parseFloat(priceMatch[1]) : undefined

              const linkEl = item.querySelector('a[href]')
              let url = linkEl?.getAttribute('href') || ''
              if (url.startsWith('//')) url = 'https:' + url
              if (url && !url.startsWith('http')) url = 'https://www.1688.com' + url

              const supplierEl = item.querySelector('[class*="company"], [class*="shop"], [class*="supplier"], [class*="Seller"]')
              const supplier = supplierEl?.textContent?.trim()

              const moqEl = item.querySelector('[class*="moq"], [class*="min"], [class*="order"]')
              const moqMatch = moqEl?.textContent?.match(/(\d+)/)
              const minOrder = moqMatch ? parseInt(moqMatch[1]) : undefined

              out.push({ title, price1688, image: img, url, supplier, minOrder, location: '', platform: '1688' })
            } catch { /* ignore */ }
          }
          return out
        })

        await browser.close()
        return { results: scraped as ExternalProductResult[], blocked: false }
      } catch (err: any) {
        await browser.close().catch(() => {})
        console.error('[search-external] Erreur pendant le scraping:', err.message)
        return { results: [], blocked: false, error: err.message }
      }
    }

    // Retry : 2 tentatives avec délai
    let attempt = 0
    let finalResults: ExternalProductResult[] = []
    let wasBlocked = false

    while (attempt < 2) {
      attempt++
      console.log('[search-external] Tentative', attempt, 'sur 2')
      const { results, blocked } = await doSearchAttempt(localPath!)
      if (results.length > 0) {
        finalResults = results
        break
      }
      wasBlocked = blocked
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000)) // délai entre tentatives
      }
    }

    if (finalResults.length === 0 && wasBlocked) {
      return NextResponse.json({
        success: false,
        error: '1688 bloque la connexion (captcha ou restriction IP). L\'équipe sourcing fera une recherche manuelle.',
        code: 'BLOCKED_BY_1688',
      }, { status: 503 })
    }

    // Nettoyer images temporaires
    if (imagePath && imagePath.includes('tmp')) {
      await fs.unlink(imagePath).catch(() => {})
    }

    // Normaliser les URLs image
    const normalized = finalResults
      .map(r => ({
        ...r,
        image: normalize1688ImageUrl(r.image),
      }))
      .filter(r => r.image && r.title.length > 3)

    if (normalized.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Aucun résultat trouvé sur 1688. L\'équipe sourcing fera une recherche manuelle.',
        code: 'NO_RESULTS',
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      results: normalized,
      meta: {
        source: '1688',
        count: normalized.length,
        searchedAt: new Date().toISOString(),
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
