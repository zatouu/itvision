/**
 * Service de taux de change dynamique
 * Récupère les taux actuels et met en cache les valeurs
 */

interface ExchangeRateCache {
  rate: number
  updatedAt: Date
  source: string
}

// Cache en mémoire (24h par défaut)
let cachedRate: ExchangeRateCache | null = null
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 heures

// Taux de fallback
export const DEFAULT_EXCHANGE_RATE = 100 // 1 CNY = 100 FCFA (conservateur)
export const BEAC_EUR_XOF_RATE = 655.957 // Taux fixe BEAC

/**
 * Récupère le taux de change CNY → XOF depuis une API externe
 * @returns Taux de change (1 CNY = X XOF)
 */
export async function getCNYToXOFRate(): Promise<number> {
  // Retourner le cache si valide
  if (cachedRate && Date.now() - cachedRate.updatedAt.getTime() < CACHE_DURATION_MS) {
    console.log('[Exchange] Utilisation cache:', cachedRate.rate, 'depuis', cachedRate.source)
    return cachedRate.rate
  }

  try {
    // API gratuite : exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY', {
      next: { revalidate: 3600 } // Revalidation ISR si utilisé côté serveur
    })

    if (!response.ok) {
      throw new Error(`API erreur: ${response.status}`)
    }

    const data = await response.json()

    // CNY → EUR → XOF (pas de direct CNY/XOF sur la plupart des APIs)
    const cnyToEur = data.rates?.EUR
    if (!cnyToEur || typeof cnyToEur !== 'number') {
      throw new Error('Taux CNY/EUR non disponible')
    }

    const rate = Math.round(cnyToEur * BEAC_EUR_XOF_RATE)

    // Validation du taux (sécurité)
    if (rate < 50 || rate > 200) {
      console.warn('[Exchange] Taux suspect détecté:', rate, '- utilisation fallback')
      return DEFAULT_EXCHANGE_RATE
    }

    // Mettre à jour le cache
    cachedRate = {
      rate,
      updatedAt: new Date(),
      source: 'exchangerate-api.com'
    }

    console.log('[Exchange] Nouveau taux récupéré:', rate, 'FCFA/¥')
    return rate

  } catch (error) {
    console.error('[Exchange] Erreur récupération taux:', error)
    // Fallback sur taux par défaut
    return DEFAULT_EXCHANGE_RATE
  }
}

/**
 * Récupère le taux actuel ou retourne le cache
 * Utiliser cette fonction pour l'affichage (ne rafraîchit pas)
 */
export function getCurrentExchangeRate(): number {
  return cachedRate?.rate ?? DEFAULT_EXCHANGE_RATE
}

/**
 * Force le rafraîchissement du taux
 */
export async function refreshExchangeRate(): Promise<number> {
  cachedRate = null
  return getCNYToXOFRate()
}

/**
 * Convertit un prix en Yuan vers FCFA
 */
export function convertCNYtoXOF(priceCNY: number, customRate?: number): number {
  const rate = customRate ?? getCurrentExchangeRate()
  return Math.round(priceCNY * rate)
}

/**
 * Informations sur le taux actuel pour affichage admin
 */
export function getExchangeRateInfo(): {
  rate: number
  isCached: boolean
  lastUpdated: Date | null
  source: string
  isFallback: boolean
} {
  return {
    rate: cachedRate?.rate ?? DEFAULT_EXCHANGE_RATE,
    isCached: !!cachedRate,
    lastUpdated: cachedRate?.updatedAt ?? null,
    source: cachedRate?.source ?? 'default',
    isFallback: !cachedRate
  }
}

/**
 * API Route handler pour récupérer le taux côté client
 * À utiliser dans /app/api/exchange-rate/route.ts
 */
export async function handleExchangeRateRequest(): Promise<{
  success: boolean
  rate?: number
  lastUpdated?: string
  source?: string
  error?: string
}> {
  try {
    const rate = await getCNYToXOFRate()
    const info = getExchangeRateInfo()

    return {
      success: true,
      rate,
      lastUpdated: info.lastUpdated?.toISOString(),
      source: info.source
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      rate: DEFAULT_EXCHANGE_RATE
    }
  }
}
