import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'
import { defaultProductCategories } from '@/lib/data/default-categories'

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
 *     price1688?: number           // Prix fournisseur en Yuan
 *     category?: string
 *     features?: string[]
 *     variants?: Array<{ name: string; image?: string; price1688?: number }>
 *     weightKg?: number
 *     sourceUrl?: string           // URL produit source (1688, AliExpress)
 *     sourcePlatform?: string      // '1688' | 'aliexpress' | 'taobao'
 *   }>
 *   options?: {
 *     exchangeRate?: number        // Defaut: 85 FCFA/CNY
 *     serviceFeeRate?: number      // Defaut: 10%
 *     b2bDiscountPercent?: number  // Defaut: 15%
 *     reformatDescriptions?: boolean // Utiliser OpenAI pour reformater (defaut: true si OPENAI_API_KEY set)
 *     filterImages?: boolean       // Filtrer les images polluees (defaut: true)
 *     autoPublish?: boolean        // Publier directement (defaut: false)
 *   }
 */

// Patterns d'images a exclure (logos boutique, promos, icones paiement)
const IMAGE_BLACKLIST_PATTERNS = [
  /paypal/i, /visa/i, /mastercard/i, /alipay/i, /wechat.*pay/i,
  /logo/i, /banner/i, /promo/i, /coupon/i, /discount/i, /sale/i,
  /icon/i, /badge/i, /stamp/i, /watermark/i,
  /store.*logo/i, /shop.*logo/i, /brand.*logo/i,
  /customer.*service/i, /guarantee/i, /certification/i,
  /shipping.*free/i, /free.*shipping/i,
  /qrcode/i, /qr.*code/i, /wechat/i, /whatsapp/i,
  /\.gif$/i, // GIFs animees = presque toujours promo
]

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

function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return ''
  let clean = url.trim()
  if (!clean) return ''
  if (clean.startsWith('//')) clean = `https:${clean}`
  if (!/^https?:\/\//i.test(clean)) return ''
  clean = clean
    .replace(/_\d+x\d+[^.]*/i, '')
    .replace(/\.\d+x\d+\./i, '.')
    .replace(/\.search\..*$/i, '')
    .replace(/_q\d+\.jpg$/i, '.jpg')
  return clean
}

function filterProductImages(images: string[]): string[] {
  if (!Array.isArray(images)) return []

  const seen = new Set<string>()
  const out: string[] = []

  for (const source of images) {
    const url = normalizeImageUrl(source)
    if (!url) continue

    // Exclure les patterns blacklistes
    const urlLower = url.toLowerCase()
    let blacklisted = false
    for (const pattern of IMAGE_BLACKLIST_PATTERNS) {
      if (pattern.test(urlLower)) {
        blacklisted = true
        break
      }
    }
    if (blacklisted) continue

    // Exclure seulement les miniatures explicites très petites
    const dimMatch = urlLower.match(/(\d+)x(\d+)/)
    if (dimMatch) {
      const w = parseInt(dimMatch[1])
      const h = parseInt(dimMatch[2])
      if (w < 80 && h < 80) continue
    }

    // Exclure les favicons et petites icones
    if (urlLower.includes('favicon') || urlLower.includes('.ico')) continue

    const key = url.split('?')[0]
    if (seen.has(key)) continue
    seen.add(key)
    out.push(url)
  }

  return out
}

async function enrichProduct(
  raw: Record<string, unknown>
): Promise<{ name: string; category?: string; subCategory?: string; description: string; features: string[]; tags: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY
  const rawName = String(raw.name || '')
  const rawDescription = String(raw.description || '')

  // Fallback si pas d'API key ou nom vide
  if (!apiKey || !rawName.trim()) {
    return {
      name: rawName,
      description: rawDescription,
      features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
      tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : ['import-chine'],
    }
  }

  // Catégories IT Vision pour le prompt
  const categoriesList = defaultProductCategories
    .map((c) => `- ${c.name}${c.subCategories ? ` (${c.subCategories.map((s) => s.name).join(', ')})` : ''}`)
    .join('\n')

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant e-commerce pour un marketplace d'import Chine destiné à l'Afrique de l'Ouest francophone (Sénégal, Côte d'Ivoire).\nTu reçois les données brutes d'un produit importé depuis 1688 ou AliExpress.\nNettoie-les et retourne UNIQUEMENT un JSON valide sans markdown avec cette structure exacte :\n{ "name": "...", "category": "...", "subCategory": "...", "description": "...", "features": ["..."], "tags": ["..."] }\n\nRègles :\n- name : nom produit propre et vendeur en français (max 80 caractères). Traduis depuis le chinois/anglais. Conserve marque et modèle. Supprime spam, emojis excessifs, mentions vendeur/promo.\n- category : choisis EXACTEMENT une catégorie dans cette liste :\n${categoriesList}\n- subCategory : choisis une sous-catégorie pertinente parmi celles de la catégorie choisie, ou laisse vide.\n- description : 3-5 phrases claires en français, vendeuses, sans jargon inutile.\n- features : 4-8 bullet points courts en français.\n- tags : 3-6 tags pertinents en minuscules, en français.\nNe traduis pas les noms de marque. Supprime les infos inutiles (politique retour vendeur chinois, etc).`,
          },
          {
            role: 'user',
            content: `Nom brut: ${rawName.slice(0, 200)}\nDescription brute:\n${rawDescription.slice(0, 3000)}\nSpécifications:\n${JSON.stringify(raw.specifications || {}).slice(0, 2000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 700,
      }),
    })

    if (!response.ok) {
      console.error('OpenAI API error:', response.status)
      return {
        name: rawName,
        description: rawDescription,
        features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
        tags: ['import-chine'],
      }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()
    if (!content) {
      return {
        name: rawName,
        description: rawDescription,
        features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
        tags: ['import-chine'],
      }
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        name: rawName,
        description: rawDescription,
        features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
        tags: ['import-chine'],
      }
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      name: parsed.name || rawName,
      category: parsed.category || undefined,
      subCategory: parsed.subCategory || undefined,
      description: parsed.description || rawDescription,
      features: Array.isArray(parsed.features) ? parsed.features : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['import-chine'],
    }
  } catch (err) {
    console.error('Erreur enrichissement OpenAI:', err)
    return {
      name: rawName,
      description: rawDescription,
      features: Array.isArray(raw.features) ? (raw.features as string[]) : [],
      tags: ['import-chine'],
    }
  }
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
    const exchangeRate = opts.exchangeRate || 85
    const serviceFeeRate = opts.serviceFeeRate || 10
    const b2bDiscountPercent = opts.b2bDiscountPercent || 15
    const shouldEnrich = opts.reformatDescriptions !== false && !!process.env.OPENAI_API_KEY
    const shouldFilterImages = opts.filterImages !== false
    const autoPublish = opts.autoPublish === true

    await connectMongoose()

    const results: Array<{
      index: number
      name: string
      success: boolean
      productId?: string
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

        // 1. Filtrer les images
        const variantGroups = normalizeVariantGroups(raw.variantGroups, raw.variants)
        const variantImages = variantGroups.flatMap(group => group.variants.map(v => v.image).filter(Boolean))
        const mergedRawImages = [
          ...(Array.isArray(raw.images) ? raw.images : []),
          ...(Array.isArray(raw.gallery) ? raw.gallery : []),
          ...(Array.isArray(raw.descriptionImages) ? raw.descriptionImages : []),
          ...(Array.isArray(raw.imageCategories?.gallery) ? raw.imageCategories.gallery : []),
          ...(Array.isArray(raw.imageCategories?.description) ? raw.imageCategories.description : []),
          ...(Array.isArray(raw.imageCategories?.variant) ? raw.imageCategories.variant : []),
          ...variantImages,
        ]
        const rawImages = mergedRawImages.filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
        const cleanImages = shouldFilterImages
          ? filterProductImages(rawImages)
          : rawImages.map(normalizeImageUrl).filter(Boolean)
        // Limiter a 10 images max
        const finalImages = cleanImages.slice(0, 10)
        const cleanDescriptionImages = filterProductImages(Array.isArray(raw.descriptionImages) ? raw.descriptionImages : []).slice(0, 30)

        // 2. Enrichissement IA (nom + catégorie + description + features + tags)
        let productName = String(raw.name || '').trim()
        let description = String(raw.description || '')
        let features = Array.isArray(raw.features) ? raw.features : []
        let tags = Array.isArray(raw.tags) ? raw.tags : ['import-chine']
        let category = raw.category || undefined
        let enriched = false

        if (shouldEnrich) {
          const enrichedData = await enrichProduct(raw)
          productName = enrichedData.name || productName
          description = enrichedData.description || description
          features = enrichedData.features.length > 0 ? enrichedData.features : features
          tags = enrichedData.tags.length > 0 ? enrichedData.tags : tags
          category = enrichedData.category || category
          enriched = true
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

        // 3. Calculer le pricing
        const price1688 = toPositiveNumber(raw.price1688) || 0
        let baseCost: number | undefined
        let price: number = 0
        let b2bPrice: number = 0

        if (price1688 > 0) {
          baseCost = Math.round(price1688 * exchangeRate)
          // Prix retail = baseCost + frais de service + assurance
          const serviceFee = Math.round(baseCost * (serviceFeeRate / 100))
          const insurance = Math.round(baseCost * 0.025) // 2.5% assurance
          price = baseCost + serviceFee + insurance
          b2bPrice = Math.round(price * (1 - b2bDiscountPercent / 100))
        } else {
          const parsedPrice = toPositiveNumber(raw.price)
          if (parsedPrice) {
            price = parsedPrice
            b2bPrice = Math.round(price * (1 - b2bDiscountPercent / 100))
          }
        }

        const weightKg = toPositiveNumber(raw.weightKg)
        const lengthCm = toPositiveNumber(raw.lengthCm)
        const widthCm = toPositiveNumber(raw.widthCm)
        const heightCm = toPositiveNumber(raw.heightCm)
        const hasCompleteDimensions = Boolean(lengthCm && widthCm && heightCm)
        const explicitVolume = toPositiveNumber(raw.volumeM3)
        const computedVolume = hasCompleteDimensions
          ? Number((((lengthCm as number) * (widthCm as number) * (heightCm as number)) / 1_000_000).toFixed(3))
          : undefined
        const volumeM3 = explicitVolume || computedVolume
        const hasImportLogistics = Boolean(weightKg && (volumeM3 || hasCompleteDimensions))
        const sourcePlatform = typeof raw.sourcePlatform === 'string' ? raw.sourcePlatform.toLowerCase() : '1688'
        const requiresQuote = Boolean(raw.requiresQuote) || !hasImportLogistics || price <= 0

        // 4. Creer le produit
        const productData: any = {
          name: productName,
          description,
          features,
          category: category || 'Catalogue import Chine',
          tags: tags || ['import-chine'],
          image: finalImages[0] || '/placeholder.svg',
          gallery: finalImages,
          descriptionImages: cleanDescriptionImages,
          price,
          baseCost,
          b2bPrice,
          price1688: price1688 > 0 ? price1688 : undefined,
          price1688Currency: 'CNY',
          exchangeRate,
          serviceFeeRate,
          insuranceRate: 2.5,
          currency: 'FCFA',
          condition: 'new',
          stockStatus: 'preorder',
          requiresQuote,
          isPublished: autoPublish,
          weightKg,
          lengthCm: hasCompleteDimensions ? lengthCm : undefined,
          widthCm: hasCompleteDimensions ? widthCm : undefined,
          heightCm: hasCompleteDimensions ? heightCm : undefined,
          volumeM3,
          specifications: (raw.specifications && typeof raw.specifications === 'object') ? raw.specifications : undefined,
          sourcing: {
            platform: sourcePlatform,
            productUrl: raw.sourceUrl || undefined,
            supplierName: raw.supplierName || undefined,
          },
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
          imagesOriginal: rawImages.length,
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
