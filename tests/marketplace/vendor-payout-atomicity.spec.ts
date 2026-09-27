import { test, expect, request as pwRequest, APIRequestContext } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import VendorProfile from '@/lib/models/VendorProfile'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import { Order } from '@/lib/models/Order'
import VendorPayout from '@/lib/models/VendorPayout'

/**
 * Régression — concurrence sur les demandes de retrait vendeur.
 *
 * Le solde était vérifié puis le payout créé sans atomicité : deux demandes
 * simultanées pouvaient engager deux fois le même solde (perte sèche pour la
 * plateforme). Une seule demande doit passer.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const PREFIX = 'E2E-PAYOUT'
const EMAIL = 'e2e-payout-vendor@itvision.sn'
const PASSWORD = 'test123'
const SLUG = 'e2e-payout-shop'

let vendorCtx: APIRequestContext
let vendorId: string
let shopId: string
let productId: string
let orderId: string

test.describe('Retraits vendeur — atomicité', () => {
  test.beforeAll(async () => {
    await connectMongoose()

    const passwordHash = await bcrypt.hash(PASSWORD, 10)
    await User.deleteMany({ email: EMAIL })
    await VendorProfile.deleteMany({ slug: SLUG })
    await Shop.deleteMany({ slug: SLUG })
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })
    await Order.deleteMany({ orderId: new RegExp(`^CMD-${PREFIX}`) })
    await VendorPayout.deleteMany({})

    const user = await User.create({
      email: EMAIL,
      username: `e2e-payout-${Date.now()}`,
      name: 'E2E Payout Vendor',
      passwordHash,
      role: 'VENDOR',
      isActive: true,
      phone: '+221778880001',
    })
    vendorId = String(user._id)

    const shop = await Shop.create({
      name: 'E2E Payout Shop',
      slug: SLUG,
      ownerId: user._id,
      ownerEmail: EMAIL,
      status: 'active',
      commissionRate: 0,
    })
    shopId = String(shop._id)

    await VendorProfile.create({
      userId: user._id,
      name: 'E2E Payout Shop',
      slug: SLUG,
      rating: 5,
    })

    const product = await Product.create({
      name: `${PREFIX}-${Date.now()}`,
      category: 'marketplace-test',
      price: 10000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace'],
      stockStatus: 'in_stock',
      stockQuantity: 10,
      sellerSlug: SLUG,
      sellerName: 'E2E Payout Shop',
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      price1688Currency: 'FCFA',
      exchangeRate: 1,
    })
    productId = String(product._id)

    // Vente livrée + payée → solde disponible de 20 000 F
    const order = await Order.create({
      orderId: `CMD-${PREFIX}-${Date.now()}`,
      clientName: 'E2E Client',
      clientPhone: '+221770000001',
      domain: 'marketplace',
      items: [{ id: productId, name: product.name, qty: 2, price: 10000, currency: 'FCFA' }],
      fees: {
        supplierCost: 20000, serviceFeeRate: 10, serviceFeeStandardRate: 10,
        serviceFeeAmount: 2000, insuranceRate: 2.5, insuranceAmount: 500, totalFees: 2500,
      },
      subtotal: 22500,
      subtotalBeforeDiscounts: 22500,
      shipping: { method: 'air_15j', totalCost: 0, currency: 'FCFA' },
      total: 22500,
      status: 'delivered',
      paymentStatus: 'completed',
      currency: 'FCFA',
      source: 'web',
    })
    orderId = String(order._id)

    vendorCtx = await pwRequest.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    const login = await vendorCtx.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } })
    expect(login.ok(), await login.text()).toBeTruthy()
  })

  test.afterAll(async () => {
    await User.deleteMany({ email: EMAIL })
    await VendorProfile.deleteMany({ slug: SLUG })
    await Shop.deleteMany({ slug: SLUG })
    await Product.deleteMany({ name: new RegExp(`^${PREFIX}`) })
    await Order.deleteMany({ _id: orderId })
    await VendorPayout.deleteMany({})
    await vendorCtx?.dispose()
  })

  test('deux demandes concurrentes du solde complet : une seule passe', async () => {
    const payload = { amount: 20000, method: 'wave', phone: '+221778880001' }

    const [r1, r2] = await Promise.all([
      vendorCtx.post('/api/vendor/payouts', { data: payload }),
      vendorCtx.post('/api/vendor/payouts', { data: payload }),
    ])

    const accepted = [r1, r2].filter((r) => r.status() === 201).length
    const refused = [r1, r2].filter((r) => r.status() === 400).length

    expect(accepted, `réponses: ${r1.status()} / ${r2.status()}`).toBe(1)
    expect(refused).toBe(1)

    const payouts = await VendorPayout.find({}).lean() as any[]
    expect(payouts.length).toBe(1)

    const totalCommitted = payouts.reduce((s, p) => s + p.amount, 0)
    expect(totalCommitted).toBeLessThanOrEqual(20000)
  })

  test('le solde restant est nul après engagement complet', async () => {
    const res = await vendorCtx.post('/api/vendor/payouts', {
      data: { amount: 1000, method: 'wave', phone: '+221778880001' },
    })
    expect(res.status()).toBe(400)
  })
})
