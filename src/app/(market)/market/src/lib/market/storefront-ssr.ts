// Pré-rendu serveur de la vitrine DDM+ (SEO) : réutilise les handlers GET publics tels quels,
// sans aller-retour HTTP. En cas de lenteur ou d'erreur, la page retombe sur le chargement client.
import { cache } from 'react'
import { NextRequest } from 'next/server'
import { GET as getCatalogProducts } from '@/app/api/catalog/products/route'
import { GET as getCatalogCategories } from '@/app/api/catalog/categories/route'
import { GET as getCategoryHighlights } from '@/app/api/catalog/category-highlights/route'
import { GET as getGroupOrders } from '@/app/api/group-orders/route'
import { GET as getGroupStats } from '@/app/api/group-orders/stats/route'
import { GET as getPromoSlides } from '@/app/api/promo-slides/route'
import { mapHomeResults, type HomeData } from '@/components/market/storefront/home-data'
import { buildCatalogParams, type CatalogFilters } from '@/components/market/storefront/catalog-query'
import { mapCatalogItem, mapCategory } from '@/components/market/storefront/data-mappers'
import type { CatalogInitialData } from '@/components/market/storefront/screens/ScreenCatalog'
import type { Category } from '@/components/market/storefront/types'

const SSR_TIMEOUT_MS = 2500

const internalRequest = (path: string) => new NextRequest(new URL(path, 'http://ssr.internal'))

async function readJson(call: () => Promise<Response>): Promise<any | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), SSR_TIMEOUT_MS) })
    const response = await Promise.race([call(), timeout])
    if (!response || !response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function loadHomeInitialData(): Promise<HomeData | null> {
  const [productData, groupData, categoryData, slideData, dealData, statsData] = await Promise.all([
    readJson(() => getCatalogProducts(internalRequest('/api/catalog/products?limit=12&compact=1'))),
    readJson(() => getGroupOrders(internalRequest('/api/group-orders?limit=6&status=open'))),
    readJson(() => getCategoryHighlights()),
    readJson(() => getPromoSlides(internalRequest('/api/promo-slides'))),
    readJson(() => getCatalogProducts(internalRequest('/api/catalog/products?limit=12&compact=1&sortBy=groupbuy-discount-desc'))),
    readJson(() => getGroupStats()),
  ])
  // Sans produits, mieux vaut laisser le client charger (et afficher sa relance) que figer une page vide
  if (!productData) return null
  return mapHomeResults({ productData, groupData, categoryData, slideData, dealData, statsData })
}

export const loadCatalogCategories = cache(async (): Promise<Category[]> => {
  const data = await readJson(() => getCatalogCategories())
  const items = data?.categories ?? data?.items
  return Array.isArray(items) ? items.map(mapCategory) : []
})

export async function loadCatalogInitialData(filters: CatalogFilters): Promise<CatalogInitialData | null> {
  const params = buildCatalogParams(1, filters)
  const [data, categories] = await Promise.all([
    readJson(() => getCatalogProducts(internalRequest(`/api/catalog/products?${params}`))),
    loadCatalogCategories(),
  ])
  const items = data?.products ?? data?.items
  if (!Array.isArray(items)) return null
  return {
    filters,
    products: items.map(mapCatalogItem),
    total: data?.pagination?.total ?? items.length,
    hasMore: data?.pagination?.hasMore ?? false,
    categories,
  }
}
