/**
 * Service de scraping robuste via navigateur (Playwright)
 * - Anti-detection avec stealth plugins
 - Gestion des retries avec backoff exponentiel
 - Rotation de proxies
 - Extraction avancée de données
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'

interface ScraperConfig {
  headless?: boolean
  proxy?: string
  userAgent?: string
  viewport?: { width: number; height: number }
  timeout?: number
  /** Répertoire de profil Chromium persisté (cookies/session survivent entre les runs) */
  profileDir?: string
}

interface ScrapingResult<T> {
  success: boolean
  data?: T
  error?: string
  attempts: number
  durationMs: number
}

type SourcePlatform = '1688' | 'aliexpress' | 'alibaba'

interface Product1688 {
  offerId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  price1688?: number                    // prix source dans sa devise d'origine
  price1688Currency: string             // ISO: CNY=1688, USD/EUR/MAD…=AliExpress/Alibaba
  platform?: SourcePlatform             // défaut '1688' quand absent
  exchangeRate: number                  // 1 unité source → FCFA
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
  priceCurrency?: string                // devise ISO affichée sur la fiche source
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
  private persistentContext: BrowserContext | null = null
  private profileDir: string | null = null
  private config: ScraperConfig

  constructor(config: ScraperConfig = {}) {
    this.config = {
      headless: true,
      timeout: 60000,
      ...config,
    }
  }

  /**
   * Lanceur Chromium avec plugin stealth si disponible (playwright-extra),
   * sinon fallback sur playwright vanilla. Le stealth masque les empreintes
   * headless (webdriver, WebGL, fonts...) que les simples init scripts ne couvrent pas.
   */
  private async getLauncher(): Promise<typeof chromium> {
    try {
      const extra = await import('playwright-extra')
      const stealthMod = (await import('puppeteer-extra-plugin-stealth')) as { default?: () => unknown }
      const stealthFactory = stealthMod.default || (stealthMod as unknown as () => unknown)
      extra.chromium.use(stealthFactory() as never)
      return extra.chromium as unknown as typeof chromium
    } catch (e) {
      console.warn('[scraper] Stealth indisponible, fallback playwright vanilla:', (e as Error).message)
      return chromium
    }
  }

  async init(): Promise<void> {
    if (this.browser || this.persistentContext) return

    const proxy = this.config.proxy || process.env.SCRAPER_PROXY
    const profileDir = this.config.profileDir || process.env.SCRAPER_PROFILE_DIR

    const launchOptions: any = {
      headless: this.config.headless,
      // 'chromium' = vrai binaire Chrome en headless new-mode au lieu de
      // chrome-headless-shell (empreinte différente, flaggée par le 风控 1688).
      channel: 'chromium',
      // --enable-automation est ajouté par défaut par Playwright et rend le
      // navigateur détectable immédiatement par les anti-bots (1688, Taobao).
      ignoreDefaultArgs: ['--enable-automation'],
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

    if (proxy) {
      launchOptions.proxy = { server: proxy }
    }

    const launcher = await this.getLauncher()

    // Profil persisté : cookies/session (ex. login 1688) réutilisés entre les runs.
    // Indispensable contre les murs de login — une connexion manuelle reste valable.
    if (profileDir) {
      // Un navigateur zombie tenant le profil lock la base Cookies : la session
      // tomberait silencieusement en mémoire et rien ne persisterait.
      try {
        const cookiesDb = path.join(profileDir, 'Default', 'Network', 'Cookies')
        if (fsSync.existsSync(cookiesDb)) fsSync.closeSync(fsSync.openSync(cookiesDb, 'r+'))
      } catch {
        console.warn('[scraper] Profil verrouillé par un process zombie — la session ne persistera pas')
      }
      // UA FIXE avec profil persisté : la session login est liée à l'empreinte
      // navigateur — un UA aléatoire à chaque run invaliderait les cookies.
      const userAgent = this.config.userAgent ||
        process.env.SCRAPER_USER_AGENT ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      const viewport = this.config.viewport ||
        DEFAULT_VIEWPORTS[Math.floor(Math.random() * DEFAULT_VIEWPORTS.length)]

      this.profileDir = profileDir
      try {
        this.persistentContext = await launcher.launchPersistentContext(profileDir, {
          ...launchOptions,
          userAgent,
          viewport,
          locale: 'fr-FR',
          timezoneId: 'Europe/Paris',
          colorScheme: 'light',
        })
        await this.patchContext(this.persistentContext)
        await this.restoreSessionCookies()
        return
      } catch {
        // Profil tenu par un process actif (worker, fenêtre login) :
        // naviguer sans le profil mais restaurer la session depuis
        // storage-state.json — lecture seule, rien ne re-persiste.
        console.warn('[scraper] Profil occupé — mode mémoire, session restaurée depuis storage-state.json')
      }
    }

    this.browser = await launcher.launch(launchOptions)
  }

  /**
   * Chromium supprime les cookies de session (cookie2, _tb_token_… — justement
   * ceux du login 1688) au redémarrage. On contourne en exportant l'état complet
   * vers storage-state.json à la fermeture et en le réinjectant à l'init.
   */
  private stateFile(): string {
    return path.join(this.profileDir!, 'storage-state.json')
  }

  private async restoreSessionCookies(target?: BrowserContext): Promise<void> {
    const ctx = target || this.persistentContext
    if (!ctx || !this.profileDir) return
    try {
      const raw = await fs.readFile(this.stateFile(), 'utf8')
      const state = JSON.parse(raw) as { cookies?: Array<Record<string, unknown>> }
      const cookies = (state.cookies || [])
        .filter((c) => typeof c.name === 'string' && typeof c.value === 'string')
        .map((c) => {
          const out = { ...c }
          if (typeof out.expires === 'number' && out.expires <= 0) delete out.expires
          return out
        })
      if (cookies.length) {
        await ctx.addCookies(cookies as never)
      }
    } catch {
      // Pas d'état sauvegardé (premier run) ou fichier corrompu — on continue.
    }
  }

  async close(): Promise<void> {
    if (this.persistentContext) {
      try {
        await this.persistentContext.storageState({ path: this.stateFile() })
      } catch {
        // Contexte déjà fermé ou mort — le profil garde au moins les cookies datés.
      }
      await this.persistentContext.close()
      this.persistentContext = null
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  private async createContext(): Promise<BrowserContext> {
    if (this.persistentContext) return this.persistentContext
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

    await this.patchContext(context)
    // Profil persisté demandé mais indisponible → la session sauvegardée
    // (storage-state.json) est injectée dans ce contexte mémoire.
    if (this.profileDir && !this.persistentContext) {
      await this.restoreSessionCookies(context)
    }
    return context
  }

  private async patchContext(context: BrowserContext): Promise<void> {
    // Inject script pour masquer automation
    await context.addInitScript(() => {
      // Workaround tsx/esbuild + Playwright: __name helper injecté par le transpileur
      // n'est pas défini dans le contexte de la page
      // @ts-expect-error playwright page globals
      if (typeof window.__name === 'undefined') {
        // @ts-expect-error playwright page globals
        window.__name = (func: unknown) => func
      }

      // Masquer les propriétés automation
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] })
      
      // Masquer chrome.runtime
      // @ts-expect-error playwright page globals
      window.chrome = { runtime: {} }
      
      // Masquer permissions
      const originalQuery = window.navigator.permissions.query
      // @ts-expect-error playwright page globals
      window.navigator.permissions.query = (parameters: any) => 
        parameters.name === 'notifications' 
          ? Promise.resolve({ state: Notification.permission })
          : originalQuery(parameters)
    })
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

      // Bloquer les ressources lourdes inutiles pour l'extraction (vidéos,
      // fonts) et les trackers analytics. Les images restent chargées :
      // les bloquer déclenche une re-navigation sur 1688 (testé).
      await page.route('**/*', (route) => {
        const req = route.request()
        const type = req.resourceType()
        if (type === 'media' || type === 'font') return route.abort()
        if (/analytics|track|beacon|log\.|mmstat|go{{0}}83|umeng|atool/i.test(req.url())) return route.abort()
        return route.continue()
      })

      try {
        // Navigation : domcontentloaded est plus robuste que networkidle sur 1688/AE
        // (beaucoup de requêtes analytics/temps réel empêchent networkidle de se déclencher)
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout,
        })

        // Attendre que le contenu principal se stabilise
        await page.waitForTimeout(2000 + Math.random() * 1500)

        // Scroll progressif pour déclencher lazy-load
        await this.humanScroll(page)

        // Extraction des données
        const data = await extractor(page)

        // Contexte persisté : on ferme seulement l'onglet, la session survit
        if (this.persistentContext) await page.close()
        else await context.close()

        return {
          success: true,
          data,
          attempts: attempt,
          durationMs: Date.now() - startTime,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (this.persistentContext) await page.close().catch(() => {})
        else await context.close()

        // Offre délistée / page explicitement morte : retenter ne sert à rien.
        if (lastError.message.startsWith('DELISTED:')) break

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

  /**
   * Recherche 1688 → URLs d'offres. Utilisé par l'agent de veille sourcing.
   * 1688 sert parfois un mur de login/CAPTCHA sur la recherche anonyme :
   * le profil persisté + une session authentifiée réduisent fortement ce cas.
   */
  async search1688(query: string, limit = 20): Promise<ScrapingResult<string[]>> {
    const endpoints = [
      `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(query)}`,
      `https://s.1688.com/search/offer_search.htm?keywords=${encodeURIComponent(query)}`,
    ]

    let lastResult: ScrapingResult<string[]> | null = null
    for (const searchUrl of endpoints) {
      const result = await this.scrapeWithRetry(searchUrl, async (page) => {
        // Les liens d'offres apparaissent après le rendu JS de la grille résultats
        await page.waitForSelector('a[href*="detail.1688.com/offer/"], a[href*="//detail.1688.com"]', {
          timeout: 15000,
        }).catch(() => {})

        const rawUrls = await page.$$eval(
          'a[href*="detail.1688.com/offer/"], a[href*="/offer/"]',
          (els) => els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean)
        )

        const seen = new Set<string>()
        const urls: string[] = []
        for (const u of rawUrls) {
          const m = u.match(/offer\/(\d+)\.html/)
          if (!m || seen.has(m[1])) continue
          seen.add(m[1])
          urls.push(`https://detail.1688.com/offer/${m[1]}.html`)
          if (urls.length >= limit) break
        }
        if (urls.length === 0) {
          // Page sans offres = probablement bloquée (login wall / CAPTCHA)
          const title = await page.title().catch(() => '')
          throw new Error(`SEARCH_EMPTY: aucune offre extraite (${title || 'page vide'})`)
        }
        return urls
      }, 2)

      lastResult = result
      if (result.success) return result
    }
    return lastResult || { success: false, error: 'Recherche échouée', attempts: 0, durationMs: 0 }
  }

  /**
   * Recherche Alibaba.com → URLs product-detail. La page /trade/search
   * sert une « punish page » au fetch nu après quelques requêtes ; le
   * navigateur réel passe beaucoup mieux. Extraction des liens SSR.
   */
  async searchAlibaba(query: string, limit = 20): Promise<ScrapingResult<string[]>> {
    const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`
    return this.scrapeWithRetry(searchUrl, async (page) => {
      await page.waitForSelector('a[href*="product-detail"]', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2000)

      const rawUrls = await page.$$eval(
        'a[href*="alibaba.com/product-detail/"], a[href*="/product-detail/"]',
        (els) => els.map((el) => (el as HTMLAnchorElement).href).filter(Boolean)
      )
      const seen = new Set<string>()
      const urls: string[] = []
      for (const u of rawUrls) {
        const m = u.match(/product-detail\/([^\s"'<>&?]+?_\d+\.html)/)
        if (!m || seen.has(m[1])) continue
        seen.add(m[1])
        urls.push(`https://www.alibaba.com/product-detail/${m[1]}`)
        if (urls.length >= limit) break
      }
      if (urls.length === 0) {
        const title = await page.title().catch(() => '')
        throw new Error(`SEARCH_EMPTY: aucun produit Alibaba (${title || 'page vide'})`)
      }
      return urls
    }, 2)
  }

  async scrape1688(url: string, maxRetries = 3): Promise<ScrapingResult<Product1688>> {
    return this.scrapeWithRetry(url, async (page) => {
        // Offre délistée/retirée : page 200 mais sans prix — fréquent sur les
        // URLs remontées par les moteurs (index contient des offres mortes).
        const bodyStart = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '')
        if (/商品已下架|已下架|该商品不存在|商品不存在|页面不存在|很抱歉.*该宝贝/.test(bodyStart)) {
          throw new Error('DELISTED: offre retirée du catalogue 1688')
        }

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

        // Méthode 3: document.title — format 1688 : "Nom produit - 阿里巴巴"
        if (!result.name && document.title) {
          const clean = document.title
            .replace(/[-—_].*(阿里巴巴|1688\.com).*$/i, '')
            .replace(/\s+/g, ' ')
            .trim()
          if (clean.length > 5 && clean.length < 300) result.name = clean
        }

        // Méthode 4: titre produit dans la zone offre (le h1 générique = nom du
        // FOURNISSEUR sur 1688 — on évite les h1 hors zone produit)
        if (!result.name) {
          const titleSel = ['.offer-title', '#mod-detail-title', '[class*="offer-title"]', '[class*="OfferTitle"]', '.title-text']
          for (const sel of titleSel) {
            const el = document.querySelector(sel)
            const clean = (el?.textContent || '').replace(/1688\.com/g, '').replace(/\s+/g, ' ').trim()
            if (clean.length > 5 && clean.length < 300) { result.name = clean; break }
          }
        }
        // Dernier recours : h1, mais uniquement s'il ne ressemble pas à un nom
        // d'entreprise (contient 公司/co./ltd/company = fournisseur, pas produit)
        if (!result.name) {
          const h1 = document.querySelector('h1')
          if (h1) {
            const clean = (h1.textContent || '').replace(/1688\.com/g, '').replace(/\s+/g, ' ').trim()
            const looksLikeCompany = /公司|co\.?\s*ltd|company|factory|厂/i.test(clean)
            if (clean.length > 5 && clean.length < 300 && !looksLikeCompany) result.name = clean
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
          const bodyText = document.body.innerText.slice(0, 8000)
          const m = bodyText.match(/[¥￥]\s*(\d+(?:\.\d+)?)/)
          if (m) result.price1688 = parseFloat(m[1])
        }
        // Fallback: prix dans le JSON embarqué de la page (le prix se charge
        // souvent en JS — discountPriceRanges / skuPriceMap / priceInfo…)
        if (!result.price1688) {
          const html = document.documentElement.innerHTML
          const embeddedPatterns = [
            /"discountPriceRanges"\s*:\s*\[\s*\{[^}]*?"price"\s*:\s*"?(\d+(?:\.\d+)?)/,
            /"priceRanges?"\s*:\s*\[\s*\{[^}]*?"price"\s*:\s*"?(\d+(?:\.\d+)?)/,
            /"skuPriceMap"\s*:\s*\{[^}]*?"price"\s*:\s*"?(\d+(?:\.\d+)?)/,
            /"(?:salePrice|currentPrice|consignPrice|offerPrice|promotionPrice)"\s*:\s*"?(\d+(?:\.\d+)?)/,
          ]
          for (const re of embeddedPatterns) {
            const m = html.match(re)
            if (m) {
              const v = parseFloat(m[1])
              if (v > 0 && v < 1000000) { result.price1688 = v; break }
            }
          }
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
        result.platform = '1688'
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
    }, maxRetries)
  }

  async scrapeAliExpress(url: string, maxRetries = 3): Promise<ScrapingResult<ProductAliExpress>> {
    return this.scrapeWithRetry(url, async (page) => {
      // Forcer USD : AliExpress localise la devise par geo-IP (MAD etc.).
      // Cookie standard du groupe Alibaba — si ignoré, la devise affichée
      // est détectée à l'extraction.
      await page.context().addCookies([{
        name: 'aep_usuc_f',
        value: 'site=glo&c_tp=USD&region=US&b_locale=en_US',
        domain: '.aliexpress.com',
        path: '/',
      }]).catch(() => {})

      // Le contenu produit AE rend tardivement (challenge JS discret) :
      // on attend un signal produit jusqu'à ~22s avec scroll doux —
      // sans jamais throw : on extrait ce qui est là.
      const t0 = Date.now()
      while (Date.now() - t0 < 22000) {
        const ready = await page.evaluate(() => {
          const t = document.querySelector('[data-pl="product-title"], h1.product-title, h1')?.textContent?.trim() || ''
          const hasPrice = !!document.querySelector('[data-pl="product-price"], .product-price-value, [class*="price--current"], [class*="Price--current"]')
          return (t.length > 10 && !/^aliexpress$/i.test(t)) || (t.length > 10 && hasPrice)
        }).catch(() => false)
        if (ready) break
        await page.mouse.wheel(0, 600).catch(() => {})
        await page.waitForTimeout(1500)
      }

      const data = await page.evaluate(() => {
        const result: Partial<ProductAliExpress> = {
          gallery: [],
          features: [],
          shipping: [],
        }

        // Titre : DOM → document.title (le h1 peut rester « Aliexpress » générique)
        const titleEl = document.querySelector('[data-pl="product-title"], h1.product-title, h1')
        let name = titleEl?.textContent?.trim() || ''
        if (name.length < 10 || /^aliexpress$/i.test(name)) {
          name = document.title.replace(/\s*[-–|]\s*AliExpress.*$/i, '').trim()
        }
        result.name = name || 'Produit AliExpress'

        // Prix : sélecteurs DOM → JSON embarqué (runParams / __AER_DATA__).
        // Devise affichée détectée (geo-IP peut servir MAD, EUR…).
        const detectCur = (raw: string): string | undefined => {
          const m = raw.match(/\b(USD|EUR|CNY|MAD|XOF|XAF|GBP|AED|SAR)\b/i)
          if (m) return m[1].toUpperCase()
          if (/€/.test(raw)) return 'EUR'
          if (/¥|￥/.test(raw)) return 'CNY'
          if (/US\$|\$/.test(raw)) return 'USD'
          return undefined
        }
        const priceSelectors = [
          '[data-pl="product-price"]',
          '.product-price-value',
          '[class*="price--current"], [class*="Price--current"]',
          '[class*="price"] [class*="current"]',
          '.price-current',
        ]
        for (const selector of priceSelectors) {
          const el = document.querySelector(selector)
          if (el?.textContent) {
            const match = el.textContent.replace(/[^\d.,]/g, '').replace(',', '.').match(/(\d+(?:\.\d+)?)/)
            if (match) {
              result.price = parseFloat(match[1])
              result.priceCurrency = detectCur(el.textContent)
              break
            }
          }
        }
        // Fallback : JSON embarqué (runParams / __AER_DATA__) — le prix y est
        // présent même quand le module visuel n'a pas fini de rendre.
        if (!result.price) {
          const html = document.documentElement.innerHTML
          const jm = html.match(/"(?:formatedActivityPrice|formatedPrice|salePrice|minActivityAmount)"\s*:\s*"(?:[^"\d]*?)([\d.,]+)"/)
            || html.match(/"value"\s*:\s*"?([\d.]+)"?/g)?.[0]?.match(/([\d.]+)/)
          if (jm) {
            result.price = parseFloat(jm[1].replace(',', '.'))
            const curM = jm[0].match(/\b(USD|EUR|CNY|MAD)\b/i)
            result.priceCurrency = curM ? curM[1].toUpperCase() : 'USD'
          }
        }
        // Fallback devise : code ISO dominant dans la page
        if (result.price && !result.priceCurrency) {
          const html = document.documentElement.innerHTML
          const cm = html.match(/\b(USD|EUR|MAD)\b/)
          result.priceCurrency = cm?.[1] || (html.includes('€') ? 'EUR' : 'USD')
        }

        // Images — CDN images du groupe : alicdn (ae01…) ou aliexpress-media
        // (ae-pic-a1…). Les URLs portent des suffixes de transformation
        // (…jpg_220x220q75.jpg_.avi) → on tronque à la 1re extension image.
        const seenImg = new Set<string>()
        const cleanImg = (u: string): string | null => {
          const m = u.match(/^(https?:)?\/\/[^"'\s]+?\.(?:jpg|jpeg|png|webp)/i)
          if (!m) return null
          return m[0].startsWith('//') ? 'https:' + m[0] : m[0]
        }
        const pushImg = (src: string | null | undefined) => {
          if (!src || !/alicdn\.com|aliexpress-media\.com/i.test(src)) return
          const full = cleanImg(src)
          if (full && !seenImg.has(full)) {
            seenImg.add(full)
            result.gallery!.push(full)
          }
        }
        document.querySelectorAll('img').forEach((img) => {
          pushImg(img.getAttribute('src') || img.getAttribute('data-src'))
        })
        // Fallback : images dans le JSON embarqué (lazy-load = src souvent
        // vide au moment de l'éval ; __AER_DATA__/runParams les contient)
        if (!result.gallery!.length) {
          const html = document.documentElement.innerHTML
          const jsonImgs = html.match(/"imagePathList"\s*:\s*\[([^\]]*)\]/)?.[1]
            || html.match(/"images"\s*:\s*\[([^\]]*(?:alicdn|aliexpress-media)[^\]]*)\]/)?.[1]
          jsonImgs?.match(/"([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi)?.forEach((m) => {
            pushImg(m.slice(1, -1).replace(/\\u002F/g, '/'))
          })
        }
        result.image = result.gallery?.[0]

        // Boutique — sélecteurs stricts (un [class*="shop"] attrape le header)
        result.shopName = document.querySelector('.shop-name, .store-name, [class*="storeName"], [class*="store-name"], a[href*="/store/"]')?.textContent?.trim()
        
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
    }, maxRetries)
  }

  /**
   * Fiche produit Alibaba.com (B2B). La devise affichée dépend de la
   * geo-IP (MAD vu depuis le Maghreb) : on force USD via cookie groupe
   * Alibaba + reload ; si ignoré, la devise réelle est détectée à
   * l'extraction. Échecs = erreurs opérationnelles, pas de contournement.
   */
  async scrapeAlibaba(url: string, maxRetries = 3): Promise<ScrapingResult<ProductAliExpress>> {
    return this.scrapeWithRetry(url, async (page) => {
      // Cookie devise groupe Alibaba → prix en USD déterministes
      await page.context().addCookies([{
        name: 'aep_usuc_f',
        value: 'site=usa&c_tp=USD&region=US&b_locale=en_US',
        domain: '.alibaba.com',
        path: '/',
      }]).catch(() => {})
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForSelector('h1, [class*="product-title"], [class*="ProductTitle"]', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(2000)

      const data = await page.evaluate(() => {
        const result: Partial<ProductAliExpress> = { gallery: [], features: [], shipping: [] }

        const titleEl = document.querySelector('h1, [class*="product-title"], [class*="ProductTitle"]')
        result.name = titleEl?.textContent?.trim() || document.title.split(/[-–|]/)[0].trim()

        // Prix : « US $12.50 », « MAD 78.55 », « $12.50 - $15.00 »…
        // On prend le PREMIER prix trouvé = palier au MOQ le plus bas
        // (les paliers suivants = prix dégressifs gros volumes).
        const PRICE_RE = /(?:US\s*\$|USD|\$|€|¥|MAD|AED|SAR|XOF|CFA)\s*([\d]+(?:[.,]\d+)?)/i
        const CUR_RE = /(US\s*\$|USD|\$|€|¥|MAD|AED|SAR|XOF|CFA)/i
        const normCur = (sym: string): string => {
          const s = sym.replace(/\s+/g, '').toUpperCase()
          if (s === 'US$' || s === '$' || s === 'USD') return 'USD'
          if (s === '€' || s === 'EUR') return 'EUR'
          if (s === '¥' || s === 'CNY') return 'CNY'
          if (s === 'CFA' || s === 'XAF') return 'XAF'
          return s // MAD, XOF, AED, SAR… ISO direct
        }
        const parsePrice = (t: string) => {
          const m = t.match(PRICE_RE)
          if (!m) return null
          const v = parseFloat(m[1].replace(/[\s,]/g, ''))
          if (!(v > 0)) return null
          return { value: v, currency: normCur(m[0].match(CUR_RE)![0]) }
        }
        const bodyText = document.body?.innerText || ''
        // Candidats : zones « price » puis le texte de la page (limité)
        const zones = [...document.querySelectorAll('[class*="price"], [class*="Price"], [class*="ma-ref-price"]')]
          .map((el) => el.textContent || '')
        zones.push(bodyText.slice(0, 6000))
        for (const z of zones) {
          const p = parsePrice(z)
          if (p) { result.price = p.value; result.priceCurrency = p.currency; break }
        }

        // MOQ : « 10-2,999 pieces », « MOQ: 10 pieces », « ≥3,000 pieces »
        const moqM = bodyText.match(/(\d[\d,]*)\s*[-–]\s*[\d,]+\s*(?:piece|pieces|pcs)/i)
          || bodyText.match(/MOQ[:\s]*(\d[\d,]*)/i)
          || bodyText.match(/(\d[\d,]*)\s*(?:piece|pieces|pcs)\s*\(?(?:MOQ|min)/i)
        if (moqM) result.orders = parseInt(moqM[1].replace(/,/g, '')) // MOQ côté mapping

        // Images (cdn Alibaba : sc01/02.alicdn.com, s.alicdn.com)
        const seen = new Set<string>()
        document.querySelectorAll('img').forEach((img) => {
          const src = img.getAttribute('src') || img.getAttribute('data-src')
          if (src && /alicdn\.com/i.test(src) && !seen.has(src)) {
            seen.add(src)
            result.gallery!.push(src.startsWith('//') ? 'https:' + src : src)
          }
        })
        result.image = result.gallery?.[0]

        // Fournisseur : regex « …Co., Ltd. » dans le texte → sélecteurs
        // (les sélecteurs [class*="supplier"] attrapent des liens « View more »)
        const cm = bodyText.match(/([A-Z][\w .,&'()-]{4,60}(?:Co\.,?[ ]*Ltd\.?|Company[ ]*Limited|Factory|Industrial))/)
        if (cm) result.shopName = cm[1].trim()
        if (!result.shopName) {
          const el = document.querySelector('.company-name, a[href*="company_profile"]')
          const t = el?.textContent?.trim()
          if (t && t.length > 4 && t.length < 80) result.shopName = t
        }

        result.category = 'Catalogue import Chine'
        result.tagline = 'Import Alibaba'
        result.availabilityNote = 'Import Alibaba — freight 3j/15j/60j'
        result.currency = 'FCFA'
        result.weightKg = 1
        return result as ProductAliExpress
      })

      return { ...data, productUrl: url }
    }, maxRetries)
  }

  /** Injecte l'extracteur de l'extension Chrome et retourne les données brutes */
  async scrapeWithExtension(url: string): Promise<ScrapingResult<Record<string, unknown>>> {
    return this.scrapeWithRetry(url, async (page) => {
      // Injection du script de l'extension (mode headless, chrome.runtime est masqué)
      const scriptPath = path.resolve(process.cwd(), 'extension/content.js')
      const scriptContent = await fs.readFile(scriptPath, 'utf-8')
      await page.addScriptTag({ content: scriptContent })

      // Attendre que l'IIFE s'exécute et expose window.itVisionScrape
      await page.waitForFunction(() => typeof (window as any).itVisionScrape === 'function', { timeout: 10000 })

      // L'extraction interne fait déjà du scroll profond et attend le lazy-load
      const data = await page.evaluate(async () => {
        const scrape = (window as any).itVisionScrape as () => Promise<Record<string, unknown>>
        return await scrape()
      })

      return {
        ...data,
        url,
        platform: url.includes('1688.com') ? '1688' : 'aliexpress',
      } as Record<string, unknown>
    })
  }

  // ======== UTILITAIRES ========

  /**
   * Ouvre une page dans le profil persisté (usage : login manuel 1688).
   * À utiliser avec headless:false — la session est sauvegardée au close().
   */
  async openSession(url: string): Promise<Page> {
    const context = await this.createContext()
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout })
    return page
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

/**
 * Découverte d'offres via moteurs de recherche — DDG + Bing, fetch simple,
 * pas de navigateur ni de login. `site:` + regex d'extraction paramétrables
 * pour couvrir 1688, AliExpress et Alibaba.com avec le même code.
 */
async function searchOffersViaEngines(
  query: string,
  site: string,
  offerPattern: RegExp,
  normalize: (m: RegExpMatchArray) => string,
  limit: number
): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (u: string) => {
    const m = u.match(offerPattern)
    if (m && !seen.has(m[1] || m[0])) {
      seen.add(m[1] || m[0])
      out.push(normalize(m))
    }
  }

  const q = `site:${site} ${query}`
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const html = await res.text()
      for (const m of html.matchAll(/uddg=([^&"']+)/g)) push(decodeURIComponent(m[1]))
      for (const m of html.matchAll(new RegExp(`href="(https?:\\/\\/(?:www\\.)?${site.replace(/\./g, '\\.')}\\/[^"]*)"`, 'g'))) push(m[1])
    }
  } catch {}

  if (out.length < limit) {
    try {
      const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&count=${Math.min(50, limit * 3)}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok) {
        const html = await res.text()
        const siteRe = new RegExp(`href="(https?:\\/\\/(?:www\\.)?${site.replace(/\./g, '\\.')}\\/[^"]*)"`, 'g')
        for (const m of html.matchAll(siteRe)) push(m[1])
        // Bing encapsule souvent les résultats en /ck/a?…&u=a1<base64url>
        // → décoder le param u (préfixe "a1" puis base64url de l'URL cible).
        // NB : les & du href sont échappés (&amp;u=…), d'où le pattern lâche.
        for (const m of html.matchAll(/\/ck\/a\?[^"']*?u=a1([A-Za-z0-9_-]{16,})/g)) {
          try {
            const decoded = Buffer.from(m[1], 'base64url').toString('utf8')
            if (decoded.includes(site)) push(decoded)
          } catch {}
        }
      }
    } catch {}
  }

  return out.slice(0, limit)
}

/** Classe une URL fournisseur : '1688' | 'aliexpress' | 'alibaba' | null (non supportée). */
export function classifySourceUrl(url: string): SourcePlatform | null {
  if (/detail\.1688\.com\/offer\/\d+/i.test(url)) return '1688'
  if (/aliexpress\.com\/(item|i)\/\d+/i.test(url)) return 'aliexpress'
  if (/alibaba\.com\/(product-detail|showroom)\/[^"&'\s]+/i.test(url)) return 'alibaba'
  return null
}

/** 1688 : detail.1688.com/offer/<id>.html */
export function search1688ViaEngines(query: string, limit = 20): Promise<string[]> {
  return searchOffersViaEngines(
    query, 'detail.1688.com',
    /detail\.1688\.com\/offer\/(\d+)\.html/,
    (m) => `https://detail.1688.com/offer/${m[1]}.html`,
    limit
  )
}

const ENGINE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Recherche native AliExpress — la page /wholesale est SSR pour le SEO :
 * les URLs d'items sont dans le HTML servi, pas besoin de navigateur ni
 * de login. Listings internationaux → requête EN/FR telle quelle.
 */
export async function searchAliExpressNative(query: string, limit = 20): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  try {
    const res = await fetch(`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': ENGINE_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const html = await res.text()
      for (const m of html.matchAll(/aliexpress\.com\/item\/(\d+)\.html/g)) {
        if (!seen.has(m[1])) {
          seen.add(m[1])
          out.push(`https://www.aliexpress.com/item/${m[1]}.html`)
        }
      }
    }
  } catch {}
  return out.slice(0, limit)
}

/**
 * Recherche native Alibaba.com — /trade/search est également SSR :
 * liens product-detail dans le HTML (slug complet conservé, tracking
 * ?priceId retiré). Listings B2B anglais → pas de traduction.
 */
export async function searchAlibabaNative(query: string, limit = 20): Promise<string[]> {
  const out: string[] = []
  const seen = new Set<string>()
  try {
    const res = await fetch(`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': ENGINE_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(20000),
    })
    if (res.ok) {
      const html = await res.text()
      for (const m of html.matchAll(/alibaba\.com\/product-detail\/([^\s"'<>&?]+?\.html)/g)) {
        const slug = m[1]
        if (!seen.has(slug)) {
          seen.add(slug)
          out.push(`https://www.alibaba.com/product-detail/${slug}`)
        }
      }
    }
  } catch {}
  return out.slice(0, limit)
}

/** AliExpress : aliexpress.com/item/<id>.html — listings EN/FR, pas de traduction. */
export function searchAliExpressViaEngines(query: string, limit = 20): Promise<string[]> {
  return searchOffersViaEngines(
    query, 'aliexpress.com',
    /aliexpress\.com\/item\/(\d+)\.html/,
    (m) => `https://www.aliexpress.com/item/${m[1]}.html`,
    limit
  )
}

/** Alibaba.com : www.alibaba.com/product-detail/<slug>_<id>.html — B2B wholesale. */
export function searchAlibabaViaEngines(query: string, limit = 20): Promise<string[]> {
  return searchOffersViaEngines(
    query, 'alibaba.com',
    /(alibaba\.com\/product-detail\/[^"&'\s]+_\d+\.html)/,
    (m) => `https://www.${m[1]}`,
    limit
  )
}

/**
 * Pause « humaine » entre deux actions de l'agent sourcing.
 * Un bot qui enchaîne les pages en 200ms est flaggé instantanément ;
 * un humain lit une fiche en 5-15s. Le jitter évite les patterns réguliers.
 */
export function humanDelay(minMs = 4000, maxMs = 9000): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((r) => setTimeout(r, ms))
}

export type { ScrapingResult, Product1688, ProductAliExpress, ScraperConfig, SourcePlatform }
