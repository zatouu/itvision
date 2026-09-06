import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import {
  createNamespaceTestProducts,
  createNamespaceTestProvider,
  cleanupNamespaceTestData
} from '../helpers/db'

/**
 * Tests de régression pour les endpoints namespaces API.
 * Vérifie que les catalogues et listes publics sont bien isolés par domaine.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

let anonCtx: APIRequestContext
let productIds: {
  marketplaceId: string
  corporateId: string
  bothId: string
  fallbackId: string
  hiddenId: string
}
let provider: { userId: string; providerId: string }

async function fetchJson(ctx: APIRequestContext, url: string) {
  const res = await ctx.get(url)
  expect(res.ok(), `${url} failed: ${res.status()}`).toBeTruthy()
  return res.json()
}

function expectItemIds(items: any[], expectedIds: string[]) {
  const ids = items.map((item: any) => String(item._id || item.id))
  for (const expectedId of expectedIds) {
    expect(ids).toContain(expectedId)
  }
}

function expectItemIdsNotPresent(items: any[], unexpectedIds: string[]) {
  const ids = items.map((item: any) => String(item._id || item.id))
  for (const unexpectedId of unexpectedIds) {
    expect(ids).not.toContain(unexpectedId)
  }
}

test.describe('Namespace API endpoints', () => {
  test.beforeAll(async () => {
    // État vide : sinon le cookie auth-token du storageState du projet
    // ferait passer les appels « anonymes » pour authentifiés.
    anonCtx = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    productIds = await createNamespaceTestProducts()
    provider = await createNamespaceTestProvider()
  })

  test.afterAll(async () => {
    await cleanupNamespaceTestData()
    await anonCtx.dispose()
  })

  test('GET /api/market/products returns marketplace products only', async () => {
    const data = await fetchJson(anonCtx, '/api/market/products?limit=100')
    expect(data.success).toBe(true)
    expect(data.domain).toBe('marketplace')

    expectItemIds(data.items, [productIds.marketplaceId, productIds.bothId])
    expectItemIdsNotPresent(data.items, [
      productIds.corporateId,
      productIds.fallbackId,
      productIds.hiddenId
    ])
  })

  test('GET /api/market/products filters by category', async () => {
    const data = await fetchJson(anonCtx, '/api/market/products?category=marketplace-test')
    expect(data.success).toBe(true)
    expectItemIds(data.items, [productIds.marketplaceId])
    expectItemIdsNotPresent(data.items, [productIds.bothId])
  })

  test('GET /api/corporate/products returns corporate products and fallback', async () => {
    const data = await fetchJson(anonCtx, '/api/corporate/products?limit=100')
    expect(data.success).toBe(true)
    expect(data.domain).toBe('corporate')

    expectItemIds(data.items, [
      productIds.corporateId,
      productIds.bothId,
      productIds.fallbackId
    ])
    expectItemIdsNotPresent(data.items, [
      productIds.marketplaceId,
      productIds.hiddenId
    ])
  })

  test('GET /api/corporate/products filters by category', async () => {
    const data = await fetchJson(anonCtx, '/api/corporate/products?category=dahua')
    expect(data.success).toBe(true)
    expectItemIds(data.items, [productIds.fallbackId])
    expectItemIdsNotPresent(data.items, [
      productIds.corporateId,
      productIds.bothId,
      productIds.marketplaceId
    ])
  })

  test('GET /api/corporate/products filters by search query', async () => {
    const data = await fetchJson(anonCtx, '/api/corporate/products?q=Corporate')
    expect(data.success).toBe(true)
    expectItemIds(data.items, [productIds.corporateId])
  })

  test('GET /api/services/providers returns public provider list', async () => {
    const data = await fetchJson(anonCtx, '/api/services/providers')
    expect(data.success).toBe(true)
    expect(data.domain).toBe('services')
    expectItemIds(data.items, [provider.providerId])
  })

  test('GET /api/services/providers filters by category', async () => {
    const data = await fetchJson(anonCtx, '/api/services/providers?category=vidéosurveillance')
    expect(data.success).toBe(true)
    expectItemIds(data.items, [provider.providerId])
  })

  test('GET /api/services/providers filters by city', async () => {
    const data = await fetchJson(anonCtx, '/api/services/providers?city=Dakar')
    expect(data.success).toBe(true)
    expectItemIds(data.items, [provider.providerId])
  })

  test('GET /api/services/providers filters by category and city', async () => {
    const data = await fetchJson(
      anonCtx,
      '/api/services/providers?category=maintenance&city=dakar'
    )
    expect(data.success).toBe(true)
    expectItemIds(data.items, [provider.providerId])
  })

  test('GET /api/services/providers returns empty for unknown category', async () => {
    const data = await fetchJson(anonCtx, '/api/services/providers?category=plomberie')
    expect(data.success).toBe(true)
    expect(data.items.length).toBe(0)
  })
})
