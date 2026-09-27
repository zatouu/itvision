import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'

/**
 * Filet de non-régression — tunnel de commande invité (DDM+).
 *
 * Couvre : création de commande sans compte (prix relus en DB), décrément du
 * stock, suivi public masqué (aucune PII), suivi complet derrière le token,
 * et refus d'accès sans token ni session.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const PREFIX = 'E2E-CHECKOUT'

let anon: APIRequestContext
let productId: string
let orderId: string
let trackingToken: string

test.describe('Checkout invité — non-régression', () => {
  test.beforeAll(async () => {
    await connectMongoose()
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })

    const product = await Product.create({
      name: `${PREFIX}-${Date.now()}`,
      category: 'marketplace-test',
      price: 15000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace'],
      stockStatus: 'in_stock',
      stockQuantity: 10,
      weightKg: 2,
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
    })
    productId = String(product._id)

    anon = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
  })

  test.afterAll(async () => {
    await Order.deleteMany({ orderId: orderId ? orderId : /^CMD-/ })
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })
    await anon?.dispose()
  })

  test('une commande invité est créée avec les prix serveur', async () => {
    const res = await anon.post('/api/order', {
      data: {
        cart: [{ id: productId, qty: 2 }],
        name: 'E2E Checkout Client',
        phone: '+221771234000',
        email: 'e2e-checkout@itvision.sn',
        address: {
          region: 'Dakar',
          department: 'Dakar',
          neighborhood: 'Plateau',
          street: 'Rue E2E 1',
        },
        shippingMethod: 'air_15j',
      },
    })

    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.orderId).toMatch(/^CMD-/)
    orderId = body.orderId

    const match = String(body.confirmationUrl || '').match(/token=([^&]+)/)
    expect(match, 'token de suivi présent dans la réponse').toBeTruthy()
    trackingToken = decodeURIComponent(match![1])

    const order = await Order.findOne({ orderId }).lean() as any
    expect(order).toBeTruthy()
    expect(order.items[0].qty).toBe(2)
    // Le prix facturé vient de la DB, jamais du client
    expect(order.items[0].price).toBe(15000)
    expect(order.total).toBeGreaterThan(0)
    expect(order.paymentStatus).toBe('pending')
  })

  test('le stock est décrémenté et tracé (réservation d’inventaire)', async () => {
    const product = await Product.findById(productId).lean() as any
    expect(product.stockQuantity).toBe(8)

    const order = await Order.findOne({ orderId }).lean() as any
    expect(Array.isArray(order.inventoryReservations)).toBe(true)
    expect(order.inventoryReservations.length).toBe(1)
    expect(order.inventoryReservations[0].qty).toBe(2)
  })

  test('le suivi public masqué ne divulgue aucune PII', async () => {
    const res = await anon.get(`/api/order/track-public?ref=${orderId}`)
    expect(res.ok(), await res.text()).toBeTruthy()
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.order.orderId).toBe(orderId)

    const raw = JSON.stringify(body)
    expect(raw).not.toContain('+221771234000')
    expect(raw).not.toContain('e2e-checkout@itvision.sn')
    expect(body.order.total).toBeUndefined()
  })

  test('le détail complet exige le token (ou une session propriétaire)', async () => {
    const denied = await anon.get(`/api/order/${orderId}`)
    expect(denied.status()).toBe(401)

    const allowed = await anon.get(`/api/order/${orderId}?token=${encodeURIComponent(trackingToken)}`)
    expect(allowed.ok(), await allowed.text()).toBeTruthy()
    const body = await allowed.json()
    expect(body.order.orderId).toBe(orderId)
    expect(body.order.items.length).toBe(1)
  })

  test('un token invalide est refusé (404, sans divulguer l’existence)', async () => {
    const res = await anon.get(`/api/order/${orderId}?token=${'0'.repeat(43)}`)
    expect(res.status()).toBe(404)
  })
})
