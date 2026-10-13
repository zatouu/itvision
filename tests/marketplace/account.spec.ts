import { test, expect } from '@playwright/test'
import { mapGeocodedAddress } from '../../src/lib/market/address-geocoding'
import { toCheckoutPaymentSettings, type PaymentSettings } from '../../src/lib/payments/settings'
import { NextRequest, NextResponse } from 'next/server'
import { isSessionCurrent, guardSocketSession } from '../../lib/auth-session'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { Server as SocketServer } from 'socket.io'
import { io as connectSocket } from 'socket.io-client'
import { signAuthTokenWithExpiry, verifyAuthToken, verifyJwtPayload } from '../../src/lib/jwt'
import { verifyAuthServer } from '../../src/lib/auth-server'
import { middleware } from '../../src/middleware'
import User from '../../src/lib/models/User'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { PUT as updateProfile } from '../../src/app/api/client/profile/route'
import { POST as resetPassword } from '../../src/app/api/auth/reset/route'
import { POST as verifyTwoFactor } from '../../src/app/api/auth/2fa/verify/route'
import { csrfMiddleware, generateCSRFResponse } from '../../src/lib/csrf-protection'
import { applySecurityHeaders } from '../../src/lib/middleware/security'
import { reissueAuthCookie } from '../../src/lib/vendor'
import { mapProductDetail, productSelection, cartLineKey } from '../../src/components/market/storefront/data-mappers'
import { productConfigurationError } from '../../src/lib/pricing/variants'
import ProductModel from '../../src/lib/models/Product'
import { normalizeVariantGroups } from '../../src/lib/catalog-format'
import { POST as createProduct, PATCH as updateProduct } from '../../src/app/api/products/route'
import { PATCH as updateProducts } from '../../src/app/api/products/bulk/route'

test('admin produit : handlers refusent acces et publications incoherentes', async () => {
  const originalEnv = { ...process.env }
  const globalState = globalThis as typeof globalThis & { __mongooseCache?: unknown }
  const originalCache = globalState.__mongooseCache
  const originalUserFind = User.findById
  const originalProductFind = ProductModel.findById
  const originalProductsFind = ProductModel.find
  const originalCreate = ProductModel.create
  const originalUpdate = ProductModel.updateOne
  const originalBulk = ProductModel.updateMany
  let writes = 0
  const userId = '507f1f77bcf86cd799439011'
  const product = { _id: userId, name: 'Lot de test', price: 15000, minOrderQty: 5, stockStatus: 'in_stock', stockQuantity: 2, isPublished: false }
  try {
    process.env.JWT_SECRET = 'local-product-test-only-not-a-production-secret'
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/product-test-never-connected'
    globalState.__mongooseCache = { conn: null, promise: Promise.resolve(mongoose), uri: process.env.MONGODB_URI }
    User.findById = (() => ({ select: () => ({ lean: async () => ({ sessionVersion: 0, isActive: true }) }) })) as typeof User.findById
    ProductModel.findById = (() => ({ lean: async () => product })) as typeof ProductModel.findById
    ProductModel.find = (() => ({ lean: async () => [product] })) as typeof ProductModel.find
    const forbiddenWrite = async () => { writes++; throw new Error('Ecriture interdite dans cette recette') }
    ProductModel.create = forbiddenWrite as unknown as typeof ProductModel.create
    ProductModel.updateOne = forbiddenWrite as unknown as typeof ProductModel.updateOne
    ProductModel.updateMany = forbiddenWrite as unknown as typeof ProductModel.updateMany
    const admin = await signAuthTokenWithExpiry({ userId, role: 'ADMIN' }, '1h')
    const client = await signAuthTokenWithExpiry({ userId, role: 'CLIENT' }, '1h')
    const request = (body: unknown, token = admin, method = 'PATCH') => new NextRequest('https://market.itvisionplus.sn/api/products', { method, headers: { cookie: `auth-token=${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) })
    expect((await createProduct(request({}, '', 'POST'))).status).toBe(401)
    expect((await updateProduct(request({ id: userId }, client))).status).toBe(403)
    expect((await updateProducts(request({ ids: [userId], set: { isPublished: true } }, client))).status).toBe(403)
    const creation = await createProduct(request({ name: 'Lot de test', price: 15000, stockStatus: 'in_stock', stockQuantity: 2, minOrderQty: 5 }, admin, 'POST'))
    expect(creation.status).toBe(400)
    expect((await creation.json()).error).toContain('lot minimum')
    const publication = await updateProduct(request({ id: userId, isPublished: true }))
    expect(publication.status).toBe(400)
    expect((await publication.json()).error).toContain('lot minimum')
    const bulk = await updateProducts(request({ ids: [userId], set: { isPublished: true } }))
    expect(bulk.status).toBe(400)
    expect((await bulk.json()).error).toContain('Lot de test')
    expect(writes).toBe(0)
  } finally {
    User.findById = originalUserFind
    ProductModel.findById = originalProductFind
    ProductModel.find = originalProductsFind
    ProductModel.create = originalCreate
    ProductModel.updateOne = originalUpdate
    ProductModel.updateMany = originalBulk
    globalState.__mongooseCache = originalCache
    process.env = originalEnv
  }
})

test('admin produit : cout FCFA et stock non suivi conserves', () => {
  const product = new ProductModel({ name: 'Produit', variantGroups: [{ name: 'Couleur', variants: [{ id: 'blanc', name: 'Blanc', priceFCFA: 18000, isDefault: true }] }] })
  const stored = product.toObject()
  expect(stored.variantGroups?.[0].variants[0]).toMatchObject({ priceFCFA: 18000, isDefault: true })
  const published = normalizeVariantGroups(stored, 100)
  expect(published[0].variants[0].stock).toBeUndefined()
  expect(published[0].variants[0].price).toBe(18000)
})

test('admin produit : configuration validee avant publication', () => {
  expect(productConfigurationError({ variantGroups: [{ name: 'Couleur', variants: [] }] })).not.toBeNull()
  expect(productConfigurationError({ variantGroups: [{ name: 'Couleur', variants: [{ id: 'same', name: 'Noir' }] }, { name: 'Taille', variants: [{ id: 'same', name: 'M' }] }] })).toContain('identifiant distinct')
  expect(productConfigurationError({ variantGroups: [{ name: 'Couleur', variants: [{ name: 'Noir', stock: -1 }] }] })).not.toBeNull()
  expect(productConfigurationError({ stockQuantity: 2.5 })).not.toBeNull()
  expect(productConfigurationError({ stockStatus: 'in_stock', stockQuantity: 2, minOrderQty: 5, isPublished: true })).toContain('lot minimum')
  expect(productConfigurationError({ stockStatus: 'in_stock', stockQuantity: 2, minOrderQty: 5, isPublished: false })).toBeNull()
  expect(productConfigurationError({ stockStatus: 'preorder', stockQuantity: 0, isPublished: true, variantGroups: [{ name: 'Couleur', variants: [{ name: 'Noir', stock: 0 }] }] })).toBeNull()
})

test('produit : groupes de variantes et stock conserves', () => {
  const product = mapProductDetail({ id: 'test', price: 15000, variantGroups: [
    { name: 'Couleur', variants: [{ id: 'noir', name: 'Noir', stock: 0 }, { id: 'blanc', name: 'Blanc', stock: 2 }] },
    { name: 'Taille', variants: [{ name: 'M', stock: 50 }] },
  ] })!
  expect(product.variantGroups?.map(group => group.name)).toEqual(['Couleur', 'Taille'])
  expect(product.variantGroups?.[0].variants[0].stock).toBe(0)
  expect(product.variantGroups?.[1].variants[0].id).toBe('var_1_0')
  expect(product.variants).toHaveLength(3)
})

test('produit : selection complete, prix maximum et disponibilite cumulee', () => {
  const product = mapProductDetail({ id: 'test', price: 15000, availability: { status: 'in_stock', stockQuantity: 10 }, variantGroups: [
    { name: 'Couleur', variants: [{ id: 'noir', name: 'Noir', stock: 0 }, { id: 'blanc', name: 'Blanc', stock: 4, price: 16000 }] },
    { name: 'Taille', variants: [{ id: 'medium', name: 'M', stock: 8, price: 18000 }, { id: 'large', name: 'L', stock: 3 }] },
  ] })!
  expect(productSelection(product, ['blanc']).complete).toBe(false)
  expect(productSelection(product, ['blanc', 'noir', 'medium']).complete).toBe(false)
  expect(productSelection(product, ['blanc', 'inconnu']).complete).toBe(false)
  expect(productSelection(product, ['blanc', 'medium'])).toMatchObject({ complete: true, unit: 18000, maxQuantity: 4 })
  expect(productSelection(product, ['noir', 'medium']).maxQuantity).toBe(0)
  const cart = [{ id: 'test', variantIds: ['blanc', 'large'], qty: 3 }] as Parameters<typeof productSelection>[2]
  expect(productSelection(product, ['blanc', 'medium'], cart).maxQuantity).toBe(1)
  expect(productSelection({ ...product, availabilityStatus: 'preorder' }, ['noir', 'medium']).maxQuantity).toBe(10000)
  expect(productSelection({ ...product, availabilityStatus: 'out_of_stock' }, ['blanc', 'medium']).maxQuantity).toBe(0)
  expect(cartLineKey({ id: 'test', variantIds: ['blanc', 'medium'] })).not.toBe(cartLineKey({ id: 'test', variantIds: ['blanc', 'large'] }))
  expect(cartLineKey({ id: 'test', variantIds: ['blanc', 'medium'] })).toBe(cartLineKey({ id: 'test', variantIds: ['medium', 'blanc'] }))
})

test('produit : variantes independantes, rupture et panier cumule', async ({ page }) => {
  test.skip(process.env.STOREFRONT_UI_PREVIEW !== '1', 'Apercu UI requis')
  let status = 'in_stock'
  await page.route('**/api/catalog/products/ui-product', route => route.fulfill({ json: { success: true, product: {
    id: 'configurable', name: 'Produit configurable', price: 15000, minOrderQty: 5,
    image: '/assets/img/product-camera.jpg', gallery: ['/assets/img/product-camera.jpg'],
    availability: { status, stockQuantity: 30 }, variantGroups: [
      { name: 'Couleur', variants: [{ id: 'noir', name: 'Noir', stock: 0 }, { id: 'blanc', name: 'Blanc', stock: 12, image: '/assets/img/product-watch.jpg' }] },
      { name: 'Taille', variants: [{ id: 'medium', name: 'M', stock: 20, price: 16000 }, { id: 'large', name: 'L', stock: 20, price: 17000 }] },
    ],
  } } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/produits/ui-product')
  const add = page.getByRole('button', { name: 'Ajouter', exact: true })
  await expect(add).toBeDisabled()
  await expect(page.getByRole('button', { name: /^Noir/ })).toBeDisabled()
  await page.getByRole('button', { name: /^Blanc/ }).click()
  await expect(add).toBeDisabled()
  await page.getByRole('group', { name: 'Taille', exact: true }).getByRole('button', { name: /^M/ }).click()
  await expect(page.getByRole('button', { name: /^Blanc/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('main img[alt="Produit configurable"]').first()).toHaveAttribute('src', '/assets/img/product-watch.jpg')
  await add.click()
  await expect(page.getByRole('status')).toContainText('ajoutée')
  await page.getByRole('group', { name: 'Taille', exact: true }).getByRole('button', { name: /^L/ }).click()
  await add.click()
  await expect(add).toBeDisabled()
  const items = await page.evaluate(() => JSON.parse(localStorage.getItem('cart:items') || '[]').filter((item: { id: string }) => item.id === 'configurable'))
  expect(items).toHaveLength(2)
  expect(items.map((item: { variantIds: string[] }) => item.variantIds)).toEqual([['blanc', 'medium'], ['blanc', 'large']])
  status = 'out_of_stock'
  await page.reload()
  await expect(page.getByText('Produit actuellement indisponible.', { exact: true })).toBeVisible()
  await expect(add).toBeDisabled()
  status = 'preorder'
  await page.reload()
  await page.getByRole('button', { name: 'Noir', exact: true }).click()
  await page.getByRole('group', { name: 'Taille', exact: true }).getByRole('button', { name: /^M/ }).click()
  await expect(add).toBeEnabled()
})

test('produit : estimation actualisee, avis suivants et galerie clavier', async ({ page }) => {
  test.skip(process.env.STOREFRONT_UI_PREVIEW !== '1', 'Apercu UI requis')
  let failed = false
  let reviewsFailed = true
  const requests: Array<{ cart: Array<{ qty: number }>; shippingMethod: string }> = []
  await page.route('**/api/pricing/quote', route => {
    const request = route.request().postDataJSON()
    requests.push(request)
    return route.fulfill(failed ? { status: 503, json: { error: 'Transport indisponible' } } : { json: { success: true, quote: {
      pricing: { subtotal: request.cart[0].qty * 15000 }, shipping: { cost: 2500, label: 'Aérien standard', methodId: request.shippingMethod === 'air_express' ? 'air_express' : 'air_15' }, total: request.cart[0].qty * 15000 + 2500,
      shippingOptions: [{ methodId: 'air_15', label: 'Aérien standard', cost: 2500 }, { methodId: 'air_express', label: 'Express', cost: 5000 }],
    } } })
  })
  await page.route('**/api/reviews?**', route => {
    const next = new URL(route.request().url()).searchParams.get('page') === '2'
    if (next && reviewsFailed) return route.fulfill({ status: 503, json: { success: false } })
    return route.fulfill({ json: { success: true, stats: { total: 6, avgRating: 4, verifiedCount: 6 }, reviews: (next ? [6] : [1, 2, 3, 4, 5]).map(index => ({ id: String(index), userName: `Client ${index}`, rating: 4, comment: `Avis de recette ${index}`, verified: true, createdAt: '2026-10-01' })) } })
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/produits/ui-product')
  const estimate = page.getByRole('region', { name: 'Estimation du transport' })
  await expect(page.getByText('Description non renseignée.', { exact: true })).toBeVisible()
  await expect(page.getByText('Inspection qualité incluse avant expédition.', { exact: false })).toHaveCount(0)
  await estimate.getByRole('button', { name: 'Estimer le transport' }).click()
  await expect(estimate.getByText('Total estimé du lot')).toBeVisible()
  expect(requests[0].cart[0].qty).toBe(5)
  await page.getByRole('button', { name: 'Augmenter la quantité' }).click()
  await expect(estimate.getByText('Total estimé du lot')).toHaveCount(0)
  await estimate.getByRole('button', { name: 'Estimer le transport' }).click()
  await expect(estimate.getByText('Total estimé du lot')).toBeVisible()
  expect(requests[requests.length - 1].cart[0].qty).toBe(6)
  failed = true
  await estimate.getByLabel('Mode de livraison').selectOption('air_express')
  await expect(estimate.getByRole('alert')).toBeVisible()
  await expect(estimate.getByText('Total estimé du lot')).toHaveCount(0)
  failed = false
  await estimate.getByRole('button', { name: 'Réessayer l’estimation' }).click()
  await expect(estimate.getByText('Total estimé du lot')).toBeVisible()
  await page.getByRole('button', { name: 'Avis (6)', exact: true }).click()
  await page.getByRole('button', { name: 'Voir plus d’avis' }).click()
  await expect(page.getByRole('alert')).toContainText('Impossible de charger les avis suivants.')
  await expect(page.getByText('Avis de recette 1', { exact: true })).toBeVisible()
  reviewsFailed = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Avis de recette 6', { exact: true })).toBeVisible()
  const zoom = page.getByRole('button', { name: 'Agrandir les photos' })
  await zoom.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: /Photos de/ })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(zoom).toBeFocused()
})

test('admin produit : edition responsive et erreurs de sauvegarde', async ({ page }, testInfo) => {
  test.skip(process.env.STOREFRONT_UI_PREVIEW !== '1', 'Apercu UI requis')
  let failed = true
  let listFailed = true
  let writes = 0
  let saved = { _id: 'admin-product', name: 'Produit admin', category: 'securite', price: 15000, stockStatus: 'preorder', isPublished: false, variantGroups: [{ name: 'Couleur', variants: [{ id: 'blanc', name: 'Blanc', stock: 0 }] }] }
  await page.route('**/api/products?**', route => route.fulfill(listFailed ? { status: 503, json: { success: false } } : { json: { success: true, items: [saved], total: 1 } }))
  await page.route('**/api/products', route => {
    writes++
    if (failed) return route.fulfill({ status: 503, json: { error: 'Sauvegarde indisponible' } })
    saved = { ...saved, ...route.request().postDataJSON() }
    return route.fulfill({ json: { success: true, item: saved } })
  })
  await page.goto('/admin/produits')
  await expect(page.getByRole('alert')).toContainText('catalogue est temporairement indisponible')
  await expect(page.getByText('Aucun produit', { exact: true })).toHaveCount(0)
  listFailed = false
  await page.getByRole('button', { name: 'Réessayer le chargement' }).click()
  await page.getByRole('button', { name: 'Éditer', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Modifier le produit' })
  await editor.getByRole('navigation', { name: 'Sections du produit' }).getByRole('button', { name: /^Variantes/ }).click()
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(editor.getByLabel('Nom du groupe 1')).toBeVisible()
    expect(await editor.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.screenshot({ path: testInfo.outputPath(`admin-variantes-${width}-${colorScheme}.png`), animations: 'disabled' })
    }
  }
  await editor.getByLabel('Nom du groupe 1').fill('')
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(editor.getByRole('alert')).toContainText('Configuration invalide')
  expect(writes).toBe(0)
  await editor.getByLabel('Nom du groupe 1').fill('Finition')
  await editor.getByLabel('Stock Blanc', { exact: true }).fill('-1')
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  expect(writes).toBe(0)
  await editor.getByLabel('Stock Blanc', { exact: true }).fill('7')
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(editor.getByRole('alert')).toContainText('Sauvegarde indisponible')
  await expect(editor.getByLabel('Stock Blanc', { exact: true })).toHaveValue('7')
  page.once('dialog', dialog => dialog.dismiss())
  await editor.getByRole('button', { name: 'Fermer l’éditeur produit' }).click()
  await expect(editor).toBeVisible()
  failed = false
  await editor.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(editor).toHaveCount(0)
  expect(saved.variantGroups[0].name).toBe('Finition')
  expect(saved.variantGroups[0].variants[0].stock).toBe(7)
})

test('accueil : categories avant produits, photo absente et panne recuperable', async ({ page }) => {
  test.skip(process.env.STOREFRONT_UI_PREVIEW !== '1', 'Apercu UI requis')
  let failed = false
  let malformed = false
  await page.route('**/api/catalog/category-highlights', route => route.fulfill({ status: failed ? 503 : 200, json: failed ? { error: 'indisponible' } : { items: malformed ? [null] : [{ slug: 'securite', name: 'Sécurité', count: 1 }] } }))
  await page.route('**/api/catalog/products?**', route => route.fulfill({ json: { products: [{ id: 'home-test', name: 'Produit sans photo', category: 'Sécurité', image: '/placeholder.svg', price: 15000, pricing: { salePrice: 15000, currency: 'FCFA' } }] } }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/market')
  const categories = page.getByRole('region', { name: 'Catégories', exact: true })
  const products = page.getByRole('region', { name: 'Sélection DDM+', exact: true })
  await expect(products.getByText('Produit sans photo', { exact: true })).toBeVisible()
  expect((await categories.boundingBox())!.y).toBeLessThan((await products.boundingBox())!.y)
  expect((await products.boundingBox())!.y).toBeLessThan(844)
  await expect(categories.getByRole('link', { name: /Sécurité/ })).toHaveAttribute('href', '/produits?cat=securite')
  failed = true
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'Catégories' })).toBeVisible()
  await expect(products.getByText('Produit sans photo', { exact: true })).toBeVisible()
  failed = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(categories.getByRole('link', { name: /Sécurité/ })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: 'Catégories' })).toHaveCount(0)
  malformed = true
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'Catégories' })).toBeVisible()
  await expect(page.getByRole('status', { name: "Chargement de l'accueil" })).toHaveCount(0)
})

test('navigation accueil : categories mobile desktop, clavier et recherche', async ({ page }, testInfo) => {
  test.skip(process.env.STOREFRONT_UI_PREVIEW !== '1', 'Apercu UI requis')
  let failCategories = false
  const queries: string[] = []
  await page.route('**/api/catalog/categories', route => route.fulfill({ status: failCategories ? 503 : 200, json: failCategories ? {} : { success: true, items: [{ slug: 'securite', name: 'Sécurité', labelFr: 'Sécurité', icon: 'Shield', subCategories: [{ slug: 'camera', name: 'Caméras', labelFr: 'Caméras' }] }] } }))
  page.on('request', request => { if (request.url().includes('/api/catalog/products?')) queries.push(request.url()) })
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/market')
    await expect(page.getByRole('heading', { name: 'DDM+', exact: true })).toBeVisible()
    const search = page.getByRole('combobox', { name: 'Rechercher dans le catalogue' })
    expect((await search.boundingBox())!.width).toBeGreaterThan(130)
    const products = page.getByRole('region', { name: 'Sélection DDM+', exact: true })
    await expect(products.getByText('Caméra Wi-Fi', { exact: true })).toBeVisible()
    expect(await products.locator('span.tabular-nums').evaluateAll(prices => prices.length > 0 && prices.every(price => {
      const card = price.closest('.group')!.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(price)
      return [...range.getClientRects()].every(rect => rect.left >= card.left && rect.right <= card.right)
    }))).toBe(true)
    expect(await products.locator('img').evaluateAll(images => images.every(image => {
      const frame = image.parentElement!.getBoundingClientRect()
      return Math.abs(frame.width - frame.height) <= 1
    }))).toBe(true)
    const trigger = width < 1280 ? page.locator('button[aria-controls="mobile-menu"]') : page.getByRole('button', { name: 'Catégories', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = width < 1280 ? page.locator('#mobile-menu') : page.locator(`[id="${await trigger.getAttribute('aria-controls')}"]`)
    const summary = panel.locator('summary').filter({ hasText: 'Sécurité' })
    await summary.focus()
    await page.keyboard.press('Enter')
    await expect(panel.getByRole('link', { name: 'Caméras', exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`), animations: 'disabled' })
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click()
  await page.locator('#mobile-menu summary').filter({ hasText: 'Sécurité' }).click()
  await page.locator('#mobile-menu').getByRole('link', { name: 'Caméras', exact: true }).click()
  await expect(page).toHaveURL(/\/produits\?cat=camera$/)
  await expect.poll(() => queries.some(url => new URL(url).searchParams.get('category') === 'camera')).toBe(true)
  await page.evaluate(() => { (window as Window & { navigationProbe?: boolean }).navigationProbe = true })
  await page.getByRole('combobox', { name: 'Rechercher dans le catalogue' }).fill('camera wifi')
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click()
  await expect(page).toHaveURL(/\/produits\?q=camera%20wifi$/)
  await expect.poll(() => queries.some(url => { const params = new URL(url).searchParams; return params.get('q') === 'camera wifi' && !params.has('category') })).toBe(true)
  expect(await page.evaluate(() => (window as Window & { navigationProbe?: boolean }).navigationProbe)).toBe(true)
  failCategories = true
  await page.goto('/market')
  await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click()
  await expect(page.locator('#mobile-menu').getByRole('alert')).toBeVisible()
  failCategories = false
  await page.locator('#mobile-menu').getByRole('button', { name: 'Réessayer' }).click()
  await expect(page.locator('#mobile-menu summary').filter({ hasText: 'Sécurité' })).toBeVisible()
})

test('sessions : Socket.io bloque les evenements et ferme les connexions inactives', async () => {
  const httpServer = createServer()
  const io = new SocketServer(httpServer)
  let valid = true
  let unavailable = false
  let accepted = 0
  let unresponsive = false
  const clients: ReturnType<typeof connectSocket>[] = []
  io.on('connection', socket => {
    guardSocketSession(socket, async () => {
      if (unavailable) throw new Error('Stockage indisponible')
      if (unresponsive) return new Promise<boolean>(() => {})
      return valid
    }, 20, 50)
    socket.on('probe', reply => { accepted++; reply('ok') })
  })
  try {
    await new Promise<void>(resolve => httpServer.listen(0, '127.0.0.1', resolve))
    const address = httpServer.address() as { port: number }
    const connect = async () => {
      const client = connectSocket(`http://127.0.0.1:${address.port}`, { autoConnect: false, transports: ['websocket'], reconnection: false })
      clients.push(client)
      const connected = once(client, 'connect')
      client.connect()
      await connected
      expect(await client.timeout(1000).emitWithAck('probe')).toBe('ok')
      return client
    }
    const first = await connect()
    const firstDisconnected = once(first, 'disconnect')
    valid = false
    first.emit('probe', () => {})
    await firstDisconnected
    expect(accepted).toBe(1)
    valid = true
    const idle = await connect()
    const idleDisconnected = once(idle, 'disconnect')
    valid = false
    await idleDisconnected
    expect(accepted).toBe(2)
    valid = true
    const interrupted = await connect()
    const interruptedDisconnected = once(interrupted, 'disconnect')
    unavailable = true
    await interruptedDisconnected
    expect(accepted).toBe(3)
    unavailable = false
    const stalled = await connect()
    const stalledDisconnected = once(stalled, 'disconnect')
    unresponsive = true
    await stalledDisconnected
    expect(accepted).toBe(4)
  } finally {
    for (const client of clients) client.disconnect()
    await new Promise<void>(resolve => io.close(() => resolve()))
  }
})
test('sessions : mot de passe et revocation atomiques, conflit refuse', async () => {
  const originalEnv = { ...process.env }
  const globalState = globalThis as typeof globalThis & { __mongooseCache?: unknown; io?: unknown }
  const originalCache = globalState.__mongooseCache
  const originalIo = globalState.io
  const originalFind = User.findById
  const originalUpdate = User.findOneAndUpdate
  const originalFindOne = User.findOne
  const originalUpdateOne = User.updateOne
  const userId = '507f1f77bcf86cd799439011'
  let updates = 0
  let disconnected = false
  let conflict = false
  let state: Record<string, any> = { _id: userId, username: 'session-test', email: 'session@example.test', name: 'Session Test', passwordHash: await bcrypt.hash('ancien-mot-de-passe', 4), sessionVersion: 0, isActive: true, role: 'CLIENT' }
  try {
    process.env.JWT_SECRET = 'local-session-test-only-not-a-production-secret'
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/session-test-never-connected'
    globalState.__mongooseCache = { conn: null, promise: Promise.resolve(mongoose), uri: process.env.MONGODB_URI }
    globalState.io = { in: (room: string) => { expect(room).toBe(`web-session-${userId}`); return { disconnectSockets: () => { disconnected = true } } } }
    User.findById = (() => ({
      select: () => ({ lean: async () => state }),
      lean: async () => ({ ...state }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(User.hydrate(state)).then(resolve),
    })) as typeof User.findById
    User.findOneAndUpdate = (async (filter: any, update: any, options: any) => {
      updates++
      expect(filter._id).toBe(userId)
      expect(filter.passwordHash).toBe(state.passwordHash)
      expect(filter.$expr).toEqual({ $eq: [{ $ifNull: ['$sessionVersion', 0] }, 0] })
      expect(update.$inc).toEqual({ sessionVersion: 1 })
      expect(update.$set.sessionVersion).toBeUndefined()
      expect(update.$unset).toMatchObject({ twoFactorCode: 1, twoFactorExpires: 1, passwordResetToken: 1, passwordResetExpires: 1 })
      expect(options).toEqual({ new: true, runValidators: true })
      if (conflict) return null
      state = { ...state, ...update.$set, sessionVersion: state.sessionVersion + 1 }
      return User.hydrate(state)
    }) as typeof User.findOneAndUpdate
    const token = await signAuthTokenWithExpiry({ userId, role: 'CLIENT' }, '1h')
    const request = (currentPassword: string) => new NextRequest('https://market.itvisionplus.sn/api/client/profile', { method: 'PUT', headers: { cookie: `auth-token=${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Nom modifie', currentPassword, newPassword: 'nouveau-mot-de-passe' }) })
    expect((await updateProfile(request('incorrect'))).status).toBe(400)
    expect(updates).toBe(0)
    conflict = true
    expect((await updateProfile(request('ancien-mot-de-passe'))).status).toBe(409)
    expect(disconnected).toBe(false)
    conflict = false
    const response = await updateProfile(request('ancien-mot-de-passe'))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.cookies.get('auth-token')?.value).toBe('')
    expect(state.sessionVersion).toBe(1)
    expect(state.name).toBe('Nom modifie')
    expect(await bcrypt.compare('nouveau-mot-de-passe', state.passwordHash)).toBe(true)
    expect(disconnected).toBe(true)
    await expect(verifyJwtPayload(token)).rejects.toThrow('Session revoquee')
    expect((await updateProfile(request('ancien-mot-de-passe'))).status).toBe(401)
    expect(updates).toBe(2)
    const currentToken = await signAuthTokenWithExpiry({ userId, role: 'CLIENT', sessionVersion: 1 }, '1h')
    state.passwordResetToken = 'reset-token-local-test'
    state.passwordResetExpires = new Date(Date.now() + 60000)
    User.findOne = (async () => state.passwordResetToken ? User.hydrate(state) : null) as typeof User.findOne
    User.updateOne = (async (filter: any, update: any) => {
      expect(filter.passwordResetToken).toBe('reset-token-local-test')
      expect(filter.passwordResetExpires.$gt).toBeInstanceOf(Date)
      expect(update.$inc).toEqual({ sessionVersion: 1 })
      expect(update.$unset).toMatchObject({ twoFactorCode: 1, twoFactorExpires: 1, passwordResetToken: 1 })
      if (conflict) return { matchedCount: 0 }
      state = { ...state, ...update.$set, sessionVersion: state.sessionVersion + 1 }
      for (const key of Object.keys(update.$unset)) delete state[key]
      return { matchedCount: 1 }
    }) as typeof User.updateOne
    const resetRequest = () => new NextRequest('https://market.itvisionplus.sn/api/auth/reset', { method: 'POST', body: JSON.stringify({ token: 'reset-token-local-test', password: 'Nouveau-secret-2026!' }) })
    expect((await resetPassword(new NextRequest('https://market.itvisionplus.sn/api/auth/reset', {
      method: 'POST', body: JSON.stringify({ token: { $ne: null }, password: 'Nouveau-secret-2026!' }),
    }))).status).toBe(400)
    conflict = true
    expect((await resetPassword(resetRequest())).status).toBe(400)
    state.twoFactorEnabled = true
    state.twoFactorCode = '123456'
    state.twoFactorExpires = new Date(Date.now() + 60000)
    User.updateOne = (async (filter: any) => {
      expect(filter.twoFactorCode).toBe('123456')
      expect(filter.twoFactorExpires.$gt).toBeInstanceOf(Date)
      expect(filter.$expr).toEqual({ $eq: [{ $ifNull: ['$sessionVersion', 0] }, 1] })
      return { matchedCount: 0 }
    }) as typeof User.updateOne
    const mfaRequest = () => new NextRequest('https://market.itvisionplus.sn/api/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ userId, code: '123456' }) })
    const consumedResponse = await verifyTwoFactor(mfaRequest())
    expect(consumedResponse.status).toBe(401)
    expect(consumedResponse.cookies.get('auth-token')).toBeUndefined()
    User.updateOne = (async (_filter: any, update: any) => {
      expect(update.$unset).toMatchObject({ twoFactorCode: 1, twoFactorExpires: 1 })
      return { matchedCount: 1 }
    }) as typeof User.updateOne
    const mfaResponse = await verifyTwoFactor(mfaRequest())
    expect(mfaResponse.status).toBe(200)
    const mfaToken = mfaResponse.cookies.get('auth-token')!.value
    expect((await verifyJwtPayload(mfaToken)).sessionVersion).toBe(1)
    User.updateOne = (async (filter: any, update: any) => {
      expect(filter.passwordResetToken).toBe('reset-token-local-test')
      expect(update.$inc).toEqual({ sessionVersion: 1 })
      state = { ...state, ...update.$set, sessionVersion: state.sessionVersion + 1 }
      for (const key of Object.keys(update.$unset)) delete state[key]
      return { matchedCount: 1 }
    }) as typeof User.updateOne
    expect(state.sessionVersion).toBe(1)
    conflict = false
    expect((await resetPassword(resetRequest())).status).toBe(200)
    expect(state.sessionVersion).toBe(2)
    await expect(verifyJwtPayload(currentToken)).rejects.toThrow('Session revoquee')
    expect((await resetPassword(resetRequest())).status).toBe(400)
  } finally {
    User.findById = originalFind
    User.findOneAndUpdate = originalUpdate
    User.findOne = originalFindOne
    User.updateOne = originalUpdateOne
    globalState.__mongooseCache = originalCache
    globalState.io = originalIo
    process.env = originalEnv
  }
})

test('sessions : vrais JWT refuses apres revocation en HTTP et dans le middleware', async () => {
  const originalEnv = { ...process.env }
  const globalState = globalThis as typeof globalThis & { __mongooseCache?: unknown }
  const originalCache = globalState.__mongooseCache
  const originalFind = User.findById
  const userId = '507f1f77bcf86cd799439011'
  let state: { sessionVersion: number; isActive: boolean } | null = { sessionVersion: 0, isActive: true }
  let unavailable = false
  try {
    process.env.JWT_SECRET = 'local-session-test-only-not-a-production-secret'
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/session-test-never-connected'
    globalState.__mongooseCache = { conn: null, promise: Promise.resolve(mongoose), uri: process.env.MONGODB_URI }
    User.findById = (() => ({ select: () => ({ lean: async () => {
      if (unavailable) throw new Error('Database unavailable')
      return state
    } }) })) as typeof User.findById
    const oldToken = await signAuthTokenWithExpiry({ userId, role: 'CLIENT' }, '1h')
    const request = (token: string, cookie = 'auth-token') => new NextRequest('https://market.itvisionplus.sn/compte/profil', { headers: { host: 'market.itvisionplus.sn', cookie: `${cookie}=${token}` } })
    expect((await verifyAuthServer(request(oldToken))).isAuthenticated).toBe(true)
    expect((await middleware(request(oldToken))).status).toBe(200)
    state.sessionVersion = 1
    await expect(verifyJwtPayload(oldToken)).rejects.toThrow('Session revoquee')
    await expect(verifyAuthToken(oldToken)).rejects.toThrow('Non authentifié')
    expect((await verifyAuthServer(request(oldToken))).isAuthenticated).toBe(false)
    expect((await verifyAuthServer(request(oldToken, 'admin-auth-token'))).isAuthenticated).toBe(false)
    expect((await verifyAuthServer(new NextRequest('https://market.itvisionplus.sn/api/client/profile', { headers: { authorization: `Bearer ${oldToken}` } }))).isAuthenticated).toBe(false)
    expect((await middleware(request(oldToken))).headers.get('location')).toContain('/login')
    const newToken = await signAuthTokenWithExpiry({ userId, role: 'CLIENT', sessionVersion: 1 }, '1h')
    expect((await verifyJwtPayload(newToken)).sessionVersion).toBe(1)
    expect((await verifyAuthServer(request(newToken))).isAuthenticated).toBe(true)
    expect((await middleware(request(newToken))).status).toBe(200)
    state.sessionVersion = 2
    const reissued = NextResponse.json({ success: true })
    await reissueAuthCookie(reissued, { _id: userId, role: 'VENDOR', sessionVersion: 2 }, 'VENDOR', 1)
    await expect(verifyJwtPayload(reissued.cookies.get('auth-token')!.value)).rejects.toThrow('Session revoquee')
    state.sessionVersion = 1
    unavailable = true
    await expect(verifyJwtPayload(newToken)).rejects.toThrow('temporairement indisponible')
    expect((await verifyAuthServer(request(newToken))).unavailable).toBe(true)
    expect((await middleware(request(newToken))).status).toBe(503)
    unavailable = false
    state = null
    await expect(verifyJwtPayload(newToken)).rejects.toThrow('Session revoquee')
    const serviceToken = await signAuthTokenWithExpiry({ userId: 'cron-auto-import', role: 'ADMIN', tokenUse: 'service' }, '1h')
    expect((await verifyJwtPayload(serviceToken)).tokenUse).toBe('service')
    const fakeService = await signAuthTokenWithExpiry({ userId: 'cron-auto-import', role: 'CLIENT', tokenUse: 'service' }, '1h')
    await expect(verifyJwtPayload(fakeService)).rejects.toThrow('Session invalide')
    const unstampedService = await signAuthTokenWithExpiry({ userId: 'cron-auto-import', role: 'ADMIN' }, '1h')
    await expect(verifyJwtPayload(unstampedService)).rejects.toThrow('Session invalide')
  } finally {
    User.findById = originalFind
    globalState.__mongooseCache = originalCache
    process.env = originalEnv
  }
})

test('sessions : changement de version, comptes historiques et desactives', () => {
  expect(isSessionCurrent({ domain: 'xeuy', role: 'CLIENT', phone: '771234567' }, { sessionVersion: 4 })).toBe(true)
  expect(isSessionCurrent({ domain: 'xeuy', role: 'CLIENT', phone: '771234567', typ: 'xeuy-refresh' }, { sessionVersion: 4 })).toBe(false)
  expect(isSessionCurrent({ domain: 'xeuy', role: 'CLIENT', phone: '771234567' }, { isActive: false })).toBe(false)
  expect(isSessionCurrent({}, {})).toBe(true)
  expect(isSessionCurrent({}, { sessionVersion: 1 })).toBe(false)
  expect(isSessionCurrent({ sessionVersion: 0, iat: 1234 }, { sessionVersion: 1 })).toBe(false)
  expect(isSessionCurrent({ sessionVersion: 1, iat: 1234 }, { sessionVersion: 1 })).toBe(true)
  expect(isSessionCurrent({ sessionVersion: 2 }, { sessionVersion: 1 })).toBe(false)
  expect(isSessionCurrent({}, null)).toBe(false)
  expect(isSessionCurrent({}, { isActive: false })).toBe(false)
  expect(isSessionCurrent({}, { deletedAt: new Date() })).toBe(false)
  for (const version of [-1, 0.5, '0', NaN, Infinity]) {
    expect(isSessionCurrent({ sessionVersion: version }, {})).toBe(false)
    expect(isSessionCurrent({}, { sessionVersion: version })).toBe(false)
  }
})

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, video: 'off' })

test.beforeEach(async ({}, testInfo) => {
  test.skip(!process.env.STOREFRONT_UI_PREVIEW && /^(parcours DDM|compte DDM)/.test(testInfo.title), 'Recette de composants avec API simulées : STOREFRONT_UI_PREVIEW=1 requis.')
})

test('CSRF production : origine stricte, cookie admin, Bearer et repli jeton', () => {
  const previousMode = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'production' })
  try {
    const origin = 'https://market.itvisionplus.sn'
    const scenarios: { name: string; headers: Record<string, string>; status: number; url?: string }[] = [
      { name: 'cookie seul', headers: { cookie: 'auth-token=synthetic' }, status: 403 },
      { name: 'cookie et origine tierce', headers: { cookie: 'auth-token=synthetic', origin: 'https://attacker.example' }, status: 403 },
      { name: 'sous-domaine voisin', headers: { cookie: 'auth-token=synthetic', origin: 'https://other.itvisionplus.sn', 'sec-fetch-site': 'same-site' }, status: 403 },
      { name: 'origine nulle', headers: { cookie: 'auth-token=synthetic', origin: 'null' }, status: 403 },
      { name: 'origine invalide', headers: { cookie: 'auth-token=synthetic', origin: 'invalid-url' }, status: 403 },
      { name: 'cookie admin', headers: { cookie: 'admin-auth-token=synthetic', origin: 'https://attacker.example' }, status: 403 },
      { name: 'cookie et faux Bearer', headers: { cookie: 'auth-token=synthetic', authorization: 'Bearer synthetic', origin: 'https://attacker.example' }, status: 403 },
      { name: 'Bearer natif sans cookie', headers: { authorization: 'Bearer synthetic' }, status: 200 },
      { name: 'Bearer navigateur sans cookie', headers: { authorization: 'Bearer synthetic', origin: 'https://other.example' }, status: 200 },
      { name: 'origine identique', headers: { cookie: 'auth-token=synthetic', origin, 'sec-fetch-site': 'same-origin' }, status: 200 },
      { name: 'checkout invite meme origine', headers: { origin }, status: 200 },
      { name: 'referer meme origine', headers: { cookie: 'auth-token=synthetic', referer: `${origin}/compte/profil` }, status: 200 },
      { name: 'referer tiers', headers: { cookie: 'auth-token=synthetic', referer: 'https://other.example/form' }, status: 403 },
      { name: 'origine prime sur referer', headers: { cookie: 'auth-token=synthetic', origin: 'null', referer: `${origin}/compte` }, status: 403 },
      { name: 'HTTP refuse en production', headers: { cookie: 'auth-token=synthetic', origin: 'http://market.itvisionplus.sn' }, status: 403 },
      { name: 'proxy TLS avec Host public', url: 'http://127.0.0.1:3000/api/client/profile', headers: { host: 'market.itvisionplus.sn', origin, cookie: 'auth-token=synthetic' }, status: 200 },
      { name: 'forwarded-host non fiable', headers: { 'x-forwarded-host': 'other.example', origin: 'https://other.example', cookie: 'auth-token=synthetic' }, status: 403 },
      { name: 'double jeton sans origine', headers: { cookie: 'auth-token=synthetic; csrf-token=test-token', 'x-csrf-token': 'test-token' }, status: 200 },
      { name: 'double jeton different', headers: { cookie: 'auth-token=synthetic; csrf-token=test-token', 'x-csrf-token': 'other-token' }, status: 403 },
      { name: 'jeton ne contourne pas origine', headers: { cookie: 'csrf-token=test-token', 'x-csrf-token': 'test-token', origin: 'https://other.example' }, status: 403 },
      { name: 'fetch cross-site sans origine', headers: { cookie: 'csrf-token=test-token', 'x-csrf-token': 'test-token', 'sec-fetch-site': 'cross-site' }, status: 403 },
      { name: 'cookie NextAuth decoupe', headers: { cookie: '__Secure-next-auth.session-token.0=synthetic', authorization: 'Bearer synthetic', origin: 'https://attacker.example' }, status: 403 },
      { name: 'upload multipart tiers', url: `${origin}/api/upload`, headers: { cookie: 'auth-token=synthetic', origin: 'https://attacker.example', 'content-type': 'multipart/form-data; boundary=test' }, status: 403 },
      { name: 'upload meme origine', url: `${origin}/api/upload`, headers: { cookie: 'auth-token=synthetic', origin, 'content-type': 'multipart/form-data; boundary=test' }, status: 200 },
      { name: 'logout protege', url: `${origin}/api/auth/logout`, headers: { cookie: 'auth-token=synthetic', origin: 'https://attacker.example' }, status: 403 },
      { name: 'login navigateur tiers', url: `${origin}/api/auth/login`, headers: { origin: 'https://attacker.example' }, status: 403 },
      { name: 'login natif sans cookie', url: `${origin}/api/auth/login`, headers: {}, status: 200 },
      { name: 'OTP natif sans cookie', url: `${origin}/api/auth/mobile/verify-otp`, headers: {}, status: 200 },
      { name: 'auth ne contourne pas cookie sans origine', url: `${origin}/api/auth/logout`, headers: { cookie: 'auth-token=synthetic' }, status: 403 },
      { name: 'callback fournisseur', url: `${origin}/api/payment/paydunya/callback`, headers: {}, status: 200 },
      { name: 'webhook signe', url: `${origin}/api/payments/webhook`, headers: {}, status: 200 },
      { name: 'callback NextAuth', url: `${origin}/api/auth/callback/credentials`, headers: {}, status: 200 },
      { name: 'prefixe ressemblant non exempte', url: `${origin}/api/payments/manual-review-fake`, headers: { cookie: 'auth-token=synthetic' }, status: 403 },
      { name: 'sous-chemin auth non exempte', url: `${origin}/api/client/api/auth/login`, headers: { cookie: 'auth-token=synthetic' }, status: 403 },
    ]
    for (const scenario of scenarios) {
      const request = new NextRequest(scenario.url || `${origin}/api/client/profile`, { method: 'PUT', headers: scenario.headers })
      expect(csrfMiddleware(request)?.status || 200, scenario.name).toBe(scenario.status)
    }
    const tokenResponse = generateCSRFResponse(new NextRequest(`${origin}/api/csrf`))
    expect(tokenResponse.headers.get('cache-control')).toBe('no-store')
    expect(tokenResponse.headers.get('set-cookie')).toContain('HttpOnly')
  } finally {
    if (previousMode === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
    else Object.assign(process.env, { NODE_ENV: previousMode })
  }
})

test('paiement : aucune cle privee dans les proprietes client', () => {
  const settings = { providers: { manual: { waveMerchantPhone: '+221770000000', unexpected: 'private-canary' }, gateway: { active: true, provider: 'paydunya', apiKey: 'private-canary', apiSecret: 'private-canary', merchantId: 'private-canary' }, escrow: { enabled: true, holdPercentage: 100 } } } as unknown as PaymentSettings
  const publicSettings = toCheckoutPaymentSettings(settings)
  expect(publicSettings.providers.gateway).toEqual({ active: true, provider: 'paydunya' })
  expect(publicSettings.providers.manual.waveMerchantPhone).toBe('+221770000000')
  expect(JSON.stringify(publicSettings)).not.toContain('private-canary')
})

test('adresse geocodee : region, departement et quartier libre', () => {
  expect(mapGeocodedAddress({ country_code: 'sn', state: 'Région de Dakar', county: 'Département de Dakar', suburb: 'Ouakam', road: 'Rue 10', house_number: '42' })).toEqual({ region: 'Dakar', department: 'Dakar', neighborhood: 'Ouakam', street: '42 Rue 10' })
  expect(mapGeocodedAddress({ country_code: 'sn', state: 'Région de Thiès', county: 'Mbour' })).toEqual({ region: 'Thiès', department: 'Mbour', neighborhood: '', street: '' })
  expect(mapGeocodedAddress({ country_code: 'sn', state: 'Lieu non référencé' })).toEqual({ region: '', department: '', neighborhood: '', street: '' })
  expect(() => mapGeocodedAddress({ country_code: 'fr' })).toThrow('Sénégal')
})

const product = { id: 'ui-product', _id: 'ui-product', name: 'Camera de test', category: 'Sécurité', image: '/placeholder.svg', price: 1234567, minOrderQty: 5, priceTiers: [{ minQty: 1, price: 1234567 }, { minQty: 10, price: 1200000 }], pricing: { salePrice: 1234567, currency: 'FCFA' } }

test('parcours DDM : catalogue en panne puis pagination recuperable', async ({ page, context }) => {
  let initialFailure = true
  let nextFailure = true
  await context.route('**/api/catalog/products?**', route => {
    const currentPage = Number(new URL(route.request().url()).searchParams.get('page') || 1)
    if (initialFailure || (currentPage === 2 && nextFailure)) return route.fulfill({ status: 503, json: { error: 'Indisponible' } })
    return route.fulfill({ json: { success: true, products: [currentPage === 1 ? product : { ...product, id: 'second', _id: 'second', name: 'Second produit' }], pagination: { total: 2, hasMore: currentPage === 1 } } })
  })
  await page.goto('/produits')
  await expect(page.getByRole('alert')).toContainText('temporairement indisponible')
  await expect(page.getByText('Catalogue momentanément vide')).toHaveCount(0)
  initialFailure = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Camera de test', { exact: true }).first()).toBeVisible()
  await page.getByText('Camera de test', { exact: true }).first().scrollIntoViewIfNeeded()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Fin du catalogue', { exact: true })).toHaveCount(0)
  nextFailure = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Second produit', { exact: true }).first()).toBeVisible()
})

test('parcours DDM : produit panne, avis indisponibles et lot minimum', async ({ page, context }) => {
  let unavailable = true
  await context.route('**/api/catalog/products/ui-product', route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: { success: true, product } }))
  await context.route('**/api/reviews?**', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/produits/ui-product')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Produit introuvable', { exact: true })).toHaveCount(0)
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Quantité', exact: true })).toHaveValue('5')
  await expect(page.getByText('Avis temporairement indisponibles', { exact: true }).first()).toBeAttached()
  await page.getByRole('button', { name: 'Diminuer la quantité', exact: true }).isDisabled().then(disabled => expect(disabled).toBe(true))
  await page.getByRole('button', { name: 'Augmenter la quantité', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Quantité', exact: true })).toHaveValue('6')
})

test('parcours DDM : commandes erreur sans faux vide et statut livre', async ({ page, context }) => {
  let unavailable = true
  await context.route('**/api/account/dashboard', route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: { dashboard: { orders: [{ orderId: 'CMD-TEST', status: 'delivered', paymentStatus: 'paid', total: 1234567, createdAt: '2026-10-01', items: [{ name: 'Camera de test', qty: 5, unit: 246913 }] }] } } }))
  await page.goto('/compte/commandes')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Aucune commande', { exact: true })).toHaveCount(0)
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Livrée', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Payer', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /Annulées/ }).click()
  await expect(page.getByText('Aucune commande', { exact: true })).toBeVisible()
})

test('compte DDM : position proposee puis confirmee sans sauvegarde automatique', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 14.7167, longitude: -17.4677, accuracy: 20 })
  let lookupCount = 0
  let saved = false
  await context.route('**/api/client/address-from-position', async route => {
    lookupCount++
    expect(route.request().postDataJSON()).toEqual({ latitude: 14.7167, longitude: -17.4677 })
    await route.fulfill({ json: { address: { region: 'Dakar', department: 'Dakar', neighborhood: 'Ouakam', street: '42 Rue 10' } } })
  })
  await context.route('**/api/client/addresses', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { addresses: [] } })
    saved = true
    const payload = route.request().postDataJSON()
    expect(payload.street).toBe('42 Rue 10')
    expect(payload.phone).toBe('+221 771234567')
    expect(payload.latitude).toBeUndefined()
    await route.fulfill({ status: 201, json: { address: { id: 'address-created', ...payload, isDefault: true } } })
  })
  await page.goto('/compte/profil')
  const book = page.locator('#adresses')
  await book.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await book.getByRole('button', { name: 'Utiliser ma position', exact: true }).click()
  expect(lookupCount).toBe(0)
  await book.getByRole('button', { name: 'Autoriser et localiser', exact: true }).click()
  await expect(book.getByRole('button', { name: 'Utiliser cette adresse', exact: true })).toBeVisible()
  await expect(book.getByLabel('Adresse (rue, N°, point de repère)', { exact: true })).toHaveValue('')
  expect(saved).toBe(false)
  await book.getByRole('button', { name: 'Utiliser cette adresse', exact: true }).click()
  await expect(book.getByPlaceholder('Précisez le quartier')).toHaveValue('Ouakam')
  await book.getByLabel('Nom complet', { exact: true }).fill('Client de recette')
  await book.getByLabel('Téléphone du destinataire', { exact: true }).fill('771234567')
  await book.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(book.getByText('Par défaut', { exact: true })).toBeVisible()
  expect(saved).toBe(true)
})

test('compte DDM : erreur profil conserve les champs', async ({ page, context }) => {
  await context.route('**/api/client/profile', route => route.request().method() === 'PUT' ? route.fulfill({ status: 400, json: { error: 'Modification refusée pour ce test.' } }) : route.continue())
  await page.goto('/compte/profil')
  const name = page.locator('#identite').getByLabel('Nom complet', { exact: true })
  await name.fill('Nom conservé')
  await page.getByRole('button', { name: 'Enregistrer les informations', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Modification refusée')
  await expect(name).toHaveValue('Nom conservé')
})

test('parcours DDM : favoris panne et suppression confirmee, lot minimum', async ({ page, context }) => {
  let loadFailure = true
  let deleteFailure = true
  await context.route('**/api/favorites**', route => route.fulfill(route.request().method() === 'DELETE'
    ? deleteFailure ? { status: 503, json: {} } : { json: { success: true, favorites: [] } }
    : loadFailure ? { status: 503, json: {} } : { json: { success: true, favorites: ['ui-product'] } }))
  await context.route('**/api/catalog/products?**', route => route.fulfill({ json: { products: [product] } }))
  await page.goto('/produits/favoris')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByText('Aucun favori pour le moment')).toHaveCount(0)
  loadFailure = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('cart:items', '[]'))
  await page.getByRole('button', { name: 'Ajouter au panier', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cart:items') || '[]')[0])).toMatchObject({ qty: 5, unit: 1234567 })
  await page.getByRole('button', { name: `Retirer ${product.name} des favoris` }).click()
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(page.getByText('La suppression n’a pas pu être terminée.', { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: product.name })).toBeVisible()
  deleteFailure = false
  await page.getByRole('button', { name: 'Confirmer la suppression' }).click()
  await expect(page.getByText('Aucun favori pour le moment')).toBeVisible()
})

test('parcours DDM : suivi sans repli public sur panne ni dates inventees', async ({ page, context }) => {
  let unavailable = true
  let publicCalls = 0
  let status = 'shipped'
  await context.route('**/api/order/track-public?**', route => { publicCalls++; return route.fulfill({ status: 404, json: {} }) })
  await context.route('**/api/order/CMD-TEST-1234', route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: { order: { orderId: 'CMD-TEST-1234', status, paymentStatus: 'paid', createdAt: '2026-10-01', eta: '2026-10-20', total: 125000, items: [] } } }))
  await page.goto('/suivi/CMD-TEST-1234')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(publicCalls).toBe(0)
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByText('Date non communiquée').first()).toBeVisible()
  await expect(page.getByText('Invalid Date', { exact: false })).toHaveCount(0)
  status = 'cancelled'
  await page.reload()
  await expect(page.getByText('Cette commande a été annulée.').first()).toBeVisible()
  await expect(page.getByText('Paiement confirmé', { exact: true })).toHaveCount(0)
})

test('parcours DDM : groupes panne et reprise, actualisation indisponible', async ({ page, context }) => {
  let unavailable = true
  await context.route('**/api/group-orders?**', route => route.fulfill(unavailable ? { status: 503, json: {} } : { json: { groups: [] } }))
  await page.goto('/achats-groupes')
  await expect(page.getByRole('alert')).toBeVisible()
  unavailable = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Achats groupés', exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await page.goto('/achats-groupes/ui-group')
  await expect(page.getByRole('heading', { name: 'Groupe de recette', exact: true })).toBeVisible()
  await context.route('**/api/group-orders/ui-group', route => route.fulfill({ status: 503, json: {} }))
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByRole('alert')).toContainText('Réessayez avant de vous inscrire')
  await expect(page.getByRole('heading', { name: 'Groupe de recette', exact: true })).toHaveCount(0)
})

test('parcours DDM : copie refusee et paiement non confirme sur panne', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Refus') } } }))
  await page.goto('/commandes/CMD-TEST-1234')
  await page.getByRole('button', { name: 'Copier', exact: true }).first().click()
  await expect(page.getByRole('status')).toContainText('Copie impossible')
  await expect(page.getByRole('button', { name: 'Copié', exact: true })).toHaveCount(0)
  await context.route('**/api/payment/status?**', route => route.fulfill({ status: 503, json: {} }))
  await page.goto('/paiement/checkout/CMD-TEST-1234')
  await page.getByRole('button', { name: 'Copier', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Copie impossible')
  await expect(page.getByRole('alert')).toContainText('Ne payez pas à nouveau', { timeout: 12000 })
  await expect(page.getByRole('button', { name: /^Payer / })).toBeDisabled()
  await expect(page.getByText('débité seulement après confirmation', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Paiement confirmé', { exact: true })).toHaveCount(0)
  await context.route('**/api/payment/checkout/init', route => route.fulfill({ status: 503, json: { url: 'https://example.invalid', error: 'Passerelle indisponible' } }))
  await page.goto('/paiement/checkout/CMD-TEST-1234?gateway=1')
  await page.getByRole('button', { name: /^Payer / }).click()
  await expect(page.getByRole('status')).toHaveText('Passerelle indisponible')
  await expect(page).toHaveURL(/gateway=1/)
})

test('parcours DDM : mobile tablette desktop clair et sombre', async ({ page }, testInfo) => {
  test.setTimeout(120000)
  for (const path of ['/compte', '/compte/profil', '/compte/commandes', '/produits', '/produits/ui-product', '/produits/favoris', '/commandes/CMD-TEST-1234', '/suivi/CMD-TEST-1234', '/achats-groupes', '/achats-groupes/ui-group', '/paiement/checkout/CMD-TEST-1234', '/boutiques/ui-shop', '/market']) {
    await page.goto(path)
    await expect(page.locator('main h1').first()).toBeVisible()
    await expect(page.getByText('Chargement du profil…', { exact: true })).toHaveCount(0)
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${path} ${width} ${colorScheme}` }).toBe(true)
        await page.screenshot({ path: testInfo.outputPath(`${path.replace(/\//g, '-')}-${width}-${colorScheme}.png`), fullPage: true, animations: 'disabled' })
      }
    }
  }
})

test('profil : geolocalisation autorisee uniquement sur le document concerne', () => {
  for (const path of ['/compte/profil', '/compte/profil/', '/compte', '/admin', '/produits']) {
    const response = NextResponse.next()
    applySecurityHeaders(response, path)
    expect(response.headers.get('permissions-policy')).toContain(path.replace(/\/$/, '') === '/compte/profil' ? 'geolocation=(self)' : 'geolocation=()')
    expect(response.headers.get('permissions-policy')).toContain('camera=(), microphone=()')
  }
})

test('profil navigateur : position autorisee par les entetes et refusee ailleurs', async ({ page, context }) => {
  const origin = 'https://market.itvisionplus.test'
  await context.grantPermissions(['geolocation'], { origin })
  await context.setGeolocation({ latitude: 14.7167, longitude: -17.4677, accuracy: 20 })
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== origin) return route.abort()
    const response = NextResponse.next()
    applySecurityHeaders(response, url.pathname)
    return route.fulfill({ contentType: 'text/html', headers: Object.fromEntries(response.headers), body: '<html><body>Profil de recette</body></html>' })
  })
  const position = () => page.evaluate(() => new Promise<{ latitude?: number; longitude?: number; error?: number }>(resolve => {
    navigator.geolocation.getCurrentPosition(result => resolve({ latitude: result.coords.latitude, longitude: result.coords.longitude }), error => resolve({ error: error.code }), { timeout: 3000 })
  }))
  await page.goto(`${origin}/compte/profil`)
  expect(await position()).toEqual({ latitude: 14.7167, longitude: -17.4677 })
  await page.goto(`${origin}/produits`)
  expect(await position()).toEqual({ error: 1 })
})

test('CSRF navigateur : formulaire inter-sous-domaines avec cookie httpOnly bloque', async ({ page, context }) => {
  const previousMode = process.env.NODE_ENV
  Object.assign(process.env, { NODE_ENV: 'production' })
  let acceptedWrites = 0
  let blockedCookieSeen = false
  const origin = 'https://market.itvisionplus.test'
  try {
    await context.addCookies([{ name: 'auth-token', value: 'synthetic', domain: '.itvisionplus.test', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }])
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (!['market.itvisionplus.test', 'other.itvisionplus.test'].includes(url.hostname)) return route.abort()
      if (url.pathname === '/api/client/profile' || url.pathname === '/api/upload') {
        const headers = await request.allHeaders()
        const result = csrfMiddleware(new NextRequest(request.url(), { method: request.method(), headers }))
        if (result) {
          blockedCookieSeen = headers.cookie?.includes('auth-token=synthetic') || false
          return route.fulfill({ status: result.status, contentType: 'application/json', body: await result.text() })
        }
        acceptedWrites++
        return route.fulfill({ json: { success: true } })
      }
      return route.fulfill({ contentType: 'text/html', body: `<html><body><form method="post" action="${origin}/api/client/profile"><input name="name" value="forged"><button>Envoyer</button></form></body></html>` })
    })
    await page.goto(origin)
    expect(await page.evaluate(() => document.cookie)).not.toContain('auth-token')
    expect(await page.evaluate(async () => (await fetch('/api/client/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Client de recette' }) })).status)).toBe(200)
    expect(await page.evaluate(async () => (await fetch('/api/upload', { method: 'POST', body: new FormData() })).status)).toBe(200)
    await page.goto('https://other.itvisionplus.test')
    const denied = page.waitForResponse(`${origin}/api/client/profile`)
    await page.getByRole('button', { name: 'Envoyer', exact: true }).click()
    expect((await denied).status()).toBe(403)
    expect(blockedCookieSeen).toBe(true)
    expect(acceptedWrites).toBe(2)
  } finally {
    if (previousMode === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV')
    else Object.assign(process.env, { NODE_ENV: previousMode })
  }
})