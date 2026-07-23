import { getRedisClient } from './redis'

const CATALOG_PRODUCTS_PREFIX = 'catalog:v1:'
const CATEGORIES_KEY = 'catalog:categories:v1'
const PRODUCT_CATEGORIES_KEY = 'catalog:product-categories:v1'
const PRODUCT_CATEGORIES_TTL = 300 // 5 min

export async function getProductCategoriesCache(): Promise<any | null> {
  const redis = getRedisClient()
  if (!redis || redis.status !== 'ready') return null
  try {
    const data = await redis.get(PRODUCT_CATEGORIES_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export async function setProductCategoriesCache(payload: any): Promise<void> {
  const redis = getRedisClient()
  if (!redis || redis.status !== 'ready') return
  try {
    await redis.set(PRODUCT_CATEGORIES_KEY, JSON.stringify(payload), 'EX', PRODUCT_CATEGORIES_TTL)
  } catch {
    // ignore
  }
}

export async function invalidateCatalogCache(): Promise<void> {
  const redis = getRedisClient()
  if (!redis || redis.status !== 'ready') return

  try {
    await redis.del(CATEGORIES_KEY)
    await redis.del(PRODUCT_CATEGORIES_KEY)

    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${CATALOG_PRODUCTS_PREFIX}*`, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.unlink(keys)
      }
    } while (cursor !== '0')
  } catch (e) {
    console.error('[catalog-cache] invalidateCatalogCache error', e)
  }
}
