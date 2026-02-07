/**
 * Service de scraping robuste via navigateur (Playwright)
 * - Anti-detection avec stealth plugins
 - Gestion des retries avec backoff exponentiel
 - Rotation de proxies
 - Extraction avancée de données
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'

interface ScraperConfig {
  headless?: boolean
  proxy?: string
  userAgent?: string
  viewport?: { width: number; height: number }
  timeout?: number
}

interface ScrapingResult<T> {
  success: boolean
  data?: T
  error?: string
  attempts: number
  durationMs: number
}

interface Product1688 {
  offerId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  price1688?: number
  price1688Currency: 'CNY'
  exchangeRate: number
  currency: 'FCFA'
  category: string
  tagline: string
  availabilityNote: string
  features: string[]
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  variantGroups?: Array<{
    name: string
    variants: Array<{
      id: string
      name: string
      image?: string
      price1688?: number
      stock?: number
      isDefault?: boolean
    }>
  }>
  supplier?: {
    name: string
    location: string
    verified: boolean
    yearsInBusiness: number
    rating: number
    transactions: number
    responseTime: string
  }
  moq?: number
  description?: string
  specifications: Record<string, string>
}

interface ProductAliExpress {
  productId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  baseCost?: number
  price?: number
  currency: string
  weightKg: number
  features: string[]
  category: string
  tagline: string
  availabilityNote: string
  shopName?: string
  shopRating?: number
  shopYears?: number
  orders?: number
  totalRated?: number
  rating?: number
  variants?: Array<{
    name: string
    price?: number
    image?: string
  }>
  shipping?: Array<{
    method: string
    cost: number
    days: string
  }>
}

const DEFAULT_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
]

const DEFAULT_VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
]

export class BrowserScraper {
  private browser: Browser | null = null
  private config: ScraperConfig

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: true,
      timeout: 60000,
      ...config,
    }
  }

  async init(): Promise<void> {
    if (this.browser) return

    const launchOptions: any = {
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    }

    if (this.config.proxy) {
      launchOptions.proxy = { server: this.config.proxy }
    }

    this.browser = await chromium.launch(launchOptions)
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private async createContext(): Promise<BrowserContext> {
    if (!this.browser) throw new Error('Browser not initialized')

    const userAgent = this.config.userAgent || 
      DEFAULT_USER_AGENTS[Math.floor(Math.random() * DEFAULT_USER_AGENTS.length)]
    const viewport = this.config.viewport || 
      DEFAULT_VIEWPORTS[Math.floor(Math.random() * DEFAULT_VIEWPORTS.length)]

    const context = await this.browser.newContext({
      userAgent,
      viewport,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      permissions: ['geolocation'],
      geolocation: { latitude: 48.8566, longitude: 2.3522 },
      colorScheme: 'light',
    })

    // Inject script pour masquer automation
    await context.addInitScript(() => {
      // Masquer les propriétés automation
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] })
      
      // Masquer chrome.runtime
      // @ts-ignore
      window.chrome = { runtime: {} }
      
      // Masquer permissions
      const originalQuery = window.navigator.permissions.query
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) => 
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
    })

    return context
  }

  private async scrapeWithRetry<T>(
    url: string,
    extractor: (page: Page) => Promise<T>,
    maxRetries: number = 3
  ): Promise<ScrapingResult<T>> {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const context = await this.createContext()
      const page = await context.newPage()

      try {
        // Navigation avec attente réseau idle
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout,
        })

        // Attente aléatoire pour simuler comportement humain
        await page.waitForTimeout(1000 + Math.random() * 2000)

        // Scroll progressif
        await this.humanScroll(page)

        // Extraction des données
        const data = await extractor(page)

        await context.close()

        return {
          success: true,
          data,
          attempts: attempt,
          durationMs: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        await context.close()

        if (attempt < maxRetries) {
          // Backoff exponentiel avec jitter
          const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      attempts: maxRetries,
      durationMs: Date.now() - startTime,
    }
  }

  private async humanScroll(page: Page): Promise<void> {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight)
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    const scrolls = Math.ceil(scrollHeight / viewportHeight)

    for (let i = 0; i < Math.min(scrolls, 5); i++) {
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight * 0.8)
      })
      await page.waitForTimeout(300 + Math.random() * 500)
    }
  }

  // ======== EXTRACTEURS SPÉCIFIQUES ========

  async scrape1688(url: string): Promise<ScrapingResult<Product1688>> {
    return this.scrapeWithRetry(url, async (page) => {
        // Attendre le chargement du titre (dynamique sur 1688)
        await page.waitForFunction(() => {
          const h1 = document.querySelector('h1')
          return h1 && h1.textContent && h1.textContent.trim().length > 3
        }, { timeout: 15000 }).catch(() => {})
        
        // Attente supplémentaire pour React/Vue hydration
        await page.waitForTimeout(3000)

        // Scroll complet pour charger les images lazy et la description
        await this.humanScroll(page)
        await page.waitForTimeout(1000)

        // Cliquer sur l'onglet "description" s'il existe pour charger le contenu
        try {
          const descTab = await page.$('[class*="detail"][class*="tab"], [data-tab="detail"], .tab-title:has-text("详情"), .tab-title:has-text("产品")')
          if (descTab) {
            await descTab.click()
            await page.waitForTimeout(2000)
          }
        } catch {}

      const data = await page.evaluate(() => {
        const result: any = {
          gallery: [],
          features: [],
          specifications: {},
          variantGroups: [],
        }

        // ===== TITRE =====
        // Méthode 1: JSON-LD
        try {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]')
          for (const script of scripts) {
            const jsonLd = JSON.parse(script.textContent || '')
            const product = Array.isArray(jsonLd) ? jsonLd.find((d: any) => d['@type'] === 'Product') : jsonLd
            if (product?.name && product.name.length > 5) {
              result.name = product.name.trim()
              // JSON-LD images souvent les meilleures
              if (product.image) {
                const imgs = Array.isArray(product.image) ? product.image : [product.image]
                imgs.forEach((img: string) => {
                  if (typeof img === 'string' && img.startsWith('http')) result.gallery.push(img)
                })
              }
              // JSON-LD price
              if (product.offers?.price) {
                result.price1688 = parseFloat(product.offers.price)
              }
              break
            }
          }
        } catch {}

        // Méthode 2: og:title
        if (!result.name) {
          const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content')
          if (ogTitle && ogTitle.length > 5) result.name = ogTitle.trim()
        }

        // Méthode 3: h1
        if (!result.name) {
          const h1 = document.querySelector('h1')
          if (h1) {
            const clean = (h1.textContent || '').replace(/1688\.com/g, '').replace(/\s+/g, ' ').trim()
            if (clean.length > 5 && clean.length < 300) result.name = clean
          }
        }
        if (!result.name || result.name.length < 3) result.name = 'Produit 1688'

        // ===== PRIX (avec paliers) =====
        if (!result.price1688) {
          const priceSelectors = [
            '.price-now .price-num', '.price .price-num', '.offer-price',
            '[class*="price"] [class*="num"]', '[class*="Price"] [class*="Num"]',
            '.mod-detail-price .price', '[data-price]'
          ]
          for (const sel of priceSelectors) {
            const el = document.querySelector(sel)
            if (el?.textContent) {
              const m = el.textContent.match(/(\d+(?:\.\d+)?)/)
              if (m) { result.price1688 = parseFloat(m[1]); break }
            }
          }
        }
        // Fallback: chercher ¥ dans le body
        if (!result.price1688) {
          const bodyText = document.body.innerText.slice(0, 3000)
          const m = bodyText.match(/¥\s*(\d+(?:\.\d+)?)/)
          if (m) result.price1688 = parseFloat(m[1])
        }

        // ===== IMAGES (haute résolution) =====
        // Collecter toutes les images CDN 1688/alibaba
        const collectImages = (selectors: string[]) => {
          const imgs = new Set<string>()
          for (const sel of selectors) {
            document.querySelectorAll(sel).forEach(el => {
              const tag = el.tagName.toLowerCase()
              let src = ''
              if (tag === 'img') {
                src = el.getAttribute('src') || el.getAttribute('data-src') || el.getAttribute('data-lazy-src') || ''
              } else {
                // Div avec background-image
                const bg = (el as HTMLElement).style?.backgroundImage
                if (bg) {
                  const m = bg.match(/url\(["']?([^"')]+)/)
                  if (m) src = m[1]
                }
              }
              if (!src) return
              // Normaliser: supprimer les suffixes de resize pour avoir la HD
              src = src.replace(/_\d+x\d+[^.]*/, '').replace(/\.\d+x\d+\./, '.')
              // Accepter uniquement les images CDN Alibaba/1688
              if (/(cbu\d*|img|gw)\.alicdn\.com/i.test(src) || /1688\.com/i.test(src)) {
                // Assurer URL absolue
                if (src.startsWith('//')) src = 'https:' + src
                imgs.add(src)
              }
            })
            if (imgs.size >= 10) break
          }
          return Array.from(imgs)
        }

        const galleryImages = collectImages([
          '.detail-gallery img, .detail-gallery [style*="background"]',
          '.offer-img img',
          '.main-image img, .main-image [style*="background"]',
          '[class*="gallery"] img, [class*="Gallery"] img',
          '[class*="slider"] img, [class*="Slider"] img',
          '[class*="thumb"] img, [class*="Thumb"] img',
          '.tab-content img',
        ])
        
        // Aussi récupérer les images de la description (produit en contexte)
        const descImages = collectImages([
          '.detail-desc img, [class*="detailDesc"] img, [class*="DetailDesc"] img',
          '[class*="description"] img, [class*="Description"] img',
          '#desc img, #detail img',
        ])
        
        // Merger: gallery d'abord, puis description, dédoublonner
        const allImgs = [...new Set([...result.gallery, ...galleryImages, ...descImages])].slice(0, 20)
        result.gallery = allImgs

        // og:image fallback
        if (result.gallery.length === 0) {
          const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content')
          if (ogImg) {
            let src = ogImg
            if (src.startsWith('//')) src = 'https:' + src
            result.gallery = [src]
          }
        }
        result.image = result.gallery[0]

        // ===== DESCRIPTION =====
        const descSelectors = [
          '.detail-desc', '[class*="detailDesc"]', '[class*="DetailDesc"]',
          '[class*="description"]', '[class*="Description"]',
          '#desc', '#detail', '.offer-detail',
          '.content-detail', '[class*="offerDetail"]',
        ]
        for (const sel of descSelectors) {
          const el = document.querySelector(sel)
          if (el) {
            // Extraire le texte brut (pas le HTML)
            const text = (el as HTMLElement).innerText?.trim()
            if (text && text.length > 20) {
              // Nettoyer: limiter à 2000 caractères, supprimer lignes vides multiples
              result.description = text
                .replace(/\n{3,}/g, '\n\n')
                .replace(/\t/g, ' ')
                .slice(0, 2000)
                .trim()
              break
            }
          }
        }

        // ===== VARIANTES =====
        const skuSelectors = [
          '.sku-item', '.offer-sku', '[class*="sku"] li', '[class*="Sku"] li',
          '.prop-item', '[class*="variant"] li'
        ]
        const variants: any[] = []
        for (const sel of skuSelectors) {
          document.querySelectorAll(sel).forEach((item, idx) => {
            const name = item.textContent?.trim()
            const img = item.querySelector('img')?.getAttribute('src') || item.querySelector('img')?.getAttribute('data-src')
            if (name && name.length > 0 && name.length < 80) {
              let imgUrl = img || undefined
              if (imgUrl?.startsWith('//')) imgUrl = 'https:' + imgUrl
              variants.push({ id: `sku-${idx}`, name, image: imgUrl, isDefault: idx === 0 })
            }
          })
          if (variants.length > 0) break
        }
        if (variants.length > 0) {
          result.variantGroups = [{ name: 'Modèle', variants: variants.slice(0, 30) }]
        }

        // ===== MOQ =====
        const moqSelectors = ['.moq-info', '[class*="moq"]', '.min-order', '.offer-quantity', '[class*="MinOrder"]']
        for (const sel of moqSelectors) {
          const el = document.querySelector(sel)
          if (el?.textContent) {
            const m = el.textContent.match(/(\d+)\s*(?:件|个|pcs|pi[eè]ces?|unit)/i)
            if (m) { result.moq = parseInt(m[1]); break }
          }
        }
        if (!result.moq) {
          const bodyText = document.body.innerText.slice(0, 5000)
          const m = bodyText.match(/(?:起订|最少订购|minimum)[^\d]*(\d+)/i)
          if (m) result.moq = parseInt(m[1])
        }

        // ===== FOURNISSEUR =====
        const supplierSels = '.company-name, .supplier-name, [class*="company"], [class*="Company"], [class*="shopName"], [class*="StoreName"]'
        const supplierName = document.querySelector(supplierSels)?.textContent?.trim()
        if (supplierName && supplierName.length < 100) {
          const locEl = document.querySelector('.company-location, [class*="location"], [class*="Location"]')
          const yearsEl = document.querySelector('[class*="year"]')
          result.supplier = {
            name: supplierName,
            location: locEl?.textContent?.trim() || 'Chine',
            verified: document.querySelector('[class*="verified"], [class*="Verified"], [class*="trust"]') !== null,
            yearsInBusiness: yearsEl?.textContent ? parseInt(yearsEl.textContent.match(/(\d+)/)?.[1] || '0') : 0,
            rating: 0,
            transactions: 0,
            responseTime: '',
          }
        }

        // ===== SPÉCIFICATIONS =====
        const specSelectors = [
          '.offer-attr-row', '.parameter-row', 
          '[class*="attr"] tr', '[class*="Attr"] tr',
          '[class*="param"] tr', '[class*="Param"] tr',
          '[class*="spec"] tr', '[class*="Spec"] tr',
          '.detail-attribute tr', '.product-param tr'
        ]
        for (const sel of specSelectors) {
          document.querySelectorAll(sel).forEach(row => {
            const cells = row.querySelectorAll('td, th, .attr-name, .attr-value, span')
            if (cells.length >= 2) {
              const key = cells[0].textContent?.trim()
              const value = cells[1].textContent?.trim()
              if (key && value && key.length < 60 && value.length < 300) {
                result.specifications[key] = value
              }
            }
          })
        }

        // ===== POIDS & DIMENSIONS depuis specs =====
        let weightKg = 0, lengthCm = 0, widthCm = 0, heightCm = 0
        for (const [key, value] of Object.entries(result.specifications)) {
          const k = key.toLowerCase()
          const v = String(value)
          // Poids
          if (k.includes('重量') || k.includes('weight') || k.includes('毛重') || k.includes('净重')) {
            const mKg = v.match(/(\d+(?:\.\d+)?)\s*(?:kg|千克)/i)
            if (mKg) { weightKg = parseFloat(mKg[1]); continue }
            const mG = v.match(/(\d+(?:\.\d+)?)\s*(?:g|克)/i)
            if (mG) { weightKg = parseFloat(mG[1]) / 1000; continue }
          }
          // Dimensions (LxWxH)
          if (k.includes('尺寸') || k.includes('大小') || k.includes('dimension') || k.includes('size') || k.includes('规格') || k.includes('长宽高')) {
            // Format: 30x20x15 cm ou 30*20*15cm
            const mDim = v.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i)
            if (mDim) {
              let l = parseFloat(mDim[1]), w = parseFloat(mDim[2]), h = parseFloat(mDim[3])
              // Si en mm, convertir en cm
              if (v.toLowerCase().includes('mm') && l > 100) { l /= 10; w /= 10; h /= 10 }
              lengthCm = l; widthCm = w; heightCm = h
              continue
            }
          }
        }

        // Fallback poids depuis texte général
        if (!weightKg) {
          const bodyText = document.body.innerText.slice(0, 8000)
          const wm = bodyText.match(/(?:重量|毛重|净重|weight)[\s:]*?(\d+(?:\.\d+)?)\s*(?:kg|千克)/i)
          if (wm) weightKg = parseFloat(wm[1])
          if (!weightKg) {
            const wg = bodyText.match(/(?:重量|毛重|净重|weight)[\s:]*?(\d+(?:\.\d+)?)\s*(?:g|克)/i)
            if (wg) weightKg = parseFloat(wg[1]) / 1000
          }
        }

        // Valeurs par défaut (seulement si pas trouvé de vraies valeurs)
        result.category = 'Catalogue import Chine'
        result.tagline = 'Import 1688'
        result.currency = 'FCFA'
        result.price1688Currency = 'CNY'
        result.exchangeRate = 100
        result.weightKg = weightKg > 0 ? Number(weightKg.toFixed(2)) : 1
        result.lengthCm = lengthCm > 0 ? Math.round(lengthCm) : 10
        result.widthCm = widthCm > 0 ? Math.round(widthCm) : 10
        result.heightCm = heightCm > 0 ? Math.round(heightCm) : 10

        const hasRealDims = weightKg > 0 || (lengthCm > 0 && widthCm > 0 && heightCm > 0)
        result.availabilityNote = hasRealDims
          ? `Import 1688 — poids: ${result.weightKg}kg, dimensions: ${result.lengthCm}×${result.widthCm}×${result.heightCm}cm`
          : 'Import 1688 — vérifier poids/dimensions avant transport'

        // Features enrichies
        result.features = [
          result.moq ? `MOQ: ${result.moq} unités` : null,
          result.supplier?.name ? `Fournisseur: ${result.supplier.name}` : null,
          weightKg > 0 ? `Poids: ${result.weightKg}kg` : null,
          (lengthCm > 0 && widthCm > 0 && heightCm > 0) ? `Dimensions: ${result.lengthCm}×${result.widthCm}×${result.heightCm}cm` : null,
          Object.keys(result.specifications).length > 0 ? `${Object.keys(result.specifications).length} spécifications` : null,
          result.price1688 ? `Prix usine: ¥${result.price1688}` : null,
        ].filter(Boolean) as string[]

        return result
      })

      return {
        ...data,
        productUrl: url,
      } as Product1688
    })
  }

  async scrapeAliExpress(url: string): Promise<ScrapingResult<ProductAliExpress>> {
    return this.scrapeWithRetry(url, async (page) => {
      // Attente spécifique AliExpress
      await page.waitForSelector('[data-pl="product-title"], h1', { timeout: 10000 })

      const data = await page.evaluate(() => {
        const result: Partial<ProductAliExpress> = {
          gallery: [],
          features: [],
          shipping: [],
        }

        // Titre
        const titleEl = document.querySelector('[data-pl="product-title"], h1, .product-title')
        result.name = titleEl?.textContent?.trim() || 'Produit AliExpress'

        // Prix
        const priceSelectors = [
          '[data-pl="product-price"]',
          '.product-price-value',
          '[class*="price"] [class*="current"]',
          '.price-current',
        ]
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector)
          if (el?.textContent) {
            const match = el.textContent.replace(/[^\d.,]/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/)
            if (match) {
              result.price = parseFloat(match[1])
              break
            }
          }
        }

        // Images
        const imgSelectors = [
          '.gallery-image',
          '.magnifier-image img',
          '[class*="gallery"] img',
          '.image-viewer img',
        ]
        for (const selector of imgSelectors) {
          const imgs = document.querySelectorAll(selector)
          imgs.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src')
            if (src && src.includes('aliexpress')) {
              result.gallery!.push(src.replace(/_\d+x\d+/, ''))
            }
          })
          if (result.gallery!.length > 0) break
        }
        result.image = result.gallery?.[0]

        // Boutique
        result.shopName = document.querySelector('.shop-name, .store-name, [class*="shop"]')?.textContent?.trim()
        
        // Rating
        const ratingEl = document.querySelector('.rating-value, [class*="rating"]')
        if (ratingEl?.textContent) {
          const match = ratingEl.textContent.match(/(\d\.\d)/)
          if (match) result.rating = parseFloat(match[1])
        }

        // Commandes
        const ordersEl = document.querySelector('[class*="orders"], [class*="sold"]')
        if (ordersEl?.textContent) {
          const match = ordersEl.textContent.replace(/[^\d]/g, '').match(/(\d+)/)
          if (match) result.orders = parseInt(match[1])
        }

        // Avis
        const reviewsEl = document.querySelector('[class*="reviews"], [class*="feedback"]')
        if (reviewsEl?.textContent) {
          const match = reviewsEl.textContent.replace(/[^\d]/g, '').match(/(\d+)/)
          if (match) result.totalRated = parseInt(match[1])
        }

        // Features
        const featureSelectors = [
          '.product-feature',
          '.property-item',
          '[class*="feature"]',
        ]
        for (const selector of featureSelectors) {
          const items = document.querySelectorAll(selector)
          items.forEach(item => {
            const text = item.textContent?.trim()
            if (text && text.length > 3 && text.length < 100) {
              result.features!.push(text)
            }
          })
          if (result.features!.length > 0) break
        }

        // Variantes
        const variantSelectors = [
          '.sku-item',
          '.product-sku',
          '[class*="variant"]',
        ]
        const variants: any[] = []
        for (const selector of variantSelectors) {
          const items = document.querySelectorAll(selector)
          items.forEach(item => {
            const name = item.textContent?.trim()
            const img = item.querySelector('img')?.getAttribute('src')
            if (name && !variants.find(v => v.name === name)) {
              variants.push({ name, image: img })
            }
          })
          if (variants.length > 0) break
        }
        result.variants = variants

        // Valeurs par défaut
        result.category = 'Catalogue import Chine'
        result.tagline = 'Import AliExpress'
        result.availabilityNote = 'Import AliExpress — freight 3j/15j/60j'
        result.currency = 'FCFA'
        result.weightKg = 1

        return result as ProductAliExpress
      })

      return {
        ...data,
        productUrl: url,
      }
    })
  }

  // ======== UTILITAIRES ========

  async screenshot(url: string, path: string): Promise<void> {
    const context = await this.createContext()
    const page = await context.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.screenshot({ path, fullPage: true })
    
    await context.close()
  }

  async checkBlocking(url: string): Promise<{ blocked: boolean; reason?: string }> {
    const result = await this.scrapeWithRetry(url, async (page) => {
      const content = await page.content()
      const title = await page.title()
      
      const blockingIndicators = [
        { pattern: /captcha/i, reason: 'CAPTCHA détecté' },
        { pattern: /robot|verify|verification/i, reason: 'Vérification anti-bot' },
        { pattern: /access.*denied|403|blocked/i, reason: 'Accès bloqué' },
        { pattern: /cloudflare/i, reason: 'Protection Cloudflare' },
        { pattern: /recaptcha/i, reason: 'reCAPTCHA' },
      ]
      
      for (const indicator of blockingIndicators) {
        if (indicator.pattern.test(content) || indicator.pattern.test(title)) {
          return { blocked: true, reason: indicator.reason }
        }
      }
      
      return { blocked: false }
    }, 1)

    return result.data || { blocked: true, reason: result.error }
  }
}

// ======== API WRAPPER ========

export async function scrape1688WithBrowser(url: string): Promise<ScrapingResult<Product1688>> {
  const scraper = new BrowserScraper({ headless: true })
  
  try {
    await scraper.init()
    return await scraper.scrape1688(url)
  } finally {
    await scraper.close()
  }
}

export async function scrapeAliExpressWithBrowser(url: string): Promise<ScrapingResult<ProductAliExpress>> {
  const scraper = new BrowserScraper({ headless: true })
  
  try {
    await scraper.init()
    return await scraper.scrapeAliExpress(url)
  } finally {
    await scraper.close()
  }
}

export type { ScrapingResult, Product1688, ProductAliExpress, ScraperConfig }
