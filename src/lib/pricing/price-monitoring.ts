/**
 * Service de surveillance des prix fournisseurs
 * Vérifie automatiquement les changements de prix sur 1688/Taobao
 * et alerte si les variations dépassent le seuil configuré
 */

import { IProduct } from '@/lib/models/Product'

export interface PriceCheckResult {
  productId: string
  productName: string
  previousPrice: number
  currentPrice: number | null
  changePercent: number | null
  changeAmount: number | null
  exceedsThreshold: boolean
  error?: string
}

export interface PriceAlert {
  productId: string
  productName: string
  previousPrice: number
  newPrice: number
  changePercent: number
  threshold: number
  timestamp: Date
}

/**
 * Vérifie le prix actuel d'un produit sur sa source
 * Note: Cette fonction est un placeholder pour l'implémentation future
 * avec scraping ou API tiers (Apify, etc.)
 */
export async function checkProductPrice(product: IProduct): Promise<PriceCheckResult> {
  const productUrl = product.sourcing?.productUrl
  const previousPrice = product.price1688

  // Si pas d'URL ou pas de prix 1688, on ne peut pas vérifier
  if (!productUrl || !previousPrice) {
    return {
      productId: product._id.toString(),
      productName: product.name,
      previousPrice: 0,
      currentPrice: null,
      changePercent: null,
      changeAmount: null,
      exceedsThreshold: false,
      error: 'Pas d\'URL source ou prix 1688 non défini'
    }
  }

  try {
    // TODO: Implémenter la vérification réelle via:
    // - Apify actor pour 1688
    // - API tiers
    // - Chrome extension avec export de données
    
    // Pour l'instant, on simule avec un échec (la vérification automatique
    // nécessite une infrastructure de scraping qui n'est pas encore en place)
    throw new Error('Vérification automatique non implémentée - utiliser mise à jour manuelle')

  } catch (error) {
    return {
      productId: product._id.toString(),
      productName: product.name,
      previousPrice,
      currentPrice: null,
      changePercent: null,
      changeAmount: null,
      exceedsThreshold: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Vérifie les prix de tous les produits importés
 * À exécuter via cron job (ex: hebdomadaire)
 */
export async function checkAllProductPrices(
  products: IProduct[],
  options: {
    batchSize?: number
    delayMs?: number
    threshold?: number
  } = {}
): Promise<{
  checked: number
  changed: number
  alerts: PriceAlert[]
  errors: PriceCheckResult[]
}> {
  const { batchSize = 10, delayMs = 1000, threshold = 10 } = options

  const results: PriceCheckResult[] = []
  const alerts: PriceAlert[] = []

  // Traiter par lots pour éviter de surcharger
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize)
    
    const batchResults = await Promise.all(
      batch.map(p => checkProductPrice(p))
    )
    
    results.push(...batchResults)

    // Attendre entre les lots pour respecter les rate limits
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  // Identifier les changements significatifs
  const changedProducts = results.filter(r => 
    r.changePercent !== null && 
    Math.abs(r.changePercent) >= threshold
  )

  const alertsList: PriceAlert[] = changedProducts.map(r => ({
    productId: r.productId,
    productName: r.productName,
    previousPrice: r.previousPrice,
    newPrice: r.currentPrice!,
    changePercent: r.changePercent!,
    threshold,
    timestamp: new Date()
  }))

  return {
    checked: results.length,
    changed: changedProducts.length,
    alerts: alertsList,
    errors: results.filter(r => r.error)
  }
}

/**
 * Met à jour le prix d'un produit avec historique
 */
export function createPriceUpdateData(
  newPrice1688: number,
  currentExchangeRate: number,
  previousPrice1688?: number,
  source: 'auto_check' | 'manual_update' | 'import' = 'manual_update'
): {
  price1688: number
  exchangeRate: number
  $push: {
    priceHistory: {
      date: Date
      price1688: number
      exchangeRate: number
      changePercent: number
      source: string
    }
  }
  lastPriceCheckAt: Date
} {
  // Calculer le pourcentage de changement
  const changePercent = previousPrice1688 && previousPrice1688 > 0
    ? Number((((newPrice1688 - previousPrice1688) / previousPrice1688) * 100).toFixed(2))
    : 0

  return {
    price1688: newPrice1688,
    exchangeRate: currentExchangeRate,
    $push: {
      priceHistory: {
        date: new Date(),
        price1688: newPrice1688,
        exchangeRate: currentExchangeRate,
        changePercent,
        source
      }
    },
    lastPriceCheckAt: new Date()
  }
}

/**
 * Analyse l'historique des prix pour identifier les tendances
 */
export function analyzePriceHistory(
  priceHistory: Array<{ date: Date; price1688: number; changePercent: number }>
): {
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
  volatility: number // Écart-type des changements
  averageChange: number
  minPrice: number
  maxPrice: number
  recommendation: string
} {
  if (priceHistory.length < 2) {
    return {
      trend: 'stable',
      volatility: 0,
      averageChange: 0,
      minPrice: priceHistory[0]?.price1688 ?? 0,
      maxPrice: priceHistory[0]?.price1688 ?? 0,
      recommendation: 'Pas assez d\'historique pour une analyse'
    }
  }

  const prices = priceHistory.map(h => h.price1688)
  const changes = priceHistory.map(h => h.changePercent).filter(c => c !== 0)

  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const averageChange = changes.reduce((a, b) => a + b, 0) / (changes.length || 1)

  // Calculer la volatilité (écart-type)
  const variance = changes.reduce((acc, val) => acc + Math.pow(val - averageChange, 2), 0) / (changes.length || 1)
  const volatility = Math.sqrt(variance)

  // Déterminer la tendance
  let trend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
  if (volatility > 15) {
    trend = 'volatile'
  } else if (averageChange > 2) {
    trend = 'increasing'
  } else if (averageChange < -2) {
    trend = 'decreasing'
  } else {
    trend = 'stable'
  }

  // Générer une recommandation
  let recommendation: string
  switch (trend) {
    case 'increasing':
      recommendation = `Prix en hausse. Envisager d'ajuster les prix de vente ou de stocker plus.`
      break
    case 'decreasing':
      recommendation = `Prix en baisse. Bon moment pour réapprovisionner.`
      break
    case 'volatile':
      recommendation = `Prix instable. Surveillance rapprochée recommandée.`
      break
    default:
      recommendation = `Prix stable. Pas d'action nécessaire.`
  }

  return {
    trend,
    volatility: Number(volatility.toFixed(2)),
    averageChange: Number(averageChange.toFixed(2)),
    minPrice,
    maxPrice,
    recommendation
  }
}

/**
 * Formate une alerte prix pour notification
 */
export function formatPriceAlert(alert: PriceAlert): {
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
} {
  const direction = alert.changePercent > 0 ? '↗️ Hausse' : '↘️ Baisse'
  const severity: 'info' | 'warning' | 'critical' =
    Math.abs(alert.changePercent) > 20 ? 'critical' :
    Math.abs(alert.changePercent) > 10 ? 'warning' : 'info'

  return {
    title: `${direction} de prix: ${alert.productName}`,
    message: `Changement de ${alert.changePercent > 0 ? '+' : ''}${alert.changePercent}% ` +
             `(¥${alert.previousPrice} → ¥${alert.newPrice})`,
    severity
  }
}
