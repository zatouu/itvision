import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { requireAuth } from '@/lib/jwt'
import { defaultProductCategories } from '@/lib/data/default-categories'
import { qwenChat, qwenVision } from '@/lib/ai/qwen'
import { canonicalSource, CHINA_INLAND_TRANSPORT_CNY, estimateWeightKg, findImportedProduct, importPricing, importSourcePrice, toCny } from '@/lib/market/catalog-import'
import { localizeProductImages } from '@/lib/agents/sourcing/localize-images'
import { readSharedPricing } from '@/lib/pricing/shared-settings'
import { isVideoFileUrl } from '@/lib/media'

/**
 * POST /api/admin/products/smart-import
 * 
 * Import intelligent de produit(s) depuis des donnees brutes (extension Chrome, CSV, ou scrape).
 * Nettoie les images, reformate la description via OpenAI, calcule le pricing auto.
 * 
 * Body:
 *   products: Array<{
 *     name: string
 *     description?: string         // Description brute a reformater
 *     images?: string[]            // URLs images brutes (sera filtre)
 *     price1688?: number           // Prix de vente relevé sur la plateforme (devise price1688Currency)
 *     price1688Currency?: string   // CNY (défaut), USD, EUR, XOF… — converti en ¥ puis + transport Chine (15 ¥)
 *     promoPrice1688?: number      // Prix promo visible : le plus bas des deux est retenu
 *     category?: string
 *     features?: string[]
 *     variants?: Array<{ name: string; image?: string; price1688?: number }>
 *     weightKg?: number
 *     sourceUrl?: string           // URL produit source (1688, AliExpress)
 *     sourcePlatform?: string      // '1688' | 'aliexpress' | 'taobao'
 *   }>
 *   options?: {
 *     marginRate?: number          // Défaut : SOURCING_MARGIN_RATE (15 %)
 *     serviceFeeRate?: number      // Défaut : 10 %
 *     b2bDiscountPercent?: number  // Defaut: 15%
 *     reformatDescriptions?: boolean // Traduction et mise en forme par le gateway IA (défaut : true)
 *     filterImages?: boolean       // Filtrer les images polluees (defaut: true)
 *     autoPublish?: boolean        // Publier directement (defaut: false)
 *   }
 *
 * Une offre déjà importée (même identifiant ou URL source) n'est pas recréée : seul son prix est mis à jour.
 */

// Mots d'interface (logos, promos, paiement…) comparés mot à mot sur le CHEMIN de l'image.
// Pas de recherche de sous-chaîne : les noms de fichiers des CDN sont des identifiants
// aléatoires où « sale », « icon », « visa »… apparaissent par hasard.
const IMAGE_NOISE_TOKENS = new Set([
  'logo', 'logos', 'banner', 'banners', 'icon', 'icons', 'badge', 'badges', 'stamp', 'watermark',
  'promo', 'promotion', 'coupon', 'coupons', 'discount', 'paypal', 'visa', 'mastercard', 'alipay',
  'qrcode', 'qr', 'wechat', 'whatsapp', 'favicon', 'placeholder', 'sprite', 'avatar', 'pixel',
])
const IMAGE_NOISE_HOST_RE = /(?:^|\.)(?:paypal|klarna|afterpay|googletagmanager|google-analytics|doubleclick|facebook)\.(?:com|net)$/i

// Classification automatique dans les catégories IT Vision (fallback sans IA)
const CATEGORY_KEYWORDS: Record<string, { name: string; keywords: string[]; subCategories: { name: string; slug: string; keywords: string[] }[] }> = {
  securite: {
    name: 'Sécurité',
    keywords: ['camera', 'caméra', 'surveillance', 'cctv', 'dvr', 'nvr', 'ip camera', 'poe', 'alarme', 'intrusion', 'détecteur', 'detecteur', 'capteur', 'mouvement', 'présence', 'serrure', 'lock', 'empreinte', 'fingerprint', 'badge', 'portier', 'interphone', 'vidéo', 'video'],
    subCategories: [
      { name: 'Vidéosurveillance', slug: 'videosurveillance', keywords: ['camera', 'caméra', 'dvr', 'nvr', 'cctv', 'ip camera', 'poe', 'surveillance', 'vidéosurveillance', 'vidéo', 'video', 'enregistreur'] },
      { name: 'Contrôle d\'Accès', slug: 'controle-acces', keywords: ['serrure', 'lock', 'empreinte', 'fingerprint', 'badge', 'portier', 'interphone', 'contrôle d\'accès', 'controle acces', 'access control'] },
      { name: 'Alarme & Intrusion', slug: 'alarme-intrusion', keywords: ['alarme', 'intrusion', 'détecteur', 'detecteur', 'capteur', 'mouvement', 'sirène', 'siren'] }
    ]
  },
  informatique: {
    name: 'Informatique & Bureautique',
    keywords: ['ordinateur', 'laptop', 'pc', 'clavier', 'souris', 'écran', 'ecran', 'cable', 'câble', 'switch', 'routeur', 'router', 'hub', 'usb', 'hdmi', 'réseau', 'reseau', 'network', 'bureautique', 'imprimante', 'scanner', 'disque dur', 'ssd', 'ram', 'mémoire', 'carte mère', 'clé usb', 'webcam', 'microphone'],
    subCategories: [
      { name: 'Réseau Informatique', slug: 'reseau-informatique', keywords: ['switch', 'routeur', 'router', 'hub', 'réseau', 'reseau', 'network', 'câble rj45', 'rj45', 'ethernet'] },
      { name: 'Câbles & Connectique', slug: 'cables', keywords: ['cable', 'câble', 'hdmi', 'usb', 'connectique', 'rj45', 'adaptateur'] },
      { name: 'Écrans', slug: 'ecrans', keywords: ['écran', 'ecran', 'monitor', 'moniteur', 'display'] },
      { name: 'Ordinateurs', slug: 'ordinateurs', keywords: ['ordinateur', 'laptop', 'pc', 'desktop', 'notebook', 'serveur'] },
      { name: 'Accessoires informatiques', slug: 'accessoires-informatique', keywords: ['clavier', 'souris', 'webcam', 'microphone', 'casque', 'support', 'hub usb'] }
    ]
  },
  domotique: {
    name: 'Domotique & Smart Home',
    keywords: ['domotique', 'smart home', 'maison connectée', 'sonoff', 'tuya', 'zigbee', 'wifi switch', 'capteur', 'sensor', 'thermostat', 'interrupteur connecté', 'prise connectée', 'smart plug', 'automation'],
    subCategories: [
      { name: 'Domotique', slug: 'domotique-maison', keywords: ['domotique', 'interrupteur', 'thermostat', 'automation', 'knx', 'zwave'] },
      { name: 'Smart Home', slug: 'smart-home', keywords: ['smart home', 'tuya', 'sonoff', 'zigbee', 'wifi', 'smart plug', 'prise connectée', 'alexa', 'google home'] }
    ]
  },
  electronique: {
    name: 'Électronique grand public',
    keywords: ['smartphone', 'téléphone', 'telephone', 'earphone', 'écouteur', 'headphone', 'casque', 'chargeur', 'power bank', 'batterie', 'bluetooth', 'speaker', 'enceinte', 'tv box', 'android box', 'drone', 'montre connectée', 'smartwatch', 'tablette'],
    subCategories: [
      { name: 'Smartphones', slug: 'smartphones', keywords: ['smartphone', 'téléphone', 'telephone', 'mobile', 'iphone', 'android'] },
      { name: 'Audio & Vidéo', slug: 'audio-video', keywords: ['earphone', 'écouteur', 'headphone', 'casque', 'speaker', 'enceinte', 'bluetooth', 'audio', 'vidéo', 'tv box'] },
      { name: 'Électronique divers', slug: 'electronique-divers', keywords: ['power bank', 'chargeur', 'batterie', 'drone', 'montre connectée', 'smartwatch', 'tablette'] }
    ]
  },
  mobilier: {
    name: 'Mobilier & Installation',
    keywords: ['rack', 'baie', 'armoire', 'server cabinet', 'coffret', 'bureau', 'chaise', 'table', 'mobilier', 'meuble', 'établi', 'poste de travail'],
    subCategories: [
      { name: 'Mobilier technique', slug: 'mobilier-technique', keywords: ['bureau', 'chaise', 'table', 'mobilier', 'meuble', 'poste de travail'] },
      { name: 'Racks & Baies', slug: 'racks-baies', keywords: ['rack', 'baie', 'armoire', 'server cabinet', 'coffret'] }
    ]
  },
  'packs-cadeaux': {
    name: 'Packs & Cadeaux',
    keywords: ['pack', 'lot', 'coffret', 'cadeau', 'gift', 'box', 'ensemble', 'kit'],
    subCategories: [
      { name: 'Lot de 10 Box cadeau', slug: 'lot-10-box-cadeau', keywords: ['box cadeau', 'coffret', 'gift box', 'lot de 10'] }
    ]
  }
}

function classifyCategoryFromKeywords(
  name: string,
  description: string,
  specs: Record<string, unknown>
): { category: string; subCategory?: string } | null {
  const text = `${name} ${description} ${Object.entries(specs || {}).map(([k, v]) => `${k} ${v}`).join(' ')}`.toLowerCase()
  let bestCategory: string | null = null
  let bestCategoryName = ''
  let bestSubCategory: string | undefined
  let bestScore = 0

  for (const [slug, cat] of Object.entries(CATEGORY_KEYWORDS)) {
    let categoryScore = 0
    for (const kw of cat.keywords) {
      if (text.includes(kw.toLowerCase())) categoryScore += 1
    }

    let bestSubScore = 0
    let bestSubName: string | undefined
    for (const sub of cat.subCategories) {
      let subScore = 0
      for (const kw of sub.keywords) {
        if (text.includes(kw.toLowerCase())) subScore += 1.5
      }
      if (subScore > bestSubScore) {
        bestSubScore = subScore
        bestSubName = sub.name
      }
    }

    const total = categoryScore + bestSubScore
    if (total > bestScore) {
      bestScore = total
      bestCategory = slug
      bestCategoryName = cat.name
      bestSubCategory = bestSubName
    }
  }

  if (bestScore < 2) return null
  return { category: bestCategoryName, subCategory: bestSubCategory }
}

const PRODUCT_CDN_HOST_RE = /(?:^|\.)(?:alicdn\.com|aliexpress-media\.com|aliexpress\.com|alibaba\.com|1688\.com|alibabausercontent\.com)$/i

/**
 * URL canonique en pleine résolution : https, sans suffixe de redimensionnement des CDN
 * (xxx.jpg_220x220q75.jpg_.avif, xxx.310x310.jpg, xxx.summ.jpg…) ni paramètres.
 */
function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  let clean = url.trim()
  if (!clean) return ''
  if (clean.startsWith('//')) clean = `https:${clean}`
  if (!/^https?:\/\//i.test(clean)) return ''
  let parsed: URL
  try { parsed = new URL(clean) } catch { return '' }
  if (!PRODUCT_CDN_HOST_RE.test(parsed.hostname)) return parsed.href.split('#')[0]
  const base = parsed.pathname.match(/^(.*?\.(?:jpe?g|png|webp))(?=[_.]|$)/i)
  const path = (base ? base[1] : parsed.pathname)
    .replace(/\.(?:\d{2,4}x\d{2,4}|summ|search|sum)\.(jpe?g|png|webp)$/i, '.$1')
  return `https://${parsed.hostname}${path}`
}

function isNoiseImageUrl(url: string): boolean {
  let parsed: URL
  try { parsed = new URL(url) } catch { return true }
  if (IMAGE_NOISE_HOST_RE.test(parsed.hostname)) return true
  const path = parsed.pathname.toLowerCase()
  if (/\.(?:gif|svg|ico)$/.test(path)) return true
  return path.split(/[^a-z0-9]+/).some(token => IMAGE_NOISE_TOKENS.has(token))
}

function filterProductImages(images: string[]): string[] {
  if (!Array.isArray(images)) return []

  const seen = new Set<string>()
  const out: string[] = []

  for (const source of images) {
    const url = normalizeImageUrl(source)
    if (!url || isNoiseImageUrl(url)) continue
    const key = url.split('?')[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }

  return out
}

function buildEnrichmentPrompt(categoriesList: string): string {
  return `Tu es un assistant e-commerce pour un marketplace d'import Chine destiné à l'Afrique de l'Ouest francophone (Sénégal, Côte d'Ivoire).
Tu reçois les données brutes d'un produit importé depuis 1688 ou AliExpress.
Nettoie-les et retourne UNIQUEMENT un JSON valide sans markdown avec cette structure exacte :
{ "name": "...", "category": "...", "subCategory": "...", "description": "...", "features": ["..."], "tags": ["..."], "estimatedWeightKg": 0.5 }

Règles :
- name : nom produit propre et vendeur en français (max 80 caractères). Traduis depuis le chinois/anglais. Conserve marque et modèle. Supprime spam, emojis excessifs, mentions vendeur/promo.
- category : choisis EXACTEMENT une catégorie dans cette liste :
${categoriesList}
- subCategory : choisis une sous-catégorie pertinente parmi celles de la catégorie choisie, ou laisse vide.
- description : 3-5 phrases claires en français, vendeuses, sans jargon inutile.
- features : 4-8 bullet points courts en français.
- tags : 3-6 tags pertinents en minuscules, en français.
- estimatedWeightKg : poids d'expédition probable d'une unité emballée, en kg (nombre).
Ne traduis pas les noms de marque. Supprime les infos inutiles (politique retour vendeur chinois, etc).`
}

function parseEnrichmentJson(content: string, fallback: { name: string; description: string; features: string[]; tags: string[] }) {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return fallback

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      name: parsed.name || fallback.name,
      category: parsed.category || undefined,
      subCategory: parsed.subCategory || undefined,
      description: parsed.description || fallback.description,
      features: Array.isArray(parsed.features) ? parsed.features : fallback.features,
      tags: Array.isArray(parsed.tags) ? parsed.tags : fallback.tags,
      estimatedWeightKg: parsed.estimatedWeightKg,
    }
  } catch {
    return fallback
  }
}

// qwenChat passe par le gateway (DeepSeek, puis QwenCloud, puis Ollama)
async function callGatewayEnrich(rawName: string, rawDescription: string, raw: Record<string, unknown>, categoriesList: string) {
  const result = await qwenChat([
    { role: 'system', content: buildEnrichmentPrompt(categoriesList) },
    {
      role: 'user',
      content: `Nom brut: ${rawName.slice(0, 200)}\nDescription brute:\n${rawDescription.slice(0, 3000)}\nSpécifications:\n${JSON.stringify(raw.specifications || {}).slice(0, 2000)}`,
    },
  ])
  return result.text
}

async function enrichProduct(
  raw: Record<string, unknown>
): Promise<{ name: string; category?: string; subCategory?: string; description: string; features: string[]; tags: string[]; estimatedWeightKg?: unknown }> {
  const rawName = String(raw.name || '')
  const rawDescription = String(raw.description || '')
  const fallback = {
    name: rawName,
    description: rawDescription,
    features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : ['import-chine'],
  }

  if (!rawName.trim()) return fallback

  const categoriesList = defaultProductCategories
    .map((c) => `- ${c.name}${c.subCategories ? ` (${c.subCategories.map((s) => s.name).join(', ')})` : ''}`)
    .join('\n')

  let content = ''
  try {
    content = await callGatewayEnrich(rawName, rawDescription, raw, categoriesList)
  } catch (err) {
    console.error('Erreur enrichissement IA:', err)
    return fallback
  }

  if (!content) return fallback
  return parseEnrichmentJson(content, fallback)
}

async function selectProductImagesWithVision(images: string[]): Promise<string[]> {
  if (images.length === 0) return []
  if (!process.env.QWEN_CLOUD_API_KEY && !process.env.DASHSCOPE_API_KEY) return images

  const sample = images.slice(0, 8)
  const prompt = `Tu es un contrôleur qualité e-commerce. Je te montre plusieurs images d'une fiche produit provenant de 1688/AliExpress.
Certaines sont des photos du produit, d'autres sont des logos, bannières, icônes de paiement, promotions, QR codes, emballages, ou images de vendeur.

Retourne UNIQUEMENT un JSON de cette forme :
{ "keep": ["url1", "url2"], "rejected": ["url3"] }

Règles:
- Garde uniquement les images qui montrent clairement le produit (photo produit seul, en situation, détail, ou variante).
- Rejette: logos, badges, bannières promo, icônes de paiement, QR codes, watermark vendeur, emballages vides, schémas techniques sans produit.
- L'ordre de "keep" doit être du meilleur au moins bon pour une galerie e-commerce.
- Toutes les URLs fournies doivent être présentes dans keep ou rejected.`

  try {
    const result = await qwenVision(prompt, sample)
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return images
    const parsed = JSON.parse(jsonMatch[0])
    if (Array.isArray(parsed.keep) && parsed.keep.length > 0) {
      // Le modèle peut renvoyer une URL légèrement réécrite : on la rapproche par forme canonique
      const byKey = new Map(sample.map(u => [normalizeImageUrl(u), u]))
      const kept = parsed.keep
        .map((u: unknown) => (typeof u === 'string' ? byKey.get(normalizeImageUrl(u)) : undefined))
        .filter((u: string | undefined): u is string => Boolean(u))
      // Ne jamais vider une galerie : sans correspondance, on garde l'ordre d'origine
      if (kept.length === 0) return images
      // Les images au-delà de l'échantillon n'ont pas été jugées : on les conserve à la suite
      return [...new Set([...kept, ...images.slice(sample.length)])]
    }
  } catch (err) {
    console.warn('[smart-import] Vision image filtering failed:', err)
  }

  return images
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    const role = auth.role?.toUpperCase()
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'PRODUCT_MANAGER') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    const body = await req.json()
    const rawProducts = body.products
    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return NextResponse.json({ error: 'Aucun produit fourni' }, { status: 400 })
    }

    if (rawProducts.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 produits par appel (pour eviter les timeouts)' },
        { status: 400 }
      )
    }

    const opts = body.options || {}
    const pricingSettings = await readSharedPricing()
    const marginRate = typeof opts.marginRate === 'number' && opts.marginRate >= 0 ? opts.marginRate : undefined
    const serviceFeeRate = typeof opts.serviceFeeRate === 'number' && opts.serviceFeeRate >= 0 ? opts.serviceFeeRate : undefined
    const b2bDiscountPercent = opts.b2bDiscountPercent ?? pricingSettings.config.defaults.defaultB2BDiscountPercent
    const shouldEnrich = opts.reformatDescriptions !== false
    const shouldFilterImages = opts.filterImages !== false
    const autoPublish = opts.autoPublish === true

    await connectMongoose()

    const results: Array<{
      index: number
      name: string
      success: boolean
      productId?: string
      updated?: boolean
      imagesOriginal?: number
      imagesFiltered?: number
      descriptionReformatted?: boolean
      pricing?: { price: number; b2bPrice: number }
      error?: string
    }> = []

    const toPositiveNumber = (value: unknown): number | undefined => {
      const n = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(n) && n > 0 ? n : undefined
    }

    const normalizeVariantGroups = (
      rawVariantGroups: unknown,
      rawVariants: unknown
    ): Array<{ name: string; variants: Array<{ name: string; image?: string; price1688?: number; stock: number }> }> => {
      if (Array.isArray(rawVariantGroups) && rawVariantGroups.length > 0) {
        return rawVariantGroups
          .map((group: any) => {
            const groupName = String(group?.name || '').trim()
            if (!groupName) return null
            const variants = (Array.isArray(group?.variants) ? group.variants : [])
              .map((variant: any) => {
                const name = String(variant?.name || '').trim()
                if (!name) return null
                return {
                  name,
                  image: normalizeImageUrl(String(variant?.image || '')) || undefined,
                  price1688: toPositiveNumber(variant?.price1688),
                  stock: Math.max(0, Number(variant?.stock) || 0),
                }
              })
              .filter(Boolean) as Array<{ name: string; image?: string; price1688?: number; stock: number }>
            if (variants.length === 0) return null
            return { name: groupName, variants }
          })
          .filter(Boolean) as Array<{ name: string; variants: Array<{ name: string; image?: string; price1688?: number; stock: number }> }>
      }

      if (!Array.isArray(rawVariants) || rawVariants.length === 0) return []

      const grouped = new Map<string, Array<{ name: string; image?: string; price1688?: number; stock: number }>>()
      for (const variant of rawVariants as any[]) {
        const name = String(variant?.name || '').trim()
        if (!name) continue
        const groupName = String(variant?.groupName || 'Options').trim() || 'Options'
        const list = grouped.get(groupName) || []
        list.push({
          name,
          image: normalizeImageUrl(String(variant?.image || '')) || undefined,
          price1688: toPositiveNumber(variant?.price1688),
          stock: Math.max(0, Number(variant?.stock) || 0),
        })
        grouped.set(groupName, list)
      }

      return Array.from(grouped.entries()).map(([name, variants]) => ({ name, variants }))
    }

    for (let i = 0; i < rawProducts.length; i++) {
      const raw = rawProducts[i]

      try {
        if (!raw.name || typeof raw.name !== 'string') {
          results.push({ index: i, name: '?', success: false, error: 'Nom manquant' })
          continue
        }

        const rawSourceUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl : undefined
        const source = canonicalSource(rawSourceUrl, typeof raw.sourcePlatform === 'string' ? raw.sourcePlatform : undefined)
        // Prix de vente relevé (CNY, USD, EUR, FCFA…) → yuans + transport intérieur Chine.
        // Ancien format AliExpress : seul `price` (déjà en FCFA) était envoyé.
        const legacyFcfa = !toPositiveNumber(raw.price1688) && source.platform === 'aliexpress' ? toPositiveNumber(raw.price) : undefined
        const rawSourceCurrency = legacyFcfa ? 'XOF'
          : typeof raw.price1688Currency === 'string' ? raw.price1688Currency
          : source.platform === 'alibaba' ? 'USD' : 'CNY'
        const sourceSale = importSourcePrice({
          salePrice: legacyFcfa ?? toPositiveNumber(raw.price1688),
          promoPrice: legacyFcfa ? undefined : toPositiveNumber(raw.promoPrice1688),
          currency: rawSourceCurrency,
        }, pricingSettings.config)
        const sourcePrice = sourceSale?.price1688 || 0
        const variantPriceCny = (value?: number) => {
          const cny = value ? toCny(value, rawSourceCurrency, pricingSettings.config.sourceCurrencyRates) : undefined
          return cny ? Math.round((cny + (sourceSale?.transportCny ?? CHINA_INLAND_TRANSPORT_CNY)) * 100) / 100 : undefined
        }
        const sourceTrace = sourceSale ? {
          'sourcing.sourcePrice': sourceSale.salePrice,
          'sourcing.sourceCurrency': sourceSale.saleCurrency,
          'sourcing.inlandTransportCny': sourceSale.transportCny,
        } : {}
        const priced = sourcePrice > 0
          ? importPricing({ sourcePrice, currency: 'CNY', platform: source.platform, marginRate, serviceFeeRate }, pricingSettings.config)
          : null

        // Offre déjà au catalogue : on rafraîchit son prix, sans toucher au contenu relu par l'équipe
        const existing = await findImportedProduct(source, rawSourceUrl)
        if (existing) {
          if (priced?.price) {
            await Product.updateOne({ _id: existing._id }, {
              $set: {
                price1688: sourcePrice,
                price1688Currency: priced.price1688Currency,
                exchangeRate: priced.exchangeRate,
                price: priced.price,
                b2bPrice: Math.round(priced.price * (1 - b2bDiscountPercent / 100)),
                lastPriceCheckAt: new Date(),
                ...sourceTrace,
                ...(source.externalId ? { 'sourcing.externalId': source.externalId } : {}),
              },
              $push: { priceHistory: { $each: [{ date: new Date(), price1688: sourcePrice, exchangeRate: priced.exchangeRate, source: 'import' }], $slice: -50 } },
            })
          }
          // Compléter ce qui manque encore (dimensions, poids réel, médias, quantité) sans écraser le contenu relu
          const current = await Product.findById(existing._id)
            .select('lengthCm widthCm heightCm weightEstimated gallery descriptionImages stockQuantity')
            .lean() as any
          if (current) {
            const fill: Record<string, unknown> = {}
            const [l, w, h] = [raw.lengthCm, raw.widthCm, raw.heightCm].map(toPositiveNumber)
            if (l && w && h && !(current.lengthCm && current.widthCm && current.heightCm)) {
              Object.assign(fill, { lengthCm: l, widthCm: w, heightCm: h, volumeM3: Math.round((l * w * h) / 1_000) / 1_000 })
            }
            const realWeight = toPositiveNumber(raw.weightKg)
            if (realWeight && current.weightEstimated) Object.assign(fill, { weightKg: realWeight, weightEstimated: false })
            const toUrls = (value: unknown) => Array.isArray(value) ? value.filter((u): u is string => typeof u === 'string' && u.trim().length > 0) : []
            if (!(current.descriptionImages || []).length) {
              const desc = filterProductImages([...toUrls(raw.descriptionImages), ...toUrls(raw.imageCategories?.description)]).slice(0, 30)
              if (desc.length) fill.descriptionImages = desc
            }
            const gallery: string[] = Array.isArray(current.gallery) ? current.gallery : []
            const newVideos = [...new Set(toUrls(raw.videos).map(v => v.trim().replace(/^\/\//, 'https://')).filter(isVideoFileUrl))].slice(0, 2)
            if (newVideos.length && !gallery.some(isVideoFileUrl)) fill.gallery = [...gallery.slice(0, 1), ...newVideos, ...gallery.slice(1)]
            if (!current.stockQuantity) fill.stockQuantity = 100
            if (Object.keys(fill).length) await Product.updateOne({ _id: existing._id }, { $set: fill })
          }
          results.push({ index: i, name: raw.name, success: true, updated: true, productId: String(existing._id) })
          continue
        }

        // 1. Images, classées comme sur la page source : galerie ≠ variantes ≠ description
        const variantGroups = normalizeVariantGroups(raw.variantGroups, raw.variants).map(group => ({
          ...group,
          variants: group.variants.map(v => ({ ...v, price1688: variantPriceCny(v.price1688) })),
        }))
        const variantImages = variantGroups.flatMap(group => group.variants.map(v => v.image).filter(Boolean)) as string[]
        const asList = (value: unknown): string[] =>
          Array.isArray(value) ? value.filter((img): img is string => typeof img === 'string' && img.trim().length > 0) : []
        const prepare = (list: string[]) => shouldFilterImages
          ? filterProductImages(list)
          : [...new Set(list.map(normalizeImageUrl).filter(Boolean))]

        const descriptionCandidates = prepare([...asList(raw.descriptionImages), ...asList(raw.imageCategories?.description)])
        const descriptionSet = new Set(descriptionCandidates)
        // `images` (ancien format) mélange tout : on n'en garde que ce qui n'est pas du descriptif
        let cleanImages = prepare([...asList(raw.gallery), ...asList(raw.imageCategories?.gallery), ...asList(raw.images)])
          .filter(url => !descriptionSet.has(url))
        // Galerie absente de la source : images des variantes, puis du descriptif, plutôt qu'un placeholder
        if (cleanImages.length === 0) cleanImages = prepare([...variantImages, ...asList(raw.imageCategories?.variant)])
        if (cleanImages.length === 0) cleanImages = descriptionCandidates.slice(0, 5)

        // 1b. Filtre vision Qwen pour éliminer les images promo / logo / bruit
        let visionFilteredImages = cleanImages
        if (shouldFilterImages && cleanImages.length > 0 && (process.env.QWEN_CLOUD_API_KEY || process.env.DASHSCOPE_API_KEY)) {
          visionFilteredImages = await selectProductImagesWithVision(cleanImages)
        }

        // Limiter a 10 images max ; rapatriées chez nous (les CDN chinois bloquent le hotlink)
        const localized = await localizeProductImages({ gallery: visionFilteredImages.slice(0, 10) })
        const finalImages = localized.gallery
        // Vidéos du fournisseur : lues depuis leur CDN (trop lourdes à rapatrier), placées après la photo de couverture
        const videos = [...new Set(asList(raw.videos).map(v => v.trim().replace(/^\/\//, 'https://')).filter(isVideoFileUrl))].slice(0, 2)
        const finalGallery = finalImages.length > 0 ? [finalImages[0], ...videos, ...finalImages.slice(1)] : finalImages
        const finalSet = new Set(visionFilteredImages)
        const cleanDescriptionImages = descriptionCandidates.filter(url => !finalSet.has(url)).slice(0, 30)

        // 2. Enrichissement IA (nom + catégorie + description + features + tags)
        let productName = String(raw.name || '').trim()
        let description = String(raw.description || '')
        let features = Array.isArray(raw.features) ? raw.features : []
        let tags = Array.isArray(raw.tags) ? raw.tags : ['import-chine']
        let category = raw.category || undefined
        let enriched = false
        let aiWeight: unknown

        if (shouldEnrich) {
          const enrichedData = await enrichProduct(raw)
          productName = enrichedData.name || productName
          description = enrichedData.description || description
          features = enrichedData.features.length > 0 ? enrichedData.features : features
          tags = enrichedData.tags.length > 0 ? enrichedData.tags : tags
          category = enrichedData.category || category
          aiWeight = enrichedData.estimatedWeightKg
          enriched = enrichedData.name !== String(raw.name || '') || enrichedData.description !== String(raw.description || '')
        }

        // Fallback classification par mots-clés si pas de catégorie
        if (!category || category === 'Catalogue import Chine') {
          const keywordCategory = classifyCategoryFromKeywords(productName, description, raw.specifications as Record<string, unknown>)
          if (keywordCategory) {
            category = keywordCategory.category
            if (keywordCategory.subCategory && !tags.includes(keywordCategory.subCategory)) {
              tags.push(keywordCategory.subCategory)
            }
          }
        }

        // 3. Prix catalogue : coût source + marge + frais, transport exclu (choisi au checkout, ajusté à la pesée)
        let price = priced?.price || 0
        if (!price) price = toPositiveNumber(raw.price) || 0
        const b2bPrice = price > 0 ? Math.round(price * (1 - b2bDiscountPercent / 100)) : 0

        const sourceWeight = toPositiveNumber(raw.weightKg)
        const weightEstimated = !sourceWeight
        const weightKg = sourceWeight || estimateWeightKg(`${productName} ${category || ''}`, aiWeight)
        const lengthCm = toPositiveNumber(raw.lengthCm)
        const widthCm = toPositiveNumber(raw.widthCm)
        const heightCm = toPositiveNumber(raw.heightCm)
        const hasCompleteDimensions = Boolean(lengthCm && widthCm && heightCm)
        const explicitVolume = toPositiveNumber(raw.volumeM3)
        const computedVolume = hasCompleteDimensions
          ? Number((((lengthCm as number) * (widthCm as number) * (heightCm as number)) / 1_000_000).toFixed(3))
          : undefined
        const volumeM3 = explicitVolume || computedVolume
        // Sans volume ni poids réel, le transport est facturé après pesée : seul un prix absent impose le devis
        const requiresQuote = Boolean(raw.requiresQuote) || price <= 0

        // 4. Creer le produit
        const productData: any = {
          name: productName,
          description,
          features,
          category: category || 'Catalogue import Chine',
          tags: tags || ['import-chine'],
          image: finalImages[0] || '/placeholder.svg',
          gallery: finalGallery,
          descriptionImages: cleanDescriptionImages,
          price,
          b2bPrice,
          price1688: sourcePrice > 0 ? sourcePrice : undefined,
          price1688Currency: priced?.price1688Currency || 'CNY',
          exchangeRate: priced?.exchangeRate,
          marginRate: priced?.marginRate,
          serviceFeeRate: priced?.serviceFeeRate,
          insuranceRate: priced?.insuranceRate,
          currency: 'FCFA',
          condition: 'new',
          stockStatus: 'preorder',
          // Quantité disponible par défaut d'un produit importé (sur commande)
          stockQuantity: 100,
          requiresQuote,
          isPublished: autoPublish,
          weightKg,
          weightEstimated: weightEstimated || !volumeM3,
          lengthCm: hasCompleteDimensions ? lengthCm : undefined,
          widthCm: hasCompleteDimensions ? widthCm : undefined,
          heightCm: hasCompleteDimensions ? heightCm : undefined,
          volumeM3,
          specifications: (raw.specifications && typeof raw.specifications === 'object') ? raw.specifications : undefined,
          sourcing: {
            platform: source.platform,
            productUrl: source.url || rawSourceUrl,
            externalId: source.externalId,
            supplierName: raw.supplierName || undefined,
            ...(sourceSale ? {
              sourcePrice: sourceSale.salePrice,
              sourceCurrency: sourceSale.saleCurrency,
              inlandTransportCny: sourceSale.transportCny,
            } : {}),
          },
          ...(sourcePrice > 0 ? {
            priceHistory: [{ date: new Date(), price1688: sourcePrice, exchangeRate: priced?.exchangeRate, source: 'import' }],
            lastPriceCheckAt: new Date(),
          } : {}),
        }

        // Variantes si presentes
        if (variantGroups.length > 0) {
          productData.variantGroups = variantGroups
        }

        const created = await Product.create(productData)

        results.push({
          index: i,
          name: raw.name,
          success: true,
          productId: String(created._id),
          imagesOriginal: asList(raw.gallery).length + asList(raw.images).length + asList(raw.descriptionImages).length,
          imagesFiltered: finalImages.length,
          descriptionReformatted: enriched,
          pricing: typeof price === 'number' ? { price, b2bPrice: b2bPrice || 0 } : undefined,
        })
      } catch (err) {
        results.push({
          index: i,
          name: raw.name || '?',
          success: false,
          error: err instanceof Error ? err.message : 'Erreur inconnue',
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      imported: successCount,
      failed: failCount,
      total: rawProducts.length,
      results,
    })
  } catch (error) {
    console.error('Erreur smart-import:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
