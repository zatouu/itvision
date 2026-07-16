const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'
const SITE_NAME = 'DDM+ Marketplace'
const SITE_DESCRIPTION = 'Marketplace d\'import direct Chine et d\'achats groupés au Sénégal.'

export interface StructuredDataProductInput {
  id: string
  name: string
  description?: string | null
  tagline?: string | null
  category?: string | null
  image?: string | null
  currency?: string
  price: number
  salePrice?: number
  availability: 'InStock' | 'PreOrder' | 'OutOfStock'
  url: string
  sku?: string
  brand?: string
  condition?: 'New' | 'Used' | 'Refurbished'
  reviewCount?: number
  reviewRating?: number
  breadcrumbs?: { name: string; url: string }[]
  faqs?: { question: string; answer: string }[]
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/branding/ddm-logo-favicon.svg`,
    sameAs: [
      // Ajouter les vrais réseaux sociaux quand disponibles
    ],
  }
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/produits?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildProductJsonLd(input: StructuredDataProductInput) {
  const {
    id,
    name,
    description,
    tagline,
    category,
    image,
    currency = 'FCFA',
    price,
    salePrice,
    availability,
    url,
    sku,
    brand = 'DDM+',
    condition = 'New',
    reviewCount,
    reviewRating,
    breadcrumbs,
    faqs,
  } = input

  const images = image ? [image] : undefined

  const offer = {
    '@type': 'Offer',
    url,
    priceCurrency: currency,
    price: String(salePrice ?? price),
    availability: `https://schema.org/${availability}`,
    itemCondition: `https://schema.org/${condition}Condition`,
    seller: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }

  const aggregateRating =
    reviewCount && reviewCount > 0 && reviewRating
      ? {
          '@type': 'AggregateRating',
          ratingValue: String(reviewRating.toFixed(1)),
          reviewCount: String(reviewCount),
          bestRating: '5',
          worstRating: '1',
        }
      : undefined

  const product: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: description || tagline || undefined,
    image: images,
    sku: sku || id,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    category: category || undefined,
    offers: offer,
  }

  if (aggregateRating) {
    product.aggregateRating = aggregateRating
  }

  const schemas: Record<string, any>[] = [product]

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(buildBreadcrumbJsonLd(breadcrumbs))
  }

  if (faqs && faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    })
  }

  return schemas
}

export function buildItemListJsonLd(items: { name: string; url: string; image?: string }[], listName = 'Catalogue') {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
      image: item.image,
    })),
  }
}
