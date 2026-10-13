import Product from '@/lib/models/Product'
import { computeProductPricing } from '@/lib/logistics'
import { configuredShippingRates, type SharedPricingConfig } from '@/lib/pricing/shared-settings'
import type { SourceCurrency } from '@/lib/pricing/constants'
import { qwenChat } from '@/lib/ai/qwen'

/**
 * Règles communes aux imports catalogue (extension, smart-import, agents, API fournisseurs) :
 * clé de dédoublonnage, prix plateforme et poids estimé quand la source ne le donne pas.
 */

export const IMPORT_MARGIN_RATE = Number(process.env.SOURCING_MARGIN_RATE || 15)

export interface SourceRef {
  platform: string
  url?: string
  externalId?: string
}

/** URL canonique et identifiant de l'offre ; les variantes d'hôte (fr., m., detail.) donnent la même clé. */
export function canonicalSource(rawUrl?: string, platformHint?: string): SourceRef {
  let url: URL | null = null
  try { url = rawUrl ? new URL(rawUrl) : null } catch { url = null }
  const host = url?.hostname.toLowerCase() || ''
  const path = url?.pathname || ''
  let platform = (platformHint || '').toLowerCase()
  let externalId: string | undefined
  let canonical: string | undefined

  if (/(^|\.)aliexpress\.[a-z.]+$/.test(host)) {
    platform = 'aliexpress'
    externalId = path.match(/\/item\/(\d{6,})\.html/)?.[1]
    if (externalId) canonical = `https://www.aliexpress.com/item/${externalId}.html`
  } else if (/(^|\.)1688\.com$/.test(host)) {
    platform = '1688'
    externalId = path.match(/\/offer\/(\d{6,})\.html/)?.[1] || url?.searchParams.get('offerId') || undefined
    if (externalId) canonical = `https://detail.1688.com/offer/${externalId}.html`
  } else if (/(^|\.)alibaba\.com$/.test(host)) {
    platform = 'alibaba'
    externalId = path.match(/_(\d{6,})\.html/)?.[1]
    if (externalId) canonical = `https://www.alibaba.com/product-detail/_${externalId}.html`
  } else if (/(^|\.)(taobao|tmall)\.com$/.test(host)) {
    platform = 'taobao'
    externalId = url?.searchParams.get('id') || undefined
  }

  if (!canonical && url) canonical = `https://${host}${path}`
  return { platform: platform || '1688', url: canonical, externalId }
}

/** Produit déjà importé depuis la même offre (identifiant externe, URL canonique ou URL brute historique). */
export async function findImportedProduct(src: SourceRef, rawUrl?: string): Promise<{ _id: unknown } | null> {
  const or: Record<string, unknown>[] = []
  if (src.externalId) or.push({ 'sourcing.platform': src.platform, 'sourcing.externalId': src.externalId })
  for (const u of new Set([src.url, rawUrl].filter(Boolean) as string[])) or.push({ 'sourcing.productUrl': u })
  if (!or.length) return null
  return Product.findOne({ $or: or }).select('_id').lean() as Promise<{ _id: unknown } | null>
}

/**
 * Prix catalogue d'un produit importé : coût source converti au taux plateforme, marge, frais de service
 * et assurance, transport exclu (choisi au checkout, ajusté à la pesée). Arrondi aux 500 F supérieurs.
 */
export function importPricing(input: {
  sourcePrice: number
  currency?: string
  platform: string
  marginRate?: number
  serviceFeeRate?: number
  insuranceRate?: number
}, config: SharedPricingConfig) {
  const currency = (input.currency || 'CNY').toUpperCase()
  const exchangeRate = config.sourceCurrencyRates[currency as SourceCurrency]
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) throw new Error('Devise source non configuree')
  const marginRate = input.marginRate ?? IMPORT_MARGIN_RATE
  const serviceFeeRate = input.serviceFeeRate ?? config.defaults.defaultServiceFeeRate
  const insuranceRate = input.insuranceRate ?? config.defaults.defaultInsuranceRate
  const pricing = computeProductPricing({
    price1688: input.sourcePrice,
    exchangeRate,
    marginRate,
    serviceFeeRate,
    insuranceRate,
    currency: 'FCFA',
    sourcing: { platform: input.platform },
    stockStatus: 'preorder',
  }, configuredShippingRates(config), 1, config.defaults.singleImportServiceFeeRate, config.defaults)
  const raw = pricing.totalWithFees ?? pricing.salePrice ?? 0
  return {
    price: raw > 0 ? Math.ceil(raw / 500) * 500 : 0,
    price1688Currency: currency,
    exchangeRate,
    marginRate,
    serviceFeeRate,
    insuranceRate,
  }
}

const WEIGHT_HINTS: Array<[RegExp, number]> = [
  [/\b(perceuse|meuleuse|visseuse|scie|compresseur|onduleur|ups|batterie|battery)\b/i, 2.5],
  [/\b(nvr|dvr|enregistreur|switch|routeur|router|rack|baie)\b/i, 1.5],
  [/\b(c[aâ]ble|cable|bobine)\b/i, 1],
  [/\b(cam[eé]ra|camera|serrure|lock|interphone|portier|sir[eè]ne|projecteur|spot)\b/i, 0.6],
  [/\b(capteur|d[eé]tecteur|sensor|badge|t[eé]l[eé]commande|prise|plug|ampoule|bulb|interrupteur|connecteur|adaptateur)\b/i, 0.2],
]

/** Poids d'expédition estimé quand la source ne le donne pas (le transport est recalculé au poids réel). */
export function estimateWeightKg(text: string, aiEstimate?: unknown): number {
  const ai = Number(aiEstimate)
  if (Number.isFinite(ai) && ai >= 0.01 && ai <= 50) return Math.round(ai * 100) / 100
  for (const [re, kg] of WEIGHT_HINTS) if (re.test(text)) return kg
  return 0.5
}

/** Titre en français pour un nom chinois ou anglais ; renvoie le titre d'origine si l'IA ne répond pas. */
export async function translateTitleFr(name: string): Promise<string> {
  if (!name.trim() || !/[\u4e00-\u9fff]|^[\x00-\x7F]+$/.test(name)) return name
  try {
    const { text } = await qwenChat([
      { role: 'system', content: 'Traduis ce titre de produit e-commerce en français, court et vendeur (80 caractères max). Conserve marque et modèle. Réponds uniquement par le titre.' },
      { role: 'user', content: name.slice(0, 200) },
    ])
    const out = (text || '').trim().replace(/^["«\s]+|["»\s]+$/g, '').slice(0, 120)
    return out || name
  } catch {
    return name
  }
}
