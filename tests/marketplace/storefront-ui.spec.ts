import { test, expect } from '@playwright/test'
import { runInNewContext } from 'node:vm'
import { THEME_INIT_SCRIPT, normalizeTheme, resolveTheme } from '../../src/lib/theme'

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, video: 'off', colorScheme: 'light' })

const shippingSettings = {
  success: true,
  internalCostsVersion: 1,
  pricingVersion: 1,
  rates: {
    air_15: { rate: 8500, minimumCharge: 8500 }, air_express: { rate: 12000, minimumCharge: 12000 },
    sea_freight: { rate: 180000, minimumCharge: 0 }, local_24h: { rate: 1500, minimumCharge: 0 },
  },
  internalCosts: {
    air_15: { rate: 8000, minimumCharge: 0 }, air_express: { rate: 11000, minimumCharge: 0 },
    sea_freight: { rate: 180000, minimumCharge: 0 }, local_24h: { rate: 1000, minimumCharge: 1000 },
  },
}

test('tarifs transport admin : couts distincts, sauvegarde et affichage responsive', async ({ page, context }, testInfo) => {
  let state = structuredClone(shippingSettings)
  let rejectSave = true
  await context.route('**/api/admin/shipping-rates', async route => {
    if (route.request().method() === 'POST') {
      if (rejectSave) return route.fulfill({ status: 500, json: { success: false, error: 'Enregistrement indisponible.' } })
      expect(route.request().postDataJSON().internalCostsVersion).toBe(state.internalCostsVersion)
      expect(route.request().postDataJSON().pricingVersion).toBe(state.pricingVersion)
      state = { ...state, ...route.request().postDataJSON(), internalCostsVersion: state.internalCostsVersion + 1, pricingVersion: state.pricingVersion + 1 }
    }
    await route.fulfill({ json: state })
  })
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/admin/prices')
  const normal = page.getByRole('spinbutton', { name: 'Normal 10-15 jours - coût (FCFA/kg)', exact: true })
  await expect(normal).toHaveValue('8000')
  await expect(page.getByRole('spinbutton', { name: 'Express 3-5 jours - coût (FCFA/kg)', exact: true })).toHaveValue('11000')
  await expect(page.getByRole('spinbutton', { name: 'Maritime - coût (FCFA/m³)', exact: true })).toHaveValue('180000')
  await expect(page.getByRole('spinbutton', { name: 'Normal 10-15 jours - minimum transporteur (FCFA)', exact: true })).toHaveValue('0')
  await normal.fill('-1')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  expect(await normal.evaluate(element => (element as HTMLInputElement).validity.valid)).toBe(false)
  await normal.fill('9000')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Enregistrement indisponible.')
  await expect(normal).toHaveValue('9000')
  rejectSave = false
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Tarifs enregistrés.')
  expect(state.internalCosts.air_15.rate).toBe(9000)
  expect(state.internalCostsVersion).toBe(2)
  expect(state.rates.air_15).toEqual({ rate: 8500, minimumCharge: 8500 })
  await page.reload()
  await expect(normal).toHaveValue('9000')
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dark of [false, true]) {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await expect(normal).toHaveCSS('background-color', dark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)')
      const contrasts = await page.locator('fieldset .text-gray-700, fieldset .text-gray-600, fieldset input[type="number"]').evaluateAll(elements => {
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = 1
        const context = canvas.getContext('2d', { willReadFrequently: true })!
        const rgb = (color: string) => {
          context.clearRect(0, 0, 1, 1)
          context.fillStyle = color
          context.fillRect(0, 0, 1, 1)
          return Array.from(context.getImageData(0, 0, 1, 1).data)
        }
        const luminance = (color: number[]) => {
          const channels = color.slice(0, 3).map(value => {
            const normalized = value / 255
            return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
          })
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        }
        return elements.map(element => {
          let ancestor: Element | null = element
          let background = [255, 255, 255, 255]
          while (ancestor) {
            const candidate = rgb(getComputedStyle(ancestor).backgroundColor)
            if (candidate[3] === 255) { background = candidate; break }
            ancestor = ancestor.parentElement
          }
          const foreground = luminance(rgb(getComputedStyle(element).color))
          const behind = luminance(background)
          return (Math.max(foreground, behind) + 0.05) / (Math.min(foreground, behind) + 0.05)
        })
      })
      expect(Math.min(...contrasts)).toBeGreaterThanOrEqual(4.5)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`shipping-admin-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
    }
  }
})

test('tarifs transport admin : panne de lecture sans valeurs de remplacement', async ({ page, context }) => {
  let failed = true
  await context.route('**/api/admin/shipping-rates', route => route.fulfill(failed
    ? { status: 500, json: { success: false, error: 'Lecture indisponible.' } }
    : { json: shippingSettings }))
  await page.goto('/admin/prices')
  await expect(page.getByRole('alert')).toHaveText('Lecture indisponible.')
  await expect(page.getByRole('spinbutton')).toHaveCount(0)
  failed = false
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Normal 10-15 jours - coût (FCFA/kg)', exact: true })).toHaveValue('8000')
})

test('tarifs transport admin : conflit entre deux administrateurs et rechargement explicite', async ({ page, context }) => {
  let state = structuredClone(shippingSettings)
  await context.route('**/api/admin/shipping-rates', async route => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON()
      if (payload.internalCostsVersion !== state.internalCostsVersion || payload.pricingVersion !== state.pricingVersion) {
        return route.fulfill({ status: 409, json: { success: false, error: 'Les coûts ont été modifiés ailleurs. Rechargez les tarifs.' } })
      }
      state = { ...state, ...payload, internalCostsVersion: state.internalCostsVersion + 1, pricingVersion: state.pricingVersion + 1 }
    }
    await route.fulfill({ json: state })
  })
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/admin/prices')
  const normal = page.getByRole('spinbutton', { name: 'Normal 10-15 jours - coût (FCFA/kg)', exact: true })
  await expect(normal).toHaveValue('8000')
  await normal.fill('9300')
  state.internalCosts.air_15.rate = 9600
  state.internalCostsVersion = 2
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('modifiés ailleurs')
  await expect(normal).toHaveValue('9300')
  await page.getByRole('button', { name: 'Recharger les tarifs', exact: true }).click()
  await expect(normal).toHaveValue('9600')
  await normal.fill('9700')
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('Tarifs enregistrés.')
  expect(state.internalCosts.air_15.rate).toBe(9700)
  expect(state.internalCostsVersion).toBe(3)
})

test('tarification admin : version, conflit, rechargement et affichage responsive', async ({ page, context }, testInfo) => {
  let state = { success: true, pricingVersion: 1, permissions: { canWrite: true }, defaults: { defaultExchangeRate: 100, defaultServiceFeeRate: 10, singleImportServiceFeeRate: 15, defaultInsuranceRate: 2.5, defaultB2BDiscountPercent: 15, serviceFeeTiers: [{ minAmount: 0, feeRate: 10, label: 'Standard', description: 'Frais standard' }] } }
  await context.route('**/api/admin/settings', async route => {
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON()
      if (payload.pricingVersion !== state.pricingVersion) return route.fulfill({ status: 409, json: { success: false, error: 'Tarifs modifies ailleurs. Rechargez les reglages.' } })
      state = { ...state, defaults: payload.defaults, pricingVersion: state.pricingVersion + 1 }
    }
    await route.fulfill({ json: state })
  })
  await page.goto('/admin/prices?panel=defaults')
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Réglages globaux de tarification' }) })
  const exchange = form.getByRole('spinbutton', { name: 'Taux de change' })
  await expect(exchange).toHaveValue('100')
  await exchange.fill('120')
  state = { ...state, pricingVersion: 2, defaults: { ...state.defaults, defaultExchangeRate: 110 } }
  await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(form.getByRole('alert')).toContainText('modifies ailleurs')
  await expect(exchange).toHaveValue('120')
  await form.getByRole('button', { name: 'Recharger les réglages', exact: true }).click()
  await expect(exchange).toHaveValue('110')
  await exchange.fill('115')
  await form.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(form.getByRole('status')).toHaveText('Réglages enregistrés.')
  expect(state.pricingVersion).toBe(3)
  expect(state.defaults.defaultExchangeRate).toBe(115)
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const dark of [false, true]) {
      await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light' })
      await expect(exchange).toHaveCSS('background-color', dark ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath(`pricing-admin-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
    }
  }
})

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('compare:ids', 'ui-a,ui-b')
    localStorage.setItem('cart:items', JSON.stringify([{ id: 'ui-product', name: 'Produit de test', qty: 1, price: 15000, minOrderQty: 1, image: '/placeholder.svg' }]))
  })
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    let body: object = { success: true, products: [], categories: [], notifications: [], featured: [], rates: [], addresses: [], points: [] }
    if (pathname === '/api/auth/login') body = { user: { id: 'ui-only', role: 'VENDOR' } }
    if (pathname === '/api/vendor/shop') body = { shop: { slug: 'ui-test', status: 'active' } }
    if (pathname === '/api/grains') body = { success: true, user: { balance: 1000 } }
    if (pathname === '/api/pricing/settings') body = { success: true, defaults: { singleImportServiceFeeRate: 15 } }
    if (pathname === '/api/pricing/quote') body = { quote: {
      items: [{ id: 'ui-product', unitPrice: 15000 }],
      pricing: { sourcingCost: 15000, usingRetailPricing: false, serviceFee: { rate: 15, amount: 2250 }, insurance: { rate: 2.5, amount: 375 }, quantityDiscount: null, subtotal: 17625 },
      shipping: { label: 'Transport test', cost: 2500 }, discounts: { promo: null }, total: 20125,
    } }
    if (pathname === '/api/market/sourcing') body = { success: true, request: { id: 'ui-only', reference: 'TEST-UI', trackUrl: '/market/sourcing/ui-only' } }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  })
})

test('navigation sans debordement, logo compact clair et sombre', async ({ page }) => {
  await page.goto('/tarification')
  await expect(page.getByText('Estimation pour 1 pièce', { exact: true })).toBeVisible()
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const menu = page.getByRole('button', { name: 'Ouvrir le menu', exact: true })
    if (width < 1280) {
      await expect(menu).toBeVisible()
      await menu.click()
      await expect(page.locator('#mobile-menu')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(menu).toBeFocused()
    } else {
      await expect(menu).toBeHidden()
      await expect(page.locator('header').getByRole('link', { name: 'Ma boutique', exact: true })).toBeVisible()
    }
  }
  for (const dark of [false, true]) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value), dark)
    const logo = page.locator('header a[href="/market"] img:visible')
    await expect(logo).toHaveCount(1)
    await expect(logo).toHaveAttribute('src', dark ? /#compact-dark$/ : /#compact$/)
    const opaquePixels = await logo.evaluate(async element => {
      const image = element as HTMLImageElement
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 164
      canvas.height = 56
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0, 164, 56)
      const pixels = context.getImageData(0, 0, 164, 56).data
      let light = 0
      let ink = 0
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (pixels[offset + 3] < 128) continue
        if (pixels[offset] > 220 && pixels[offset + 1] > 220 && pixels[offset + 2] > 220) light++
        if (pixels[offset] < 80 && pixels[offset + 1] < 80 && pixels[offset + 2] < 80) ink++
      }
      return { light, ink }
    })
    expect(dark ? opaquePixels.light : opaquePixels.ink).toBeGreaterThan(100)
  }
  await page.goto('/market/boutiques')
  await expect(page.locator('header a[href="/market"][aria-current="page"]')).toHaveCount(0)
  await expect(page.locator('header a[href="/market/boutiques"][aria-current="page"]')).toBeVisible()
})

test('paiement au-dessus de la navigation et de la zone de securite', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/checkout/adresse')
  const pay = page.getByRole('button', { name: 'Aller au paiement' }).filter({ visible: true })
  await expect(pay).toBeEnabled()
  for (const width of [320, 390, 414]) {
    await page.setViewportSize({ width, height: 844 })
    for (const inset of [0, 34]) {
      await page.getByRole('navigation', { name: 'Navigation mobile' }).evaluate((element, padding) => { element.style.paddingBottom = `${padding}px` }, inset)
      await expect.poll(async () => {
        const payment = await pay.boundingBox()
        const navigation = await page.getByRole('navigation', { name: 'Navigation mobile' }).boundingBox()
        const sourcing = await page.getByRole('button', { name: 'Trouvez-moi un produit en Chine' }).boundingBox()
        return !!payment && !!navigation && !!sourcing && payment.y + payment.height <= Math.min(navigation.y, sourcing.y - 4)
      }).toBe(true)
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
  }
})

test('modale accessible, depot valide et invalide, envoi simule', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/tarification')
  const opener = page.getByRole('button', { name: 'Trouvez-moi un produit en Chine' })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Trouvez-moi ce produit' })
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: 'Fermer la demande', exact: true })
  const send = dialog.getByRole('button', { name: 'Envoyer la demande', exact: true })
  await send.focus()
  await page.keyboard.press('Tab')
  if (await page.evaluate(() => document.activeElement === document.body)) await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  if (await page.evaluate(() => document.activeElement === document.body)) await page.keyboard.press('Shift+Tab')
  await expect(send).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await opener.click()
  await dialog.locator('input[type="file"]').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await expect(dialog.getByRole('alert')).toContainText('Format')
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1kAAAAASUVORK5CYII='), character => character.charCodeAt(0))
    data.items.add(new File([bytes], 'product.png', { type: 'image/png' }))
    return data
  })
  await dialog.getByRole('button', { name: /Télécharger une photo/ }).locator('..').dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
  await expect(dialog.getByAltText('Aperçu')).toBeVisible()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Texte', exact: true }).click()
  await dialog.getByLabel('Description', { exact: true }).fill('Demande de test sans envoi reel')
  await dialog.getByLabel('Téléphone pour recevoir la proposition par SMS').fill('+221770000000')
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await send.click()
  await expect(dialog.getByText('TEST-UI', { exact: true })).toBeVisible()
  await close.click()
  await expect(opener).toBeFocused()
})

test('theme initial coherent sans stockage, avec systeme et preference explicite', () => {
  for (const stored of [null, 'light', 'dark', 'system', 'invalid']) {
    for (const systemDark of [false, true]) {
      for (const blocked of [false, true]) {
        const preference = blocked ? null : stored
        const expected = preference === 'dark' || (preference !== 'light' && systemDark) ? 'dark' : 'light'
        const root = {
          dark: false,
          classList: { toggle: (_name: string, value: boolean) => { root.dark = value } },
          style: { colorScheme: '' },
        }
        runInNewContext(THEME_INIT_SCRIPT, {
          document: { documentElement: root },
          localStorage: { getItem: () => { if (blocked) throw new Error('Stockage indisponible'); return stored } },
          window: { matchMedia: () => ({ matches: systemDark }) },
        })
        expect(root.dark).toBe(expected === 'dark')
        expect(root.style.colorScheme).toBe(expected)
        expect(resolveTheme(normalizeTheme(preference), systemDark)).toBe(expected)
      }
    }
  }
})

test('theme partage entre boutons, choix explicite prioritaire et systeme dynamique', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/tarification')
  const toggle = page.locator('button[aria-label="Changer le thème"]:visible')
  await expect(toggle).toHaveAttribute('title', 'Thème: Système')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await toggle.click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click()
  const buttons = page.locator('button[aria-label="Changer le thème"]')
  await expect(buttons).toHaveCount(2)
  for (const expected of ['Sombre', 'Système', 'Clair']) {
    await toggle.click()
    await expect(buttons.nth(0)).toHaveAttribute('title', `Thème: ${expected}`)
    await expect(buttons.nth(1)).toHaveAttribute('title', `Thème: ${expected}`)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(toggle).toHaveAttribute('title', 'Thème: Clair')
  }
  await toggle.click()
  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Thème: Système')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(toggle).toHaveAttribute('title', 'Thème: Système')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('theme synchronise entre onglets et utilisable quand la sauvegarde est refusee', async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tarification')
  const toggle = page.locator('button[aria-label="Changer le thème"]:visible')
  await expect(toggle).toHaveAttribute('title', 'Thème: Système')
  await toggle.click()
  await toggle.click()
  const other = await context.newPage()
  try {
    await other.setViewportSize({ width: 1440, height: 900 })
    await other.goto('/tarification')
    const otherToggle = other.locator('button[aria-label="Changer le thème"]:visible')
    await expect(otherToggle).toHaveAttribute('title', 'Thème: Sombre')
    await expect(other.locator('html')).toHaveClass(/dark/)
    await toggle.click()
    await expect(otherToggle).toHaveAttribute('title', 'Thème: Système')
    await expect(other.locator('html')).not.toHaveClass(/dark/)
    await toggle.click()
    await expect(otherToggle).toHaveAttribute('title', 'Thème: Clair')
    await other.evaluate(() => localStorage.clear())
    await expect(toggle).toHaveAttribute('title', 'Thème: Système')
  } finally { await other.close() }
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Stockage indisponible') } })
  await toggle.click()
  await toggle.click()
  await expect(toggle).toHaveAttribute('title', 'Thème: Sombre')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('champs et textes secondaires lisibles dans les deux themes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/tarification')
  await page.getByRole('button', { name: 'Trouvez-moi un produit en Chine' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (const scheme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect.poll(() => page.evaluate(() => document.documentElement.style.colorScheme)).toBe(scheme)
    await expect(dialog.locator('textarea')).toHaveCSS('background-color', scheme === 'dark' ? 'rgb(31, 41, 55)' : 'rgb(255, 255, 255)')
    const metrics = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      const rgb = (color: string) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return Array.from(context.getImageData(0, 0, 1, 1).data)
      }
      const luminance = (color: number[]) => {
        const channels = color.slice(0, 3).map(value => {
          const normalized = value / 255
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
        })
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
      }
      const contrast = (foreground: number[], background: number[]) => {
        const fore = luminance(foreground)
        const back = luminance(background)
        return (Math.max(fore, back) + 0.05) / (Math.min(fore, back) + 0.05)
      }
      const fields = Array.from(document.querySelectorAll('dialog input:not([type="file"]), dialog textarea')).map(element => {
        const style = getComputedStyle(element)
        const background = rgb(style.backgroundColor)
        return {
          type: element.getAttribute('type') || 'textarea',
          background: background.slice(0, 3),
          text: contrast(rgb(style.color), background),
          placeholder: contrast(rgb(getComputedStyle(element, '::placeholder').color), background),
        }
      })
      const percentage = Array.from(document.querySelectorAll('p')).find(element => element.textContent?.includes('% du total'))!
      let ancestor: Element | null = percentage
      let background = [255, 255, 255, 255]
      while (ancestor) {
        const candidate = rgb(getComputedStyle(ancestor).backgroundColor)
        if (candidate[3] === 255) { background = candidate; break }
        ancestor = ancestor.parentElement
      }
      return { fields, percentage: contrast(rgb(getComputedStyle(percentage).color), background) }
    })
    expect(metrics.fields.length).toBeGreaterThanOrEqual(7)
    for (const field of metrics.fields) {
      expect(field.background, `${scheme}: ${field.type}`).toEqual(scheme === 'dark' ? [31, 41, 55] : [255, 255, 255])
      expect(field.text, `${scheme}: ${field.type}`).toBeGreaterThanOrEqual(4.5)
      expect(field.placeholder, `${scheme}: ${field.type}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(metrics.percentage).toBeGreaterThanOrEqual(4.5)
    console.log(`${scheme}: contraste minimum champs=${Math.min(...metrics.fields.map(field => field.placeholder)).toFixed(2)}, pourcentages=${metrics.percentage.toFixed(2)}`)
    await dialog.getByLabel('Téléphone pour recevoir la proposition par SMS').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`${scheme}-mobile.png`) })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({ path: testInfo.outputPath(`${scheme}-desktop.png`) })
    await page.setViewportSize({ width: 390, height: 844 })
  }
})