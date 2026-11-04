import { test, expect } from '@playwright/test'
import mongoose from 'mongoose'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import AppConfig from '@/lib/models/AppConfig'
import { connectMongoose } from '@/lib/mongoose'
import { REAL_SHIPPING_COSTS, BASE_SHIPPING_RATES } from '@/lib/logistics'
import { readPricingDefaults } from '@/lib/pricing/settings'
import { DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS } from '@/lib/shipping/sea-freight-eligibility'
import { initializeSharedPricing, readSharedPricing, writeSharedPricing, PricingConflictError, configuredShippingRates } from '@/lib/pricing/shared-settings'
import { initializeSharedShippingCosts, readSharedShippingCosts, writeSharedShippingCosts, ShippingCostsConflictError } from '@/lib/shipping/shared-costs'
import { POST as simulate } from '@/app/api/pricing/simulate/route'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { getJwtSecretKey } from '@/lib/jwt-secret'
import { GET as readAdmin, POST as saveAdmin } from '@/app/api/admin/shipping-rates/route'
import { GET as readAdminDefaults, POST as saveAdminDefaults } from '@/app/api/admin/settings/route'
import { GET as catalogProducts } from '@/app/api/catalog/products/route'
import Product from '@/lib/models/Product'
import { quoteCart } from '@/lib/pricing/quote-cart'
import { SOURCE_CURRENCY_RATES } from '@/lib/pricing/constants'
import { enqueueAgentJob, recoverStaleAgentJobs } from '@/lib/agents/queue'
import AgentJob from '@/lib/models/AgentJob'
import { priceSourcingCandidate } from '@/lib/agents/sourcing/request-policy'
import { Order } from '@/lib/models/Order'
import { recordOrderRealWeight, recordGroupRealWeight } from '@/lib/market/freight-billing'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { GET as publicDefaults } from '@/app/api/pricing/settings/route'
import { GET as publicShipping } from '@/app/api/shipping-rates/route'
import { GET as publicSimulatorRates } from '@/app/api/shipping/rates-public/route'
import { formatProductDetail } from '@/lib/catalog-format'
import { importPricing } from '@/lib/market/catalog-import'

const initialPricing = () => ({
  defaults: readPricingDefaults({ strict: true }),
  sourceCurrencyRates: SOURCE_CURRENCY_RATES,
  shippingRates: Object.fromEntries(Object.entries(BASE_SHIPPING_RATES).map(([method, rate]) => [method, { rate: rate.rate, minimumCharge: rate.minimumCharge }])),
  seaFreightEligibility: DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS,
  adjustTolerance: 0.1,
})

test.describe('Couts transporteur partages', () => {
  const originalMongoUri = process.env.MONGODB_URI
  let isolatedDatabase = ''
  test.beforeAll(async () => {
    const uri = new URL(originalMongoUri || 'mongodb://localhost/absent')
    if (!['localhost', '127.0.0.1', 'mongo', 'mongodb'].includes(uri.hostname) || !/^\/itvision_(e2e|shipping_test_[a-z0-9_]+)$/i.test(uri.pathname)) {
      throw new Error('Mongo local et base itvision_e2e ou itvision_shipping_test_* obligatoires')
    }
    isolatedDatabase = `itvision_shipping_test_${randomUUID().replaceAll('-', '')}`
    uri.pathname = `/${isolatedDatabase}`
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
    process.env.MONGODB_URI = uri.toString()
    await connectMongoose()
    if (mongoose.connection.name !== isolatedDatabase) throw new Error('Base isolee obligatoire')
    await AppConfig.init()
  })
  test.beforeEach(async () => { await AppConfig.deleteOne({ key: 'global' }) })
  test.afterAll(async () => {
    try {
      if (isolatedDatabase && mongoose.connection.name === isolatedDatabase) await mongoose.connection.dropDatabase()
    } finally {
      await mongoose.disconnect()
      if (originalMongoUri === undefined) delete process.env.MONGODB_URI
      else process.env.MONGODB_URI = originalMongoUri
    }
  })

  test('absence et corruption echouent sans repli vers les fichiers locaux', async () => {
    await expect(readSharedShippingCosts()).rejects.toThrow('non initialises')
    await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)
    await AppConfig.collection.updateOne({ key: 'global' }, { $set: { 'shippingCosts.costs.air_15.rate': -1 } })
    await expect(readSharedShippingCosts()).rejects.toThrow()
  })

  test('initialisation idempotente, mise a jour versionnee et conflit concurrent', async () => {
    const initial = await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)
    expect(initial.version).toBe(1)
    expect(initial.costs.air_15.rate).toBe(8000)
    const outcomes = await Promise.allSettled([
      writeSharedShippingCosts({ air_15: { rate: 9000 } }, initial.version),
      writeSharedShippingCosts({ air_15: { rate: 10000 } }, initial.version),
    ])
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
    const rejected = outcomes.find(outcome => outcome.status === 'rejected') as PromiseRejectedResult
    expect(rejected.reason).toBeInstanceOf(ShippingCostsConflictError)
    const saved = await readSharedShippingCosts()
    expect(saved.version).toBe(2)
    expect(saved.costs.air_express).toEqual(REAL_SHIPPING_COSTS.air_express)
    expect(await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)).toEqual(saved)
    await expect(writeSharedShippingCosts({ air_15: { rate: -1 } }, 2)).rejects.toThrow()
    expect(await readSharedShippingCosts()).toEqual(saved)
  })

  test('un processus distant sans dossier data lit la derniere version Mongo', async () => {
    const root = process.cwd()
    const isolated = mkdtempSync(join(tmpdir(), 'vit-shipping-worker-'))
    try {
      await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)
      await writeSharedShippingCosts({ air_15: { rate: 9400 } }, 1)
      const source = `const { readSharedShippingCosts } = require(${JSON.stringify(resolve(root, 'src/lib/shipping/shared-costs.ts'))}); const mongoose = require(${JSON.stringify(resolve(root, 'node_modules/mongoose/index.js'))}); void (async () => { const snapshot = await readSharedShippingCosts(); console.log('SHARED_COSTS=' + JSON.stringify(snapshot)); await mongoose.disconnect(); process.exit(0) })().catch(error => { console.error(error); process.exit(1) });`
      const { stdout } = await promisify(execFile)(process.execPath, ['--require', resolve(root, 'node_modules/tsx/dist/cjs/index.cjs'), '-e', source], {
        cwd: isolated, env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json') }, timeout: 15_000,
      })
      const output = stdout.split(/\r?\n/).find(line => line.startsWith('SHARED_COSTS='))
      expect(output).toBeTruthy()
      const snapshot = JSON.parse(output!.slice('SHARED_COSTS='.length))
      expect(snapshot.version).toBe(2)
      expect(snapshot.costs.air_15.rate).toBe(9400)
    } finally { rmSync(isolated, { recursive: true, force: true }) }
  })

  test('la route de simulation utilise la version partagee sans changer le prix client', async () => {
    await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)
    await initializeSharedPricing(initialPricing())
    const request = () => new NextRequest('http://localhost/api/pricing/simulate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseCost: 10000, shippingMethod: 'air_15', weightKg: 1, orderQuantity: 1 }),
    })
    const before = await (await simulate(request())).json()
    expect(before.success).toBe(true)
    expect(before.simulation.shippingCostReal).toBe(8000)
    await writeSharedShippingCosts({ air_15: { rate: 9400 } }, 1)
    const after = await (await simulate(request())).json()
    expect(after.internalCostsVersion).toBe(2)
    expect(after.simulation.shippingCostReal).toBe(9400)
    expect(after.simulation.totalClientPrice).toBe(before.simulation.totalClientPrice)
    expect(after.simulation.netMargin).toBe(before.simulation.netMargin - 1400)
  })

  test('la route admin protege les couts et refuse une version perimee', async () => {
    await initializeSharedShippingCosts(REAL_SHIPPING_COSTS)
    await initializeSharedPricing(initialPricing())
    const request = async (role?: string, body?: object, path = '/api/admin/shipping-rates') => {
      const token = role ? await new SignJWT({ userId: 'shipping-test', role }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('5m').sign(getJwtSecretKey()) : undefined
      return new NextRequest(`http://localhost${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    }
    expect((await readAdmin(await request())).status).toBe(401)
    expect((await readAdmin(await request('CLIENT'))).status).toBe(403)
    const payload = { internalCosts: { air_15: { rate: 9100 } }, internalCostsVersion: 1, pricingVersion: 1, rates: { air_15: { rate: 9500 } } }
    expect((await saveAdmin(await request(undefined, payload))).status).toBe(401)
    expect((await saveAdmin(await request('CLIENT', payload))).status).toBe(403)
    expect((await saveAdmin(await request('ADMIN', { internalCosts: payload.internalCosts }))).status).toBe(400)
    const saved = await saveAdmin(await request('ADMIN', payload))
    expect(saved.status).toBe(200)
    expect((await saved.json()).internalCostsVersion).toBe(2)
    expect((await saveAdmin(await request('SUPER_ADMIN', payload))).status).toBe(409)
    const read = await readAdmin(await request('SUPER_ADMIN'))
    expect(read.headers.get('cache-control')).toContain('no-store')
    const data = await read.json()
    expect(data.internalCostsVersion).toBe(2)
    expect(data.internalCosts.air_15.rate).toBe(9100)
    expect(data.pricingVersion).toBe(2)
    expect(data.rates.air_15.rate).toBe(9500)
    await writeSharedShippingCosts({ air_15: { rate: 9200 } }, 2)
    const conflict = await saveAdmin(await request('ADMIN', { ...payload, pricingVersion: 2, internalCostsVersion: 2, rates: { air_15: { rate: 15000 } } }))
    expect(conflict.status).toBe(409)
    expect((await readSharedPricing()).config.shippingRates.air_15.rate).toBe(9500)
    const invalid = await saveAdmin(await request('ADMIN', { ...payload, pricingVersion: 2, internalCostsVersion: 3, rates: { air_15: { rate: -1 } } }))
    expect(invalid.status).toBe(400)
    expect((await readSharedShippingCosts()).costs.air_15.rate).toBe(9200)
    const defaultsPayload = { pricingVersion: 2, defaults: { defaultExchangeRate: 125 } }
    expect((await saveAdminDefaults(await request('PRODUCT_MANAGER', defaultsPayload, '/api/admin/settings'))).status).toBe(403)
    const defaultsSaved = await saveAdminDefaults(await request('ADMIN', defaultsPayload, '/api/admin/settings'))
    expect(defaultsSaved.status).toBe(200)
    expect(await defaultsSaved.json()).toMatchObject({ pricingVersion: 3, defaults: { defaultExchangeRate: 125 } })
    expect((await saveAdminDefaults(await request('ADMIN', defaultsPayload, '/api/admin/settings'))).status).toBe(409)
    const readonly = await readAdminDefaults(await request('PRODUCT_MANAGER', undefined, '/api/admin/settings'))
    expect(await readonly.json()).toMatchObject({ pricingVersion: 3, permissions: { canWrite: false } })
  })

  test('migration en apercu sans ecriture puis import idempotent', async () => {
    test.setTimeout(60_000)
    const root = process.cwd()
    const migrate = (flag: string, cwd = root) => promisify(execFile)(process.execPath, ['--require', resolve(root, 'node_modules/tsx/dist/cjs/index.cjs'), resolve(root, 'scripts/migrate-shipping-costs.ts'), flag], {
      cwd, env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json') }, timeout: 20_000,
    })
    const empty = mkdtempSync(join(tmpdir(), 'vit-pricing-dry-'))
    try {
      expect((await migrate('--dry-run', empty)).stdout).toContain('DRY-RUN')
      expect(existsSync(join(empty, 'data'))).toBe(false)
    } finally { rmSync(empty, { recursive: true, force: true }) }
    expect((await migrate('--dry-run')).stdout).toContain('DRY-RUN')
    expect(await AppConfig.countDocuments({ key: 'global' })).toBe(0)
    await migrate('--apply')
    expect((await readSharedShippingCosts()).version).toBe(1)
    expect((await readSharedPricing()).version).toBe(1)
    await writeSharedShippingCosts({ air_15: { rate: 9200 } }, 1)
    await writeSharedPricing({ defaults: { defaultExchangeRate: 123 } }, 1)
    expect((await migrate('--apply')).stdout).toContain('Aucune modification')
    expect((await readSharedShippingCosts()).costs.air_15.rate).toBe(9200)
    expect((await readSharedShippingCosts()).version).toBe(2)
    expect((await readSharedPricing()).config.defaults.defaultExchangeRate).toBe(123)
    expect((await readSharedPricing()).version).toBe(2)
  })

  test('tarifs commerciaux partages : version coherente, conflit et lecture sans fichier local', async () => {
    await expect(readSharedPricing()).rejects.toThrow('non initialises')
    await initializeSharedPricing(initialPricing())
    const outcomes = await Promise.allSettled([
      writeSharedPricing({ defaults: { defaultExchangeRate: 112, singleImportServiceFeeRate: 18 }, shippingRates: { air_15: { rate: 9300 } } }, 1),
      writeSharedPricing({ defaults: { defaultExchangeRate: 114, singleImportServiceFeeRate: 19 }, shippingRates: { air_15: { rate: 9500 } } }, 1),
    ])
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled'), outcomes.map(outcome => outcome.status === 'rejected' ? String(outcome.reason) : 'OK').join('\n')).toHaveLength(1)
    expect((outcomes.find(outcome => outcome.status === 'rejected') as PromiseRejectedResult).reason).toBeInstanceOf(PricingConflictError)
    const saved = await readSharedPricing()
    expect(saved.version).toBe(2)
    const root = process.cwd()
    const isolated = mkdtempSync(join(tmpdir(), 'vit-pricing-worker-'))
    try {
      const source = `const { readSharedPricing } = require(${JSON.stringify(resolve(root, 'src/lib/pricing/shared-settings.ts'))}); const mongoose = require(${JSON.stringify(resolve(root, 'node_modules/mongoose/index.js'))}); void (async () => { console.log('PRICING=' + JSON.stringify(await readSharedPricing())); await mongoose.disconnect(); process.exit(0) })().catch(error => { console.error(error); process.exit(1) });`
      const { stdout } = await promisify(execFile)(process.execPath, ['--require', resolve(root, 'node_modules/tsx/dist/cjs/index.cjs'), '-e', source], {
        cwd: isolated, env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json') }, timeout: 15_000,
      })
      const output = stdout.split(/\r?\n/).find(line => line.startsWith('PRICING='))!
      expect(JSON.parse(output.slice('PRICING='.length))).toEqual(JSON.parse(JSON.stringify(saved)))
      await expect(writeSharedPricing({ defaults: { defaultExchangeRate: -1 } }, 2)).rejects.toThrow()
      expect(await readSharedPricing()).toEqual(saved)
    } finally { rmSync(isolated, { recursive: true, force: true }) }
  })

  test('panier : change, frais, assurance et transport suivent un seul snapshot', async () => {
    await initializeSharedPricing(initialPricing())
    const product = await Product.create({ name: 'Tarifs partages test', price: 10000, price1688: 100, weightKg: 1, volumeM3: 0.001, isPublished: true, category: 'test', stockStatus: 'preorder' })
    try {
      const params = { cart: [{ id: String(product._id), qty: 1 }], shippingMethod: 'air_15j', includeAllShipping: true }
      const before = await quoteCart(params)
      expect(before.ok).toBe(true)
      if (!before.ok) throw new Error(before.error)
      const committedTotal = before.quote.total
      await writeSharedPricing({ defaults: { defaultExchangeRate: 120, singleImportServiceFeeRate: 20, defaultInsuranceRate: 3 }, shippingRates: { air_15: { rate: 9000 } } }, 1)
      const withProductRate = await quoteCart(params)
      expect(withProductRate.ok).toBe(true)
      if (!withProductRate.ok) throw new Error(withProductRate.error)
      expect(withProductRate.quote.pricing.sourcingCost).toBe(10000)
      await Product.collection.updateOne({ _id: product._id }, { $unset: { exchangeRate: 1, baseCost: 1 } })
      const after = await quoteCart(params)
      expect(after.ok).toBe(true)
      if (!after.ok) throw new Error(after.error)
      expect(after.quote.pricing.sourcingCost).toBe(12000)
      expect(after.quote.pricing.serviceFee.amount).toBe(2400)
      expect(after.quote.pricing.insurance.amount).toBe(360)
      expect(after.quote.shipping.cost).toBe(9000)
      expect(after.quote.total).toBe(23760)
      const catalog = await catalogProducts(new NextRequest(`http://localhost/api/catalog/products?ids=${product._id}`))
      expect(catalog.status).toBe(200)
      expect(catalog.headers.get('cache-control')).toBe('no-store')
      expect(before.quote.total).toBe(committedTotal)
    } finally { await Product.deleteOne({ _id: product._id }) }
  })

  test('worker : les tarifs serveur sont conserves lors de la reprise du job', async () => {
    const original = await initializeSharedPricing(initialPricing())
    const refId = randomUUID()
    const job = await enqueueAgentJob('sourcing_request', refId, { marketPricing: { version: 999 } })
    expect(job).toBeTruthy()
    try {
      const snapshot = job!.payload.marketPricing
      expect(snapshot.version).toBe(original.version)
      const product = { price1688: 100, price1688Currency: 'CNY', exchangeRate: 999, weightKg: 1 }
      const before = priceSourcingCandidate(product, 1, snapshot)
      await writeSharedPricing({ defaults: { defaultExchangeRate: 120, defaultInsuranceRate: 3, singleImportServiceFeeRate: 20 }, shippingRates: { air_15: { rate: 9000 } } }, 1)
      const type = `shipping-snapshot-${refId}`
      await AgentJob.updateOne({ _id: job!._id }, { $set: { type, status: 'running', attempts: 1, heartbeatAt: new Date(0) } })
      expect((await recoverStaleAgentJobs([type])).requeued).toBe(1)
      const restored = await AgentJob.findById(job!._id).lean()
      expect(restored?.payload.marketPricing).toEqual(snapshot)
      expect(priceSourcingCandidate(product, 1, restored!.payload.marketPricing)).toEqual(before)
      expect(priceSourcingCandidate(product, 1, await readSharedPricing()).totalClientPrice).toBe(23760)
    } finally { await AgentJob.deleteMany({ refId }) }
  })

  test('commande engagee : la pesee conserve le tarif et la tolerance enregistres', async () => {
    const pricingSnapshot = await initializeSharedPricing(initialPricing())
    const order = await Order.create({
      orderId: `TEST-${randomUUID()}`, clientName: 'Test', clientPhone: '000000000', domain: 'marketplace',
      pricingSnapshot, items: [], subtotal: 11750, subtotalBeforeDiscounts: 11750, total: 20250,
      fees: { supplierCost: 10000, serviceFeeRate: 15, serviceFeeStandardRate: 10, serviceFeeAmount: 1500, insuranceRate: 2.5, insuranceAmount: 250, totalFees: 1750 },
      shipping: { method: 'air_15j', totalCost: 8500, currency: 'FCFA' }, paymentStatus: 'completed',
    })
    try {
      await writeSharedPricing({ shippingRates: { air_15: { rate: 20000 } }, adjustTolerance: 0 }, 1)
      const result = await recordOrderRealWeight(order.orderId, { weightKg: 2 }, 'test', true)
      expect(result.realCost).toBe(17000)
      expect(result.tolerance).toBe(0.1)
      expect(result.amount).toBe(7650)
      const saved = await Order.findById(order._id).lean()
      expect(saved?.total).toBe(20250)
      expect(saved?.pricingSnapshot?.version).toBe(1)
      expect(saved?.shippingAdjustment).toBeUndefined()
    } finally { await Order.deleteOne({ _id: order._id }) }
  })

  test('tarifs publics et catalogue : memes frais, change et version que le panier', async () => {
    await initializeSharedPricing(initialPricing())
    const pricing = await writeSharedPricing({ defaults: { defaultExchangeRate: 120, singleImportServiceFeeRate: 20, defaultInsuranceRate: 3 }, shippingRates: { air_15: { rate: 9000 } }, adjustTolerance: 0.2 }, 1)
    const defaults = await publicDefaults()
    expect(defaults.headers.get('cache-control')).toContain('no-store')
    expect(await defaults.json()).toMatchObject({ pricingVersion: 2, defaults: { defaultExchangeRate: 120, singleImportServiceFeeRate: 20, defaultInsuranceRate: 3 } })
    expect(await (await publicShipping()).json()).toMatchObject({ pricingVersion: 2, rates: { air_15: { rate: 9000 } } })
    expect(await (await publicSimulatorRates()).json()).toMatchObject({ pricingVersion: 2, adjustTolerance: 0.2 })
    const product = formatProductDetail({ _id: 'test', price1688: 100, weightKg: 1, variantGroups: [{ name: 'Modele', variants: [{ price1688: 200 }] }] }, configuredShippingRates(pricing.config), pricing.config.defaults)
    expect(product.pricing.fees).toMatchObject({ serviceFeeAmount: 2400, insuranceAmount: 360 })
    expect(product.pricing.salePrice).toBe(12000)
    expect(product.variantGroups[0].variants[0].price).toBe(24000)
    const imported = importPricing({ sourcePrice: 100, platform: '1688', marginRate: 0 }, pricing.config)
    expect(imported.exchangeRate).toBe(120)
    expect(imported.insuranceRate).toBe(3)
    expect(imported.price).toBe(15000)
    const currencies = await writeSharedPricing({ sourceCurrencyRates: { USD: 700 } }, 2)
    expect(importPricing({ sourcePrice: 100, currency: 'USD', platform: 'aliexpress', marginRate: 0 }, currencies.config).exchangeRate).toBe(700)
  })

  test('achat groupe : la pesee conserve le tarif enregistre a la creation', async () => {
    const pricingSnapshot = await initializeSharedPricing(initialPricing())
    const group = await GroupOrder.create({
      groupId: `TEST-${randomUUID()}`, status: 'ordering', pricingSnapshot,
      product: { productId: new mongoose.Types.ObjectId(), name: 'Test', basePrice: 10000, currency: 'FCFA' },
      minQty: 1, targetQty: 2, currentQty: 2, currentUnitPrice: 10000,
      deadline: new Date(), shippingMethod: 'air_15j', createdBy: { name: 'Test', phone: '000000000' },
      participants: [{ name: 'Test', phone: '000000000', qty: 2, unitPrice: 10000, totalAmount: 20000, paymentStatus: 'paid' }],
    })
    try {
      await writeSharedPricing({ shippingRates: { air_15: { rate: 20000 } } }, 1)
      const result = await recordGroupRealWeight(group.groupId, { weightKg: 2 }, 'test', true)
      expect(result.realCost).toBe(17000)
      expect(result.participants[0].amount).toBe(17000)
      expect((await GroupOrder.findById(group._id).lean())?.pricingSnapshot?.version).toBe(1)
    } finally { await GroupOrder.deleteOne({ _id: group._id }) }
  })
})