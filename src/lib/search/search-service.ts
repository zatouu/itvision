/**
 * Pluggable catalog search service.
 *
 * For the MVP we default to a MongoDB-backed provider (regex + synonyms).
 * When MEILISEARCH_HOST / MEILISEARCH_API_KEY / MEILISEARCH_INDEX_NAME
 * are configured, the Meilisearch provider can be enabled instead.
 */

import { expandQuery } from './synonyms'
import { buildFacetStages, formatFacets } from './facets'

export interface CatalogSearchOptions {
  q?: string
  categorySlugs?: string[]
  categories?: string[]
  segment?: 'all' | 'import' | 'in_stock' | 'group_buy'
  availability?: 'all' | 'in_stock' | 'preorder' | 'out_of_stock'
  minPrice?: number
  maxPrice?: number
  onlyGroupBuy?: boolean
  onlyPrice?: boolean
  onlyQuote?: boolean
  minDeliveryDays?: number
  maxDeliveryDays?: number
  ids?: string[]
  includeFacets?: boolean
  sortBy?: string
}

export interface CatalogSearchResult {
  products: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  facets?: any
}

export interface CatalogSearchProvider {
  search(page: number, limit: number, options: CatalogSearchOptions): Promise<CatalogSearchResult>
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class MongoSearchProvider implements CatalogSearchProvider {
  private productModel: any

  constructor(productModel: any) {
    this.productModel = productModel
  }

  buildSearchMatch(q: string): Record<string, any> | null {
    const terms = expandQuery(q)
    if (terms.length === 0) return null

    const clauses = terms.map((term) => ({
      $or: [
        { name: { $regex: escapeRegex(term), $options: 'i' } },
        { tagline: { $regex: escapeRegex(term), $options: 'i' } },
        { description: { $regex: escapeRegex(term), $options: 'i' } },
        { tags: { $regex: escapeRegex(term), $options: 'i' } },
        { 'sourcing.title': { $regex: escapeRegex(term), $options: 'i' } },
      ],
    }))

    return clauses.length === 1 ? clauses[0] : { $and: clauses }
  }

  async search(
    page: number,
    limit: number,
    options: CatalogSearchOptions
  ): Promise<CatalogSearchResult> {
    throw new Error('Use the dedicated pipeline builder directly in the route for now')
  }
}

export class MeilisearchProvider implements CatalogSearchProvider {
  async search(): Promise<CatalogSearchResult> {
    throw new Error('Meilisearch provider not implemented yet. Configure MongoSearchProvider or implement this provider.')
  }
}

export function createSearchProvider(productModel: any): CatalogSearchProvider {
  const host = process.env.MEILISEARCH_HOST
  const apiKey = process.env.MEILISEARCH_API_KEY
  const index = process.env.MEILISEARCH_INDEX_NAME

  if (host && apiKey && index) {
    return new MeilisearchProvider()
  }

  return new MongoSearchProvider(productModel)
}

export { expandQuery, buildFacetStages, formatFacets }
