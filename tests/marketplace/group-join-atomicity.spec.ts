import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'

/**
 * Régression — concurrence sur l'inscription à un achat groupé.
 *
 * L'ancien flux (findOne → push → save) perdait des participants et pouvait
 * dépasser maxQty/maxParticipants quand plusieurs joins arrivaient en
 * parallèle. Le claim atomique doit garantir :
 *  - currentQty ≤ maxQty
 *  - participants ≤ maxParticipants
 *  - aucun participant perdu : chaque 200 est bien enregistré
 *  - prix de palier appliqué à tous
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const PREFIX = 'E2E-JOIN-ATOMIC'

let anon: APIRequestContext
let productId: string
let groupId: string

test.describe('Achats groupés — atomicité du join', () => {
  test.beforeAll(async () => {
    await connectMongoose()
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })

    const product = await Product.create({
      name: `${PREFIX}-${Date.now()}`,
      category: 'marketplace-test',
      price: 10000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace'],
      stockStatus: 'in_stock',
      stockQuantity: 500,
      weightKg: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      groupBuyEnabled: true,
      groupBuyMinQty: 5,
      groupBuyTargetQty: 50,
      price1688Currency: 'FCFA',
      exchangeRate: 1,
    })
    productId = String(product._id)

    const group = await GroupOrder.create({
      groupId: `GRP-E2E-ATOMIC-${Date.now()}`,
      status: 'open',
      product: { productId: product._id, name: product.name, basePrice: 10000, currency: 'FCFA' },
      minQty: 5,
      targetQty: 50,
      currentQty: 0,
      maxQty: 10,
      maxParticipants: 3,
      priceTiers: [
        { minQty: 1, maxQty: 5, price: 10000 },
        { minQty: 6, maxQty: 20, price: 9000 },
      ],
      currentUnitPrice: 10000,
      participants: [],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      shippingMethod: 'air_15j',
      createdBy: { name: 'E2E Seed', phone: '+221770000009' },
    })
    groupId = group.groupId

    anon = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
  })

  test.afterAll(async () => {
    await GroupOrder.deleteMany({ groupId })
    await Product.deleteMany({ _id: productId })
    await anon?.dispose()
  })

  test('8 joins concurrents (qty 2, max 10) : aucun dépassement, aucun participant perdu', async () => {
    const attempts = Array.from({ length: 8 }, (_, i) => ({
      name: `E2E Concurrent ${i}`,
      phone: `+221771110${String(i).padStart(3, '0')}`,
      qty: 2,
    }))

    const responses = await Promise.all(
      attempts.map((payload) => anon.post(`/api/group-orders/${groupId}`, { data: payload }))
    )
    const statuses = responses.map((r) => r.status())
    const accepted = statuses.filter((s) => s === 200).length

    const group = await GroupOrder.findOne({ groupId }).lean() as any

    // Capacité respectée
    expect(group.currentQty).toBeLessThanOrEqual(10)
    expect(group.participants.length).toBeLessThanOrEqual(3)

    // Cohérence entre les réponses HTTP et l'état en base (aucune perte)
    expect(group.participants.length).toBe(accepted)
    expect(accepted).toBeGreaterThan(0)

    // Chaque participant accepté a bien été poussé avec un prix > 0
    for (const p of group.participants) {
      expect(p.unitPrice).toBeGreaterThan(0)
      expect(p.totalAmount).toBe(p.qty * p.unitPrice)
    }

    // Le total quantité doit correspondre à la somme des participants
    const sumQty = group.participants.reduce((s: number, p: any) => s + p.qty, 0)
    expect(group.currentQty).toBe(sumQty)
  })

  test('le prix de palier est appliqué à tous les participants du groupe', async () => {
    const group = await GroupOrder.findOne({ groupId }).lean() as any
    if (group.currentQty >= 6) {
      for (const p of group.participants) {
        expect(p.unitPrice).toBe(9000)
      }
      expect(group.currentUnitPrice).toBe(9000)
    } else {
      // Pas assez de quantité pour le 2e palier : le 1er s'applique
      for (const p of group.participants) {
        expect(p.unitPrice).toBe(10000)
      }
    }
  })

  test('un même téléphone ne peut pas rejoindre deux fois (même en concurrence)', async () => {
    const group = await GroupOrder.findOne({ groupId }).lean() as any
    if (group.participants.length >= 3) test.skip(true, 'capacité participants déjà atteinte')

    const payload = { name: 'E2E Doublon', phone: '+221779990001', qty: 1 }
    const [r1, r2] = await Promise.all([
      anon.post(`/api/group-orders/${groupId}`, { data: payload }),
      anon.post(`/api/group-orders/${groupId}`, { data: payload }),
    ])
    const accepted = [r1, r2].filter((r) => r.status() === 200).length
    expect(accepted).toBeLessThanOrEqual(1)

    const after = await GroupOrder.findOne({ groupId }).lean() as any
    const matches = (after.participants || []).filter((p: any) => p.phone === '+221779990001')
    expect(matches.length).toBeLessThanOrEqual(1)
  })
})
