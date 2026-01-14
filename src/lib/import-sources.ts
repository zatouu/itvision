/**
 * Système modulaire pour supporter plusieurs sources d'import
 * Permet de basculer facilement entre RapidAPI, Apify, scraping direct, etc.
 */

export type ImportSource = 'rapidapi' | 'apify' | 'scraperapi' | 'direct' | 'affiliate'

export interface ImportConfig {
  source: ImportSource
  apiKey?: string
  endpoint?: string
  options?: Record<string, any>
}

export interface ProductSearchResult {
  items: ImportItem[]
  total?: number
  hasMore?: boolean
}

export interface ImportItem {
  productId?: string
  name: string
  productUrl: string
  image?: string
  gallery: string[]
  baseCost?: number
  price?: number
  currency: string
  weightKg?: number
  features: string[]
  category: string
  tagline: string
  availabilityNote: string
  shopName?: string
  orders?: number
  totalRated?: number
}

/**
 * Import depuis RapidAPI (actuel)
 */
export async function importFromRapidAPI(
  keyword: string,
  limit: number,
  config: ImportConfig
): Promise<ProductSearchResult> {
  const apiKey = config.apiKey || process.env.ALIEXPRESS_RAPIDAPI_KEY
  if (!apiKey) {
    throw new Error('ALIEXPRESS_RAPIDAPI_KEY est requis')
  }

  const API_HOST = 'aliexpress-datahub.p.rapidapi.com'
  const API_ENDPOINT = `https://${API_HOST}/item_search`

  const pageSize = Math.min(Math.max(limit, 1), 20)
  const query = new URLSearchParams({
    q: keyword,
    page: '1',
    page_size: String(pageSize),
    sort: 'orignalPriceDown'
  })

  const response = await fetch(`${API_ENDPOINT}?${query.toString()}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': API_HOST
    }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`RapidAPI error ${response.status}: ${body}`)
  }

  const json = await response.json()
  // Normalisation des données (à adapter selon la structure de réponse)
  return {
    items: (json.result?.items || []).map(normalizeRapidAPIItem),
    total: json.result?.total,
    hasMore: false
  }
}

/**
 * Import depuis Apify
 * Utilise l'actor Apify pour scraper AliExpress
 */
export async function importFromApify(
  keyword: string,
  limit: number,
  config: ImportConfig
): Promise<ProductSearchResult> {
  const apiKey = config.apiKey || process.env.APIFY_API_KEY
  if (!apiKey) {
    throw new Error('APIFY_API_KEY est requis. Obtenez votre clé sur https://apify.com')
  }

  // Actor Apify pour AliExpress
  // Format: username/actor-name (ex: saswave/aliexpress-scraper)
  // Vous pouvez trouver d'autres actors sur https://apify.com/store?q=aliexpress
  const actorId = config.options?.actorId || process.env.APIFY_ACTOR_ID || 'saswave/aliexpress-scraper'
  
  // Créer un run de l'actor
  // Note: L'URL doit utiliser le format correct pour les actors publics
  const actorUrl = actorId.includes('/') 
    ? `https://api.apify.com/v2/acts/${actorId}/runs`
    : `https://api.apify.com/v2/actor-tasks/${actorId}/runs`
  
  const runResponse = await fetch(actorUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startUrls: [{ 
        url: `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}` 
      }],
      maxItems: Math.min(limit, 50), // Limite Apify
      // Options communes pour les scrapers AliExpress
      searchText: keyword,
      maxProducts: Math.min(limit, 50),
      ...config.options
    })
  })

  if (!runResponse.ok) {
    const errorText = await runResponse.text()
    let errorMessage = `Apify API error ${runResponse.status}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorMessage
    } catch {
      errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`
    }
    throw new Error(`${errorMessage}. Vérifiez que l'actor "${actorId}" existe sur https://apify.com/store. Vous pouvez spécifier un autre actor via APIFY_ACTOR_ID dans .env`)
  }

  const run = await runResponse.json()
  const runId = run.data?.id
  
  if (!runId) {
    throw new Error('Impossible de créer le run Apify')
  }

  // Attendre que le run soit terminé (polling avec timeout)
  const maxWaitTime = 120000 // 2 minutes max
  const startTime = Date.now()
  let finished = false
  let attempts = 0
  const maxAttempts = 60

  while (!finished && attempts < maxAttempts && (Date.now() - startTime) < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++

    try {
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })

      if (!statusResponse.ok) {
        throw new Error(`Erreur lors de la vérification du statut: ${statusResponse.status}`)
      }

      const status = await statusResponse.json()
      const runStatus = status.data?.status

      if (runStatus === 'SUCCEEDED') {
        finished = true
      } else if (runStatus === 'FAILED' || runStatus === 'ABORTED') {
        throw new Error(`Le run Apify a échoué avec le statut: ${runStatus}`)
      }
      // Sinon, continuer à attendre (RUNNING, READY, etc.)
    } catch (error: any) {
      if (error.message.includes('échoué')) {
        throw error
      }
      // Continuer à essayer en cas d'erreur réseau temporaire
    }
  }

  if (!finished) {
    throw new Error('Timeout: le run Apify prend trop de temps')
  }

  // Récupérer les résultats depuis le dataset
  const datasetId = run.data.defaultDatasetId
  if (!datasetId) {
    throw new Error('Dataset ID introuvable dans la réponse Apify')
  }

  const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  })

  if (!resultsResponse.ok) {
    throw new Error(`Erreur lors de la récupération des résultats: ${resultsResponse.status}`)
  }

  const results = await resultsResponse.json()

  // Normaliser les résultats
  const normalizedItems = results
    .slice(0, limit)
    .map(normalizeApifyItem)
    .filter((item: any): item is ImportItem => Boolean(item && item.name && item.productUrl))

  return {
    items: normalizedItems,
    total: normalizedItems.length,
    hasMore: results.length > limit
  }
}

/**
 * Import depuis ScraperAPI
 */
export async function importFromScraperAPI(
  keyword: string,
  limit: number,
  config: ImportConfig
): Promise<ProductSearchResult> {
  const apiKey = config.apiKey || process.env.SCRAPERAPI_KEY
  if (!apiKey) {
    throw new Error('SCRAPERAPI_KEY est requis')
  }

  const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(keyword)}`
  const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(searchUrl)}&render=true`

  const response = await fetch(scraperUrl)
  if (!response.ok) {
    throw new Error(`ScraperAPI error ${response.status}`)
  }

  const html = await response.text()
  // Parser le HTML pour extraire les produits (nécessite cheerio ou similar)
  // Cette partie nécessiterait une bibliothèque de parsing HTML côté serveur
  
  return {
    items: [], // À implémenter avec un parser HTML
    total: 0,
    hasMore: false
  }
}

/**
 * Import depuis l'API Affiliate AliExpress (officielle)
 */
export async function importFromAffiliateAPI(
  keyword: string,
  limit: number,
  config: ImportConfig
): Promise<ProductSearchResult> {
  const appKey = config.apiKey || process.env.ALIEXPRESS_AFFILIATE_APP_KEY
  const appSecret = config.options?.appSecret || process.env.ALIEXPRESS_AFFILIATE_APP_SECRET
  
  if (!appKey || !appSecret) {
    throw new Error('ALIEXPRESS_AFFILIATE_APP_KEY et APP_SECRET sont requis')
  }

  // L'API Affiliate nécessite une signature et des paramètres spécifiques
  // Documentation: https://developers.aliexpress.com/en/doc.htm
  
  // Exemple simplifié (nécessite une implémentation complète de la signature)
  const params = {
    app_key: appKey,
    method: 'aliexpress.affiliate.product.query',
    keywords: keyword,
    page_size: limit,
    // ... autres paramètres
  }

  // Générer la signature (algorithme spécifique AliExpress)
  // const signature = generateSignature(params, appSecret)
  
  return {
    items: [], // À implémenter
    total: 0,
    hasMore: false
  }
}

/**
 * Fonction principale qui route vers la bonne source
 */
export async function searchProducts(
  keyword: string,
  limit: number,
  config: ImportConfig
): Promise<ProductSearchResult> {
  switch (config.source) {
    case 'rapidapi':
      return importFromRapidAPI(keyword, limit, config)
    case 'apify':
      return importFromApify(keyword, limit, config)
    case 'scraperapi':
      return importFromScraperAPI(keyword, limit, config)
    case 'affiliate':
      return importFromAffiliateAPI(keyword, limit, config)
    default:
      throw new Error(`Source d'import non supportée: ${config.source}`)
  }
}

// Fonctions de normalisation (à adapter selon la source)
function normalizeRapidAPIItem(item: any): ImportItem {
  // Implémentation existante
  return item as ImportItem
}

function normalizeApifyItem(item: any): ImportItem | null {
  // Adapter selon la structure de réponse d'Apify
  // La structure peut varier selon l'actor utilisé
  
  const FX_RATE = Number(process.env.ALIEXPRESS_USD_TO_XOF || 620)
  const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN || 30)

  // Extraire le nom
  const name = item.title || item.productTitle || item.name || item.productName
  if (!name) return null

  // Extraire l'URL
  const productUrl = item.url || item.productUrl || item.productDetailUrl || item.link
  if (!productUrl) return null

  // Extraire le prix (peut être en USD)
  let priceUSD: number | null = null
  if (typeof item.price === 'number') {
    priceUSD = item.price
  } else if (item.price?.value) {
    priceUSD = parseFloat(String(item.price.value))
  } else if (item.salePrice) {
    priceUSD = parseFloat(String(item.salePrice))
  } else if (item.originalPrice) {
    priceUSD = parseFloat(String(item.originalPrice))
  }

  // Convertir en FCFA
  const baseCost = priceUSD ? Math.round(priceUSD * FX_RATE) : undefined
  const price = baseCost ? Math.round(baseCost * (1 + DEFAULT_MARGIN / 100)) : undefined

  // Extraire les images
  const image = item.image || item.imageUrl || item.mainImage || item.productImage
  const gallery = Array.isArray(item.gallery) 
    ? item.gallery 
    : Array.isArray(item.images) 
    ? item.images 
    : image ? [image] : []

  // Extraire les caractéristiques
  const features: string[] = []
  if (item.shopName || item.storeName) {
    features.push(`Boutique: ${item.shopName || item.storeName}`)
  }
  if (item.orders || item.orderCount) {
    features.push(`${item.orders || item.orderCount} commandes`)
  }
  if (item.rating || item.evaluationScore) {
    features.push(`Note: ${item.rating || item.evaluationScore}`)
  }
  if (item.totalRated || item.reviewCount) {
    features.push(`${item.totalRated || item.reviewCount} avis`)
  }
  if (Array.isArray(item.features)) {
    features.push(...item.features.slice(0, 3))
  }
  if (Array.isArray(item.properties)) {
    item.properties.slice(0, 3).forEach((prop: any) => {
      if (prop.name && prop.value) {
        features.push(`${prop.name}: ${prop.value}`)
      }
    })
  }

  // Poids (minimum 1kg)
  const weightKg = item.weight || item.itemWeight || item.weightKg || 1
  const finalWeight = typeof weightKg === 'number' && weightKg > 0 ? Number(weightKg.toFixed(2)) : 1

  return {
    productId: item.productId || item.id,
    name: String(name).trim(),
    productUrl: String(productUrl),
    image: image || undefined,
    gallery: gallery.filter(Boolean).slice(0, 5),
    baseCost,
    price,
    currency: 'FCFA',
    weightKg: finalWeight,
    features: features.slice(0, 6),
    category: item.category || item.firstLevelCategoryName || 'Catalogue import Chine',
    tagline: item.tagline || item.secondLevelCategoryName || 'Solutions import Chine',
    availabilityNote: 'Commande import Chine (freight 3j / 15j / 60j)',
    shopName: item.shopName || item.storeName || item.store?.storeName,
    orders: item.orders || item.orderCount,
    totalRated: item.totalRated || item.reviewCount || item.ratings
  }
}

