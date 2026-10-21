import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Product from '@/lib/models/Product'
import { GroupOrder } from '@/lib/models/GroupOrder'

/**
 * Régression sécurité — « guest checkout ».
 *
 * Un visiteur qui fournit le téléphone/email d'un compte EXISTANT ne doit
 * JAMAIS recevoir de session pour ce compte (prise de contrôle sinon : le
 * numéro d'un vendeur est public sur sa vitrine).
 *
 * Couvre :
 *  - POST /api/auth/guest-checkout   (endpoint dédié)
 *  - POST /api/group-orders/:id      (join invité, même helper)
 *  - le flux invité légitime (contact inconnu) reste fonctionnel
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

const VICTIM_PHONE = '+221771234567'
const VICTIM_EMAIL = 'e2e-market-victim@itvision.sn'
const FRESH_PHONE = '+221779876543'

let anon: APIRequestContext
let victimId: string
let productId: string
let groupId: string

test.describe('Sécurité — sessions invitées (marketplace)', () => {
  test.beforeAll(async () => {
    await connectMongoose()

    await User.deleteMany({ $or: [{ email: VICTIM_EMAIL }, { phone: VICTIM_PHONE }, { phone: FRESH_PHONE }] })

    const victim = await User.create({
      email: VICTIM_EMAIL,
      username: `e2e-victim-${Date.now()}`,
      name: 'E2E Victime',
      passwordHash: 'x'.repeat(60),
      phone: VICTIM_PHONE,
      role: 'VENDOR',
      isActive: true,
    })
    victimId = String(victim._id)

    const product = await Product.create({
      name: `E2E-GUEST-SECURITY-${Date.now()}`,
      category: 'marketplace-test',
      price: 10000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace'],
      stockStatus: 'in_stock',
      stockQuantity: 100,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: true,
      groupBuyMinQty: 5,
      groupBuyTargetQty: 50,
      price1688Currency: 'FCFA',
      exchangeRate: 1,
    })
    productId = String(product._id)

    const group = await GroupOrder.create({
      groupId: `GRP-E2E-${Date.now()}`,
      status: 'open',
      product: {
        productId: product._id,
        name: product.name,
        basePrice: 10000,
        currency: 'FCFA',
      },
      minQty: 5,
      targetQty: 50,
      currentQty: 0,
      priceTiers: [],
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
    await User.deleteMany({ $or: [{ email: VICTIM_EMAIL }, { phone: VICTIM_PHONE }, { phone: FRESH_PHONE }] })
    await GroupOrder.deleteMany({ groupId })
    await Product.deleteMany({ _id: productId })
    await anon?.dispose()
  })

  test('guest-checkout refuse une session sur un compte existant (409, aucun cookie)', async () => {
    const res = await anon.post('/api/auth/guest-checkout', {
      data: { name: 'Attaquant', phone: VICTIM_PHONE },
    })

    expect(res.status(), 'doit refuser sans preuve de possession du numéro').toBe(409)
    const body = await res.json()
    expect(body.code).toBe('ACCOUNT_EXISTS')

    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.some((c) => c.value.includes('auth-token='))).toBe(false)
  })

  test('guest-checkout refuse aussi via un email de compte existant', async () => {
    const res = await anon.post('/api/auth/guest-checkout', {
      data: { name: 'Attaquant', phone: '+221770000123', email: VICTIM_EMAIL },
    })

    expect(res.status()).toBe(409)
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.some((c) => c.value.includes('auth-token='))).toBe(false)
  })

  test('join d’achat groupé : participe en invité sans session sur le compte existant', async () => {
    const res = await anon.post(`/api/group-orders/${groupId}`, {
      data: { name: 'E2E Victime', phone: VICTIM_PHONE, qty: 2 },
    })

    expect(res.ok(), await res.text()).toBeTruthy()

    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.some((c) => c.value.includes('auth-token='))).toBe(false)

    const group = await GroupOrder.findOne({ groupId }).lean() as any
    const participant = group.participants.find((p: any) => p.phone === VICTIM_PHONE)
    expect(participant, 'le participant invité est bien enregistré').toBeTruthy()
    expect(participant.userId, 'aucun rattachement au compte existant').toBeUndefined()
    expect(String(participant.userId || ''), 'aucun rattachement au compte existant').not.toBe(victimId)
  })

  test('le flux invité légitime (contact inconnu) crée un compte et une session', async () => {
    const res = await anon.post('/api/auth/guest-checkout', {
      data: { name: 'Nouveau Client', phone: FRESH_PHONE },
    })

    expect(res.ok(), await res.text()).toBeTruthy()
    const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie')
    expect(cookies.some((c) => c.value.includes('auth-token='))).toBe(true)
  })
})
