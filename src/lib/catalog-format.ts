import { computeProductPricing, type ShippingMethodId, type ShippingRate } from './logistics'
import { getPlatformExchangeRate } from './pricing/platform-rate'
import { resolveDisplayPrice } from './pricing/display-price'
import type { PricingDefaults } from './pricing/settings'
import { firstImage } from './media'

// Note: Les fonctions de pricing source sont réservées à l'usage admin interne

// Fiche technique publique : on écarte toute clé liée au fournisseur, au prix ou à la logistique source
const PRIVATE_SPEC_KEY = /prix|price|价|供应|supplier|fournisseur|vendeur|seller|shop|店|起批|批发|moq|库存|stock|发货|运费|shipping|lien|url|电话|phone|联系/i
function publicSpecifications(raw: unknown): [string, string][] {
  if (!raw || typeof raw !== 'object') return []
  const entries = raw instanceof Map ? [...raw.entries()] : Object.entries(raw as Record<string, unknown>)
  return entries
    .map(([k, v]) => [String(k).trim(), String(v ?? '').trim()] as [string, string])
    .filter(([k, v]) => k && v && k.length <= 60 && v.length <= 200 && !PRIVATE_SPEC_KEY.test(k))
    .slice(0, 40)
}

const normalizeGallery = (product: any): string[] => {
  if (Array.isArray(product.gallery) && product.gallery.length > 0) {
    return product.gallery
  }
  if (product.image) {
    return [product.image]
  }
  return ['/placeholder.svg']
}

  const normalizeTags = (product: any): string[] => {
    const raw = Array.isArray(product?.tags) ? product.tags : []
    const cleaned = raw
      .map((t: any) => (typeof t === 'string' ? t.trim() : ''))
      .filter(Boolean)
    if (cleaned.length > 0) return cleaned

    // Fallback: derive tag from condition for legacy products
    const condition = product?.condition
    if (condition === 'used') return ['occasion']
    if (condition === 'refurbished') return ['refurb']
    return []
  }

// Normalise les variantes avec prix (style 1688)
export const normalizeVariantGroups = (product: any, defaultExchangeRate = getPlatformExchangeRate()) => {
  if (!Array.isArray(product.variantGroups) || product.variantGroups.length === 0) {
    return []
  }

  // Prix client affiché par variante = coût sourcing variante × (1 + marge) —
  // même formule que le salePrice produit, mêmes règles que le devis serveur.
  const marginRate = typeof product.marginRate === 'number' && product.marginRate > 0 ? product.marginRate : 0
  const exchangeRate = typeof product.exchangeRate === 'number' && product.exchangeRate > 0 ? product.exchangeRate : defaultExchangeRate
  const variantSourcingFcfa = (v: any): number | null =>
    typeof v?.priceFCFA === 'number' && v.priceFCFA > 0 ? v.priceFCFA
      : typeof v?.price1688 === 'number' && v.price1688 > 0 ? Math.round(v.price1688 * exchangeRate)
      : null

  return product.variantGroups.map((group: any, gIdx: number) => ({
    name: group.name || 'Option',
    variants: Array.isArray(group.variants) ? group.variants.map((v: any, vIdx: number) => {
      const sourcing = variantSourcingFcfa(v)
      return {
        id: v.id || `var_${gIdx}_${vIdx}`,
        name: v.name || 'Variante',
        sku: v.sku || undefined,
        image: v.image || undefined,
        // Le prix source (price1688) n'est pas exposé au client, seulement priceFCFA
        priceFCFA: v.priceFCFA ?? undefined,
        // Prix unitaire client de la variante (marge incluse) — undefined = prix produit
        price: sourcing !== null ? Math.round(sourcing * (1 + marginRate / 100)) : undefined,
        stock: typeof v.stock === 'number' ? v.stock : undefined,
        isDefault: v.isDefault ?? false
      }
    }) : []
  })).filter((g: any) => g.variants.length > 0)
}

export const formatProductDetail = (
  product: any,
  shippingRates?: Record<ShippingMethodId, ShippingRate>,
  defaults?: PricingDefaults
) => {
  const pricing = computeProductPricing(product, shippingRates, undefined, defaults?.singleImportServiceFeeRate, defaults)

  // Les produits à variantes chiffrées sont éligibles : le join porte la
  // sélection de variante et les paliers sont mis à l'échelle du prix variante.
  const groupBuyEligible = product.groupBuyEnabled ?? false

  // Achat groupé: calcul du meilleur prix et discount (si activé)
  let groupBuyBestPrice: number | null = null
  let groupBuyDiscount: number | null = null
  if (groupBuyEligible && Array.isArray(product.priceTiers) && product.priceTiers.length > 0) {
    const basePrice = pricing.salePrice ?? pricing.baseCost ?? product.price ?? 0
    const bestTierPrice = Math.min(...product.priceTiers.map((t: any) => (typeof t?.price === 'number' ? t.price : Infinity)))
    if (Number.isFinite(bestTierPrice) && bestTierPrice < Infinity && basePrice > 0) {
      groupBuyBestPrice = bestTierPrice
      groupBuyDiscount = Math.round(((basePrice - bestTierPrice) / basePrice) * 100)
    }
  }

  return {
    id: String(product._id),
    name: product.name,
    tagline: product.tagline ?? null,
    description: product.description ?? null,
    category: product.category ?? 'Catalogue import Chine',
    condition: product.condition ?? 'new',
      tags: normalizeTags(product),
    image: product.image ?? '/placeholder.svg',
    gallery: normalizeGallery(product),
    descriptionImages: Array.isArray(product.descriptionImages) ? product.descriptionImages : [],
    features: Array.isArray(product.features) ? product.features : [],
    // Caractéristiques techniques clé/valeur issues de la fiche source (aucune donnée fournisseur/prix)
    specifications: publicSpecifications((product as any).specifications),
    colorOptions: Array.isArray(product.colorOptions) ? product.colorOptions : [],
    variantOptions: Array.isArray(product.variantOptions) ? product.variantOptions : [],
    // Variantes avec prix et images (style 1688)
    variantGroups: normalizeVariantGroups(product, defaults?.defaultExchangeRate),
    requiresQuote: product.requiresQuote ?? false,
    currency: pricing.currency,
    pricing,
    availability: {
      status: product.stockStatus ?? 'preorder',
      label: pricing.availabilityLabel,
      note: pricing.availabilitySubLabel ?? product.availabilityNote ?? null,
      stockQuantity: product.stockQuantity ?? 0,
      leadTimeDays: product.leadTimeDays ?? null
    },
    logistics: {
      weightKg: product.weightKg ?? product.grossWeightKg ?? null,
      weightEstimated: !!product.weightEstimated,
      packagingWeightKg: product.packagingWeightKg ?? null,
      volumeM3: product.volumeM3 ?? null,
      dimensions: product.lengthCm && product.widthCm && product.heightCm
        ? {
            lengthCm: product.lengthCm,
            widthCm: product.widthCm,
            heightCm: product.heightCm
          }
        : null
    },
    // Poids détaillés
    weights: {
      netWeightKg: product.netWeightKg ?? null,
      grossWeightKg: product.grossWeightKg ?? product.weightKg ?? null,
      packagingWeightKg: product.packagingWeightKg ?? null
    },
    // Note: Les détails de sourcing restent internes ; on expose uniquement un indicateur d'import
    isImported: !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao', 'aliexpress', 'xianyu', 'idlefish'].includes(product.sourcing.platform))),
    // Données de sourcing source réservées aux outils admin ; on ne les expose pas au client
    // Achat groupé (front)
    groupBuyEnabled: groupBuyEligible,
    groupBuyBestPrice,
    groupBuyDiscount,
    priceTiers: product.priceTiers ?? [],
    groupBuyMinQty: product.groupBuyMinQty ?? null,
    groupBuyTargetQty: product.groupBuyTargetQty ?? null,
    // Quantité minimum par commande standard (MOQ)
    minOrderQty: typeof product.minOrderQty === 'number' && product.minOrderQty > 0 ? product.minOrderQty : 1,
    // Prix wholesale B2B (activé à 5+ pcs ou compte Pro)
    b2bPrice: typeof product.b2bPrice === 'number' && product.b2bPrice > 0 ? product.b2bPrice : null,
    // Espace vendeur / storefront public
    sellerName: product.sellerName ?? null,
    sellerSlug: product.sellerSlug ?? null,
    sellerVerified: product.sellerVerified ?? false,
    sellerRating: product.sellerRating ?? null,
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null
  }
}

export const formatSimilarProducts = (
  products: any[],
  shippingRates?: Record<ShippingMethodId, ShippingRate>,
  defaults?: PricingDefaults
) => {
  return products.map((item) => {
    const pricing = computeProductPricing(item, shippingRates, undefined, defaults?.singleImportServiceFeeRate, defaults)
    const bestShipping = pricing.shippingOptions.length > 0
      ? pricing.shippingOptions.reduce((prev, current) => (prev.total <= current.total ? prev : current))
      : null

    return {
      id: String(item._id),
      name: item.name,
      tagline: item.tagline ?? null,
      category: item.category ?? 'Catalogue import Chine',
      condition: item.condition ?? 'new',
        tags: normalizeTags(item),
      image: firstImage(normalizeGallery(item)) ?? item.image ?? '/placeholder.svg',
      features: Array.isArray(item.features) ? item.features.slice(0, 3) : [],
      // Prix tout compris (marchandise + frais de service + assurance), cohérent
      // avec le catalogue et le devis serveur — `baseCost` seul sous-affichait.
      priceAmount: !item.requiresQuote ? resolveDisplayPrice(pricing, item.price) || null : null,
      currency: pricing.currency,
      requiresQuote: item.requiresQuote ?? false,
      availabilityStatus: item.stockStatus ?? 'preorder',
      availabilityLabel: pricing.availabilityLabel,
      shippingOptions: pricing.shippingOptions,
      deliveryDays: bestShipping?.durationDays ?? item.leadTimeDays ?? null
    }
  })
}
