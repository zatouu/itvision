import { CORPORATE_BRAND, CORPORATE_CONTACT, CORPORATE_SITE_URL, MARKET_BRAND, MARKET_SITE_URL } from '@/lib/branding'

const SITE_URL = MARKET_SITE_URL
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
  priceValidUntil?: string
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
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    alternateName: [MARKET_BRAND.name, MARKET_BRAND.fullName],
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    logo: `${SITE_URL}/branding/ddm-logo-favicon.svg`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: MARKET_BRAND.whatsapp.replace(/\s/g, ''),
      contactType: 'customer service',
      areaServed: 'SN',
      availableLanguage: ['French'],
    },
    sameAs: ['https://instagram.com/ddm_import', 'https://facebook.com/ddm.import'],
  }
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'fr-SN',
    publisher: { '@id': `${SITE_URL}/#organization` },
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

/** Fiche entreprise locale IT Vision Plus (résultats locaux « sécurité électronique Dakar »). */
export function buildCorporateLocalBusinessJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'ProfessionalService'],
      '@id': `${CORPORATE_SITE_URL}/#business`,
      name: CORPORATE_BRAND.name,
      alternateName: 'IT Vision',
      url: CORPORATE_SITE_URL,
      logo: `${CORPORATE_SITE_URL}/images/logo-it-vision.png`,
      image: `${CORPORATE_SITE_URL}/opengraph-image`,
      description:
        'Intégrateur en sécurité électronique au Sénégal : vidéosurveillance, contrôle d\'accès, alarme et sécurité incendie, domotique, câblage réseau et fibre optique, maintenance et digitalisation des PME.',
      telephone: CORPORATE_CONTACT.phone,
      email: CORPORATE_CONTACT.email,
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: CORPORATE_CONTACT.streetAddress,
        addressLocality: CORPORATE_CONTACT.city,
        addressCountry: CORPORATE_CONTACT.country,
      },
      areaServed: [
        { '@type': 'City', name: 'Dakar' },
        { '@type': 'Country', name: 'Sénégal' },
      ],
      contactPoint: [
        { '@type': 'ContactPoint', telephone: CORPORATE_CONTACT.phone, contactType: 'customer service', areaServed: 'SN', availableLanguage: ['French'] },
        { '@type': 'ContactPoint', telephone: CORPORATE_CONTACT.whatsapp.replace(/\s/g, ''), contactType: 'technical support', areaServed: 'SN', availableLanguage: ['French'] },
      ],
      knowsAbout: [
        'Vidéosurveillance', 'Contrôle d\'accès', 'Alarme intrusion', 'Sécurité incendie',
        'Domotique', 'Câblage réseau', 'Fibre optique', 'Maintenance des systèmes de sécurité',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${CORPORATE_SITE_URL}/#website`,
      name: CORPORATE_BRAND.name,
      url: CORPORATE_SITE_URL,
      inLanguage: 'fr-SN',
      publisher: { '@id': `${CORPORATE_SITE_URL}/#business` },
    },
  ]
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
    priceValidUntil,
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
    // Google n'accepte que les codes ISO 4217 : le franc CFA d'Afrique de l'Ouest est XOF
    priceCurrency: /^(F?CFA|F)$/i.test(currency) ? 'XOF' : currency,
    price: String(salePrice ?? price),
    ...(priceValidUntil ? { priceValidUntil } : {}),
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
