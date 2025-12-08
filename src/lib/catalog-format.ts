import { computeProductPricing } from './logistics'
import { simulatePricingFromProduct } from './pricing1688.refactored'

const normalizeGallery = (product: any): string[] => {
  if (Array.isArray(product.gallery) && product.gallery.length > 0) {
    return product.gallery
  }
  if (product.image) {
    return [product.image]
  }
  return ['/file.svg']
}

export const formatProductDetail = (product: any) => {
  const pricing = computeProductPricing(product)

  return {
    id: String(product._id),
    name: product.name,
    tagline: product.tagline ?? null,
    description: product.description ?? null,
    category: product.category ?? 'Catalogue import Chine',
    image: product.image ?? '/file.svg',
    gallery: normalizeGallery(product),
    features: Array.isArray(product.features) ? product.features : [],
    colorOptions: Array.isArray(product.colorOptions) ? product.colorOptions : [],
    variantOptions: Array.isArray(product.variantOptions) ? product.variantOptions : [],
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
      weightKg: product.weightKg ?? null,
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
    sourcing: product.sourcing ? {
      platform: product.sourcing.platform ?? null,
      supplierName: product.sourcing.supplierName ?? null,
      supplierContact: product.sourcing.supplierContact ?? null,
      productUrl: product.sourcing.productUrl ?? null,
      notes: product.sourcing.notes ?? null
    } : null,
    // Informations 1688 avec breakdown
    pricing1688: product.price1688 ? (() => {
      const pricing1688Data = {
        price1688: product.price1688,
        price1688Currency: product.price1688Currency ?? 'CNY',
        exchangeRate: product.exchangeRate ?? 100,
        serviceFeeRate: product.serviceFeeRate ?? null,
        insuranceRate: product.insuranceRate ?? null
      }
      
      // Calculer le breakdown si transport disponible
      let breakdown = undefined
      if (pricing.shippingOptions.length > 0) {
        const defaultShipping = pricing.shippingOptions[0]
        try {
          const simulation = simulatePricingFromProduct(
            {
              price1688: product.price1688,
              baseCost: product.baseCost,
              exchangeRate: product.exchangeRate,
              serviceFeeRate: product.serviceFeeRate as any,
              insuranceRate: product.insuranceRate,
              weightKg: product.weightKg,
              volumeM3: product.volumeM3,
              shippingOverrides: product.shippingOverrides as any
            },
            {
              shippingMethod: defaultShipping.id as any,
              orderQuantity: 1
            }
          )
          breakdown = simulation
        } catch (error) {
          console.error('Erreur calcul breakdown pricing1688:', error)
        }
      }
      
      return {
        ...pricing1688Data,
        breakdown
      }
    })() : null,
    createdAt: product.createdAt ?? null,
    updatedAt: product.updatedAt ?? null
  }
}

export const formatSimilarProducts = (products: any[]) => {
  return products.map((item) => {
    const pricing = computeProductPricing(item)
    const bestShipping = pricing.shippingOptions.length > 0
      ? pricing.shippingOptions.reduce((prev, current) => (prev.total <= current.total ? prev : current))
      : null

    return {
      id: String(item._id),
      name: item.name,
      tagline: item.tagline ?? null,
      category: item.category ?? 'Catalogue import Chine',
      image: normalizeGallery(item)[0] ?? '/file.svg',
      features: Array.isArray(item.features) ? item.features.slice(0, 3) : [],
      priceAmount: !item.requiresQuote ? (bestShipping?.total ?? pricing.salePrice) : null,
      currency: pricing.currency,
      requiresQuote: item.requiresQuote ?? false,
      availabilityStatus: item.stockStatus ?? 'preorder',
      availabilityLabel: pricing.availabilityLabel,
      shippingOptions: pricing.shippingOptions,
      deliveryDays: bestShipping?.durationDays ?? item.leadTimeDays ?? null
    }
  })
}
