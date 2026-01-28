import { computeProductPricing, type ShippingMethodId, type ShippingRate } from './logistics'
// Note: Les fonctions de pricing source sont réservées à l'usage admin interne

const normalizeGallery = (product: any): string[] => {
  if (Array.isArray(product.gallery) && product.gallery.length > 0) {
    return product.gallery
  }
  if (product.image) {
    return [product.image]
  }
  return ['/file.svg']
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
const normalizeVariantGroups = (product: any) => {
  if (!Array.isArray(product.variantGroups) || product.variantGroups.length === 0) {
    return []
  }
  
  return product.variantGroups.map((group: any) => ({
    name: group.name || 'Option',
    variants: Array.isArray(group.variants) ? group.variants.map((v: any) => ({
      id: v.id || `var_${Math.random().toString(36).slice(2)}`,
      name: v.name || 'Variante',
      sku: v.sku || undefined,
      image: v.image || undefined,
      // Le prix source (price1688) n'est pas exposé au client, seulement priceFCFA
      priceFCFA: v.priceFCFA ?? undefined,
      stock: v.stock ?? 0,
      isDefault: v.isDefault ?? false
    })) : []
  })).filter((g: any) => g.variants.length > 0)
}

export const formatProductDetail = (
  product: any,
  shippingRates?: Record<ShippingMethodId, ShippingRate>
) => {
  const pricing = computeProductPricing(product, shippingRates)

  // Achat groupé: calcul du meilleur prix et discount (si activé)
  let groupBuyBestPrice: number | null = null
  let groupBuyDiscount: number | null = null
  if (product.groupBuyEnabled && Array.isArray(product.priceTiers) && product.priceTiers.length > 0) {
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
    image: product.image ?? '/file.svg',
    gallery: normalizeGallery(product),
    features: Array.isArray(product.features) ? product.features : [],
    colorOptions: Array.isArray(product.colorOptions) ? product.colorOptions : [],
    variantOptions: Array.isArray(product.variantOptions) ? product.variantOptions : [],
    // Variantes avec prix et images (style 1688)
    variantGroups: normalizeVariantGroups(product),
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
    // Note: Les informations de sourcing et prix source ne sont pas exposées au client
    // Seul indicateur: si le produit est importé
    isImported: !!(product.price1688 || (product.sourcing?.platform && ['1688', 'alibaba', 'taobao', 'xianyu', 'idlefish'].includes(product.sourcing.platform))),
    // Exposer les infos simplifiées pour le simulateur 1688 si disponibles
    pricing1688: product.price1688 ? {
      price1688: product.price1688,
      price1688Currency: 'CNY', // ou product.currencySource
      exchangeRate: product.exchangeRate || 100, // Fallback safe
      serviceFeeRate: product.serviceFeeRate || 10,
      insuranceRate: product.insuranceRate || 0
    } : null,
    // Achat groupé (front)
    groupBuyEnabled: product.groupBuyEnabled ?? false,
    groupBuyBestPrice,
    groupBuyDiscount,
    priceTiers: product.priceTiers ?? [],
    groupBuyMinQty: product.groupBuyMinQty ?? null,
    groupBuyTargetQty: product.groupBuyTargetQty ?? null,
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null
  }
}

export const formatSimilarProducts = (
  products: any[],
  shippingRates?: Record<ShippingMethodId, ShippingRate>
) => {
  return products.map((item) => {
    const pricing = computeProductPricing(item, shippingRates)
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
      image: normalizeGallery(item)[0] ?? '/file.svg',
      features: Array.isArray(item.features) ? item.features.slice(0, 3) : [],
      // Listing: afficher uniquement le prix source (baseCost) si présent, sinon fallback sur salePrice
      priceAmount: !item.requiresQuote ? (pricing.baseCost ?? pricing.salePrice) : null,
      currency: pricing.currency,
      requiresQuote: item.requiresQuote ?? false,
      availabilityStatus: item.stockStatus ?? 'preorder',
      availabilityLabel: pricing.availabilityLabel,
      shippingOptions: pricing.shippingOptions,
      deliveryDays: bestShipping?.durationDays ?? item.leadTimeDays ?? null
    }
  })
}
