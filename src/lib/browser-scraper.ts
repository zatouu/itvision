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
        }, { timeout: 15000 })
        
        // Attente supplémentaire pour React/Vue hydration
        await page.waitForTimeout(2000)

      const data = await page.evaluate(() => {
        const result: Partial<Product1688> = {
          gallery: [],
          features: [],
          specifications: {},
          variantGroups: [],
        }

        // Titre - méthode 1: JSON-LD (le plus fiable)
        try {
          const jsonLd = document.querySelector('script[type="application/ld+json"]')?.textContent
          if (jsonLd) {
            const data = JSON.parse(jsonLd)
            const product = Array.isArray(data) ? data.find(d => d['@type'] === 'Product') : data
            if (product?.name && product.name.length > 5) {
              result.name = product.name
            }
          }
        } catch (e) {}

        // Titre - méthode 2: meta tags
        if (!result.name) {
          result.name = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                       document.querySelector('meta[name="title"]')?.getAttribute('content') || undefined
        }

        // Titre - méthode 3: h1 avec filtres
        if (!result.name) {
          const h1 = document.querySelector('h1')
          if (h1) {
            const text = h1.textContent?.trim() || ''
            // Nettoyer le titre
            const clean = text
              .replace(/1688\.com/g, '')
              .replace(/阿里巴巴/g, '')
              .replace(/批发/g, '')
              .replace(/经营部/g, '')
              .replace(/公司/g, '')
              .replace(/\s+/g, ' ')
              .trim()
            if (clean.length > 5 && clean.length < 200) {
              result.name = clean
            }
          }
        }

        // Fallback
        if (!result.name || result.name.length < 5) {
          result.name = 'Produit 1688'
        }

        // Prix
        const priceSelectors = [
          '.price-now .price-num',
          '.price .price-num',
          '.offer-price',
          '[class*="price"] [class*="num"]',
          '.price-1688',
        ]
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector)
          if (el?.textContent) {
            const match = el.textContent.match(/(\d+(?:\.\d+)?)/)
            if (match) {
              result.price1688 = parseFloat(match[1])
              break
            }
          }
        }

        // Images
        const imgSelectors = [
          '.detail-gallery img',
          '.offer-img img',
          '.main-image img',
          '[class*="gallery"] img',
          '.tab-content img',
        ]
        for (const selector of imgSelectors) {
          const imgs = document.querySelectorAll(selector)
          imgs.forEach(img => {
            const src = img.getAttribute('src') || img.getAttribute('data-src')
            if (src && !src.includes('lazyload')) {
              result.gallery!.push(src.replace(/_\d+x\d+/, ''))
            }
          })
          if (result.gallery!.length > 0) break
        }
        result.image = result.gallery?.[0]

        // Variantes
        const skuSelectors = [
          '.sku-item',
          '.offer-sku',
          '[class*="sku"]',
          '.prop-item',
        ]
        const variants: any[] = []
        for (const selector of skuSelectors) {
          const items = document.querySelectorAll(selector)
          items.forEach((item, idx) => {
            const name = item.textContent?.trim()
            const img = item.querySelector('img')?.getAttribute('src')
            if (name && name.length < 50) {
              variants.push({
                id: `sku-${idx}`,
                name,
                image: img,
                isDefault: idx === 0,
              })
            }
          })
          if (variants.length > 0) break
        }
        if (variants.length > 0) {
          result.variantGroups = [{
            name: 'Modèle',
            variants,
          }]
        }

        // MOQ
        const moqSelectors = [
          '.moq-info',
          '[class*="moq"]',
          '.min-order',
          '.offer-quantity',
        ]
        for (const selector of moqSelectors) {
          const el = document.querySelector(selector)
          if (el?.textContent) {
            const match = el.textContent.match(/(\d+)\s*(?:件|个|pcs|pieces)/i)
            if (match) {
              result.moq = parseInt(match[1])
              break
            }
          }
        }

        // Fournisseur
        const supplierName = document.querySelector('.company-name, .supplier-name, [class*="company"]')?.textContent?.trim()
        if (supplierName) {
          result.supplier = {
            name: supplierName,
            location: document.querySelector('.company-location, .supplier-location, [class*="location"]')?.textContent?.trim() || 'Chine',
            verified: document.querySelector('.verified-badge, [class*="verified"]') !== null,
            yearsInBusiness: 0,
            rating: 0,
            transactions: 0,
            responseTime: '',
          }
        }

        // Spécifications
        const specRows = document.querySelectorAll('.offer-attr-row, .parameter-row, [class*="spec"] tr')
        specRows.forEach(row => {
          const cells = row.querySelectorAll('td, th, .attr-name, .attr-value')
          if (cells.length >= 2) {
            const key = cells[0].textContent?.trim()
            const value = cells[1].textContent?.trim()
            if (key && value) {
              result.specifications![key] = value
            }
          }
        })

        // Valeurs par défaut
        result.category = 'Catalogue import Chine'
        result.tagline = 'Import 1688'
        result.availabilityNote = 'Import 1688 — vérifier poids/dimensions avant transport'
        result.currency = 'FCFA'
        result.price1688Currency = 'CNY'
        result.exchangeRate = 100
        result.weightKg = 1
        result.lengthCm = 10
        result.widthCm = 10
        result.heightCm = 10

        return result as Product1688
      })

      return {
        ...data,
        productUrl: url,
      }
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
