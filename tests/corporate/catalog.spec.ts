import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import { createCorporateCatalogFixtures, cleanupCorporateCatalogFixtures } from '../helpers/db'

/**
 * Règle métier : le catalogue B2B IT Vision n'expose QUE les produits IT Vision.
 * Un produit de vendeur tiers (shopId) reste invisible côté corporate, même
 * s'il est taggé corporateVisible — sinon les clients B2B seraient mis en
 * concurrence directe avec les vendeurs DDM+.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

let anonCtx: APIRequestContext

test.beforeAll(async () => {
  anonCtx = await pwRequest.newContext({ baseURL })
  await createCorporateCatalogFixtures()
})

test.afterAll(async () => {
  await cleanupCorporateCatalogFixtures()
  await anonCtx?.dispose()
})

test.describe('Catalogue B2B — boutique ITV uniquement', () => {
  test('le produit IT Vision est visible', async () => {
    const res = await anonCtx.get('/api/corporate/products?q=E2E-CAT')
    expect(res.status()).toBe(200)
    const body = await res.json()
    const names: string[] = (body.items || []).map((i: any) => i.name)
    expect(names).toContain('E2E-CAT Camera IP ITV')
  })

  test('le produit d’un vendeur tiers est exclu, même taggé corporateVisible', async () => {
    const res = await anonCtx.get('/api/corporate/products?q=E2E-CAT')
    const body = await res.json()
    const names: string[] = (body.items || []).map((i: any) => i.name)
    expect(names).not.toContain('E2E-CAT Camera IP vendeur tiers')
  })
})
