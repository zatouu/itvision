import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'

/**
 * Régression — Lot minimum (MOQ) de bout en bout.
 *
 * Le MOQ est un pilier de la promesse DDM+ : il doit être persisté, exposé par
 * le catalogue et BLOQUER le devis/checkout quand la quantité est insuffisante.
 * Avant ce test, `minOrderQty` n'était écrit par aucune API (pilier décoratif).
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const PREFIX = 'E2E-MOQ'

let anon: APIRequestContext
let moqProductId: string
let unitProductId: string

function baseProduct(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    category: 'marketplace-test',
    price: 10000,
    currency: 'FCFA',
    isPublished: true,
    channels: ['marketplace'],
    stockStatus: 'in_stock',
    stockQuantity: 100,
    weightKg: 1,
    features: [],
    colorOptions: [],
    variantOptions: [],
    gallery: [],
    descriptionImages: [],
    variantGroups: [],
    shippingOverrides: [],
    priceTiers: [],
    groupBuyEnabled: false,
    groupBuyMinQty: 1,
    groupBuyTargetQty: 1,
    price1688Currency: 'FCFA',
    exchangeRate: 1,
    ...extra,
  }
}

test.describe('MOQ — lot minimum appliqué au catalogue et au devis', () => {
  test.beforeAll(async () => {
    await connectMongoose()
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })

    const stamp = Date.now()
    const moqProduct = await Product.create(baseProduct(`${PREFIX}-Lot-${stamp}`, { minOrderQty: 5 }))
    const unitProduct = await Product.create(baseProduct(`${PREFIX}-Unite-${stamp}`, { minOrderQty: 1 }))
    moqProductId = String(moqProduct._id)
    unitProductId = String(unitProduct._id)

    anon = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
  })

  test.afterAll(async () => {
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })
    await anon?.dispose()
  })

  test('le champ est persisté (schéma unifié)', async () => {
    const doc = await Product.findById(moqProductId).lean() as any
    expect(doc.minOrderQty).toBe(5)
  })

  test('le catalogue expose minOrderQty', async () => {
    const res = await anon.get(`/api/catalog/products?ids=${moqProductId}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const item = (body.products || body.items || []).find((p: any) => String(p.id || p._id) === moqProductId)
    expect(item, 'produit présent dans la réponse catalogue').toBeTruthy()
    expect(item.minOrderQty).toBe(5)
  })

  test('le filtre catalogue moq=lot isole les produits vendus par lots', async () => {
    const res = await anon.get('/api/catalog/products?moq=lot&limit=100')
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const ids = (body.products || body.items || []).map((p: any) => String(p.id || p._id))
    expect(ids).toContain(moqProductId)
    expect(ids).not.toContain(unitProductId)
  })

  test('le devis refuse une quantité sous le lot minimum', async () => {
    const res = await anon.post('/api/pricing/quote', {
      data: { cart: [{ id: moqProductId, qty: 2 }], shippingMethod: 'air_15j' },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(String(body.error)).toContain('lot minimum de 5')
  })

  test('le devis accepte une quantité au niveau du lot minimum', async () => {
    const res = await anon.post('/api/pricing/quote', {
      data: { cart: [{ id: moqProductId, qty: 5 }], shippingMethod: 'air_15j' },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  test('un produit sans lot (MOQ = 1) reste commandable à l’unité', async () => {
    const res = await anon.post('/api/pricing/quote', {
      data: { cart: [{ id: unitProductId, qty: 1 }], shippingMethod: 'air_15j' },
    })
    expect(res.ok(), await res.text()).toBeTruthy()
  })
})
