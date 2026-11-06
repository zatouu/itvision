import { IProductCategory, ILocalizedString, ILocalizedKeywords } from '../models/ProductCategory'

export interface ApiSubCategory {
  slug: string
  name: string
  labelFr: string
  icon: string
  // Taxonomy extras
  level?: number
  isLeaf?: boolean
  image?: string
  requiredAttributes?: string[]
  optionalAttributes?: string[]
  searchFilters?: string[]
  allowedUnits?: string[]
}

export interface ApiCategoryItem {
  slug: string
  name: string
  labelFr: string
  labelEn?: string
  labelWo?: string
  icon: string
  color: string
  description?: string
  subCategories: ApiSubCategory[]
  count?: number
  // Taxonomy v2 metadata
  taxonomy: {
    id: string
    level: number
    isLeaf: boolean
    image?: string
    seoTitle?: ILocalizedString
    seoDescription?: ILocalizedString
    keywords?: ILocalizedKeywords
    synonyms?: Partial<ILocalizedKeywords>
    typos?: string[]
    closeCategories?: string[]
    allowedUnits: string[]
    requiredAttributes: string[]
    optionalAttributes: string[]
    searchFilters: string[]
    supportsWholesale: boolean
    supportsDropshipping: boolean
    supportsGroupBuying: boolean
    commissionRate: number
  }
}

export function formatCategoryForApi(c: IProductCategory, count?: number): ApiCategoryItem {
  const subCategories = (c.subCategories || []).map(s => ({
    slug: s.slug,
    name: s.name,
    labelFr: s.labelFr,
    icon: s.icon || 'tag',
    level: 2,
    isLeaf: true,
    requiredAttributes: c.requiredAttributes,
    optionalAttributes: c.optionalAttributes,
    searchFilters: c.searchFilters,
    allowedUnits: c.allowedUnits,
  }))

  return {
    slug: c.slug,
    name: c.name,
    labelFr: c.labelFr,
    labelEn: c.labelEn,
    labelWo: c.labelWo,
    icon: c.icon || 'tag',
    color: c.color || '#f97316',
    description: c.description,
    subCategories,
    count,
    taxonomy: {
      id: c.taxonomyId || c.slug,
      level: c.level || 1,
      isLeaf: c.isLeaf || false,
      image: c.image,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      keywords: c.keywords,
      synonyms: c.synonyms,
      typos: c.typos || [],
      closeCategories: c.closeCategories || [],
      allowedUnits: c.allowedUnits || ['piece'],
      requiredAttributes: c.requiredAttributes || [],
      optionalAttributes: c.optionalAttributes || [],
      searchFilters: c.searchFilters || [],
      supportsWholesale: c.supportsWholesale ?? true,
      supportsDropshipping: c.supportsDropshipping ?? true,
      supportsGroupBuying: c.supportsGroupBuying ?? true,
      commissionRate: c.commissionRate ?? 0.08,
    }
  }
}

export function aggregateProductCounts(categories: IProductCategory[], rawCounts: { _id: string; count: number }[]): Map<string, number> {
  const countMap = new Map<string, number>()
  for (const c of categories) {
    countMap.set(c.slug, 0)
  }

  for (const row of rawCounts) {
    const slug = String(row._id)
    countMap.set(slug, (countMap.get(slug) || 0) + Number(row.count || 0))
  }

  // Propagate leaf counts up to parents
  const bySlug = new Map<string, IProductCategory>()
  for (const c of categories) bySlug.set(c.slug, c)

  for (const c of categories) {
    if (!c.isLeaf || !c.parentSlug) continue
    const direct = countMap.get(c.slug) || 0
    let parent = bySlug.get(c.parentSlug)
    while (parent) {
      countMap.set(parent.slug, (countMap.get(parent.slug) || 0) + direct)
      parent = parent.parentSlug ? bySlug.get(parent.parentSlug) : undefined
    }
  }

  return countMap
}
