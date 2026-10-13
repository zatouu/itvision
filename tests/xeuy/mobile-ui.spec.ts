import { test, expect, BrowserContext, Page } from '@playwright/test'

test.use({
  baseURL: process.env.XEUY_UI_BASE_URL,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  video: 'off',
  colorScheme: 'light',
})
test.skip(!process.env.XEUY_UI_BASE_URL, 'Necessite le serveur Expo Web local')

const user = {
  _id: '000000000000000000000001', name: 'Awa Diop', phone: '+221771234567',
  role: 'CLIENT', providerProfileId: '000000000000000000000002', kycVerified: true,
}

async function prepare(context: BrowserContext, mode?: 'client' | 'provider') {
  await context.addInitScript(({ account, mode }) => {
    if (mode) {
      localStorage.setItem('authToken', 'xeuy-ui-test-only')
      localStorage.setItem('authUser', JSON.stringify(account))
      localStorage.setItem('xeuy:mode', mode)
    }
    localStorage.setItem('app:lang', 'fr')
  }, { account: user, mode })
  await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname
    let body: object = { items: [], notifications: [], conversations: [], total: 0, unreadCount: 0 }
    if (pathname === '/api/users/me') body = { user }
    if (pathname === '/api/wallet') body = {
      points: 0, reservedPoints: 0, cashBalance: 0, lifetimePointsEarned: 0, lifetimePointsSpent: 0,
      config: { mode: 'free', pointsActive: false, pointsPerWonMission: 0, fcfaPerPoint: 100, freeUntil: null },
      history: [],
    }
    if (pathname === '/api/provider/profile') body = {
      user,
      provider: { serviceCategories: [], preferences: {}, zone: { city: 'Dakar', radiusKm: 10 }, scoreXeuy: 80 },
      reviews: { average: 4.8, count: 12 },
    }
    if (pathname.includes('categories')) body = { items: [], categories: [] }
    if (pathname.includes('referral')) body = { referralCode: '', referralBalance: 0, referralCount: 0 }
    if (pathname.includes('flags')) body = { flags: { escrow: false } }
    await route.fulfill({ json: body })
  })
  await context.route('**/socket.io/**', route => route.abort())
}

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="button"], [role="tab"], input')]
    .filter(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.width > 0 && bounds.height > 0 && (bounds.left < -1 || bounds.right > innerWidth + 1)
    }).map(element => element.getAttribute('aria-label') || element.textContent?.slice(0, 60)))
  expect(overflow).toEqual([])
}

for (const mode of ['client', 'provider'] as const) {
  for (const escrow of [false, true]) {
    test(`portefeuille ${mode} : credits distincts du cash, sequestre ${escrow}`, async ({ page, context }, testInfo) => {
      await prepare(context, mode)
      await page.setViewportSize({ width: 320, height: 844 })
      await page.emulateMedia({ colorScheme: escrow ? 'light' : 'dark' })
      await context.route('**/api/services/app-config', route => route.fulfill({ json: {
        onlinePayments: escrow, escrow, creditsUnlock: false,
      } }))
      await context.route('**/api/wallet', route => route.fulfill({ json: {
        points: 250, reservedPoints: 25, cashBalance: 1234567, escrow: 5000,
        lifetimePointsEarned: 300, lifetimePointsSpent: 50, history: [],
        config: { mode: 'points', pointsActive: true, fcfaPerPoint: 100 },
      } }))
      await page.goto(mode === 'provider' ? '/pro-wallet' : '/wallet')
      await expect(page.getByText('Crédits Xeuy (XC)', { exact: true })).toBeVisible()
      await expect(page.getByText("Les crédits Xeuy ne sont pas de l'argent retirable.", { exact: true })).toBeVisible()
      await expect(page.getByTestId('wallet-cash-balance')).toHaveText(/1\s234\s567\sFCFA/)
      expect(await page.getByTestId('wallet-cash-balance').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
      await expect(page.getByText('25 XC réservés pour des missions', { exact: true })).toBeVisible()
      await expect(page.getByText(/Les paiements en espèces remis directement/)).toBeVisible()
      await expect(page.getByText(/1 XC =|≈/)).toHaveCount(0)
      if (mode === 'provider') {
        await expect(page.getByText(/En séquestre/)).toHaveCount(escrow ? 1 : 0)
        await expect(page.getByText('Utilisés pour débloquer les missions', { exact: true })).toHaveCount(0)
        await expect(page.getByText('Retrait soumis à validation', { exact: true })).toBeVisible()
        await expect(page.getByText(/sous 24 h/)).toHaveCount(0)
      }
      await noOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`wallet-${mode}-${escrow}-320.png`), fullPage: true })
      await page.setViewportSize({ width: 1280, height: 900 })
      await noOverflow(page)
    })
  }

  test(`portefeuille ${mode} : echec sans faux solde et reprise`, async ({ page, context }) => {
    await prepare(context, mode)
    let unavailable = true
    await context.route('**/api/wallet', route => unavailable
      ? route.fulfill({ status: 403, json: { error: 'Indisponible pour ce test' } })
      : route.fulfill({ json: {
        points: 0, reservedPoints: 0, cashBalance: 7000, history: [],
        lifetimePointsEarned: 0, lifetimePointsSpent: 0,
        config: { mode: 'free', pointsActive: false, fcfaPerPoint: 100 },
      } }))
    await page.goto(mode === 'provider' ? '/pro-wallet' : '/wallet')
    await expect(page.getByText('Solde indisponible. Réessayez pour consulter votre portefeuille.')).toBeVisible()
    await expect(page.getByTestId('wallet-cash-balance')).toHaveCount(0)
    await expect(page.getByText('Crédits Xeuy (XC)', { exact: true })).toHaveCount(0)
    unavailable = false
    await page.getByRole('button', { name: /Réessayer/i, exact: true }).click()
    await expect(page.getByTestId('wallet-cash-balance')).toHaveText(/7\s000\sFCFA/)
  })
}

async function fillFirstRequest(page: Page, context: BrowserContext) {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 14.7167, longitude: -17.4677 })
  await page.goto('/create-request')
  await page.getByRole('button', { name: 'Plomberie', exact: true }).click()
  await page.getByRole('button', { name: 'Continuer · Plomberie', exact: true }).click()
  await page.getByRole('textbox', { name: 'Budget indicatif (FCFA)' }).fill('10000')
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('Fuite sous le lavabo de la cuisine')
  await page.getByRole('button', { name: 'Continuer · Adresse', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Publier la demande', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Ma position', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Publier la demande', exact: true })).toBeEnabled()
}

for (const queued of [false, true]) {
  test(`premiere demande : ${queued ? 'attente reseau sans fausse publication' : 'publication et suivi'}`, async ({ page, context }, testInfo) => {
    await prepare(context, 'client')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark' })
    const requestId = '000000000000000000000101'
    const submissions: Record<string, any>[] = []
    await context.route('**/api/services/requests', async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      submissions.push(route.request().postDataJSON())
      if (queued) await route.abort('internetdisconnected')
      else await route.fulfill({ json: { item: { _id: requestId } } })
    })
    await context.route(`**/api/services/requests/${requestId}/offers`, route => route.fulfill({ json: {
      request: { _id: requestId, category: 'plomberie', description: 'Fuite sous le lavabo de la cuisine', budget: 10000, status: 'open', createdAt: new Date().toISOString() },
      offers: [],
    } }))
    await fillFirstRequest(page, context)
    await page.getByRole('button', { name: 'Publier la demande', exact: true }).click()
    await expect(page.getByText(queued ? 'Envoi en attente' : 'Votre demande a été publiée !', { exact: true })).toBeVisible()
    if (!queued) expect(submissions).toHaveLength(1)
    expect(new Set(submissions.map(submission => submission.clientOpId)).size).toBe(1)
    expect(submissions[0]).toMatchObject({ category: 'plomberie', budget: 10000, location: { coordinates: [-17.4677, 14.7167] } })
    expect(submissions[0].clientOpId).toBeTruthy()
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`first-request-${queued ? 'queued' : 'published'}.png`) })
    if (queued) {
      await expect(page.getByText('Votre demande a été publiée !', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Voir les offres reçues' })).toHaveCount(0)
      await page.getByRole('button', { name: 'Voir mes demandes', exact: true }).click()
      await expect(page).toHaveURL(/\/my-requests$/)
    } else {
      await page.getByRole('button', { name: 'Voir les offres reçues', exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/offers/${requestId}$`))
    }
  })
}

test('premiere demande : le brouillon conserve ses precisions', async ({ page, context }) => {
  await prepare(context, 'client')
  await context.addInitScript(() => {
    localStorage.setItem('request:draft:v1', JSON.stringify({
      category: 'plomberie', subcategory: 'robinet', description: 'Fuite du robinet', budget: '10000',
      attributes: { material: 'Cuivre' }, landmark: 'Mermoz', step: 2, savedAt: Date.now(),
    }))
  })
  await context.route('**/api/services/categories', route => route.fulfill({ json: { categories: [{
    slug: 'plomberie', label_fr: 'Plomberie', abbr: 'PL', color: '#0369A1', order: 1,
    subCategories: [{ slug: 'robinet', label_fr: 'Robinet' }],
    requiredAttributes: [{ slug: 'material', type: 'text', label_fr: 'Materiau', required: true }],
  }] } }))
  await page.goto('/create-request')
  await expect(page.getByRole('textbox', { name: 'Description', exact: true })).toHaveValue('Fuite du robinet')
  await expect(page.getByText('Robinet', { exact: true })).toBeVisible()
  await expect(page.getByText('Materiau', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuer · Adresse', exact: true })).toBeEnabled()
})

for (const outcome of ['sent', 'queued', 'closed'] as const) {
  test(`premiere offre prestataire : ${outcome}`, async ({ page, context }, testInfo) => {
    await prepare(context, 'provider')
    await page.setViewportSize({ width: 320, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark' })
    const requestId = '000000000000000000000102'
    const submissions: Record<string, any>[] = []
    await context.route(`**/api/services/requests/${requestId}`, route => route.fulfill({ json: { item: {
      _id: requestId, category: 'plomberie', description: 'Robinet de cuisine a remplacer', budget: 10000,
      status: outcome === 'closed' ? 'cancelled' : 'broadcasted', location: { address: 'Mermoz, Dakar' },
    } } }))
    await context.route('**/api/services/offers', async route => {
      if (route.request().method() !== 'POST') return route.fallback()
      submissions.push(route.request().postDataJSON())
      if (outcome === 'queued') await route.abort('internetdisconnected')
      else await route.fulfill({ json: { item: { _id: '000000000000000000000202', status: 'submitted' } } })
    })
    await page.goto(`/offer/create?requestId=${requestId}`)
    const send = page.getByRole('button', { name: /Envoyer.*offre/ })
    if (outcome === 'closed') {
      await expect(page.getByText("Cette demande n'est plus ouverte aux offres.")).toBeVisible()
      await expect(send).toBeDisabled()
      expect(submissions).toHaveLength(0)
      return
    }
    const price = page.getByRole('textbox').first()
    await expect(price).toHaveValue('10000')
    await price.fill('0')
    await expect(send).toBeDisabled()
    await price.fill('50000001')
    await expect(send).toBeDisabled()
    await price.fill('8500')
    const available = page.getByRole('switch', { name: /Disponible/i })
    await available.uncheck()
    await expect(send).toBeDisabled()
    await available.check()
    await expect(send).toBeEnabled()
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('offer-form-dark-320.png') })
    await send.click()
    await expect(page.getByText(outcome === 'queued' ? 'Envoi en attente' : 'Offre envoyée', { exact: true })).toBeVisible()
    if (outcome === 'sent') {
      expect(submissions).toHaveLength(1)
      await expect(page.getByText(/Attendez son acceptation avant de vous déplacer/)).toBeVisible()
    } else {
      await expect(page.getByText('Offre envoyée', { exact: true })).toHaveCount(0)
    }
    expect(submissions[0]).toMatchObject({ requestId, price: 8500, availableNow: true, validityMinutes: 30 })
    await page.getByRole('button', { name: 'Mes offres', exact: true }).click()
    await expect(page).toHaveURL(/\/my-offers$/)
  })
}

for (const rejected of [false, true]) {
  test(`incident mission : annulation ${rejected ? 'refusee' : 'confirmee'}`, async ({ page, context }) => {
    await prepare(context, 'client')
    await page.setViewportSize({ width: 390, height: 844 })
    const requestId = '000000000000000000000103'
    let status = 'assigned'
    const mutations: unknown[] = []
    await context.route(`**/api/services/requests/${requestId}`, async route => {
      if (route.request().method() === 'PATCH') {
        mutations.push(route.request().postDataJSON())
        if (rejected) return route.fulfill({ status: 409, json: { error: 'La mission a deja commence' } })
        status = 'cancelled'
      }
      await route.fulfill({ json: { item: {
        _id: requestId, status, category: 'plomberie', budget: 10000,
        description: 'Fuite a reparer', acceptedOffer: { price: 8500, providerName: 'Moussa', providerId: '000000000000000000000003', etaMinutes: 30 },
      } } })
    })
    await page.goto(`/mission/${requestId}`)
    const cancel = page.getByRole('button', { name: 'Annuler la mission', exact: true })
    page.once('dialog', dialog => dialog.dismiss())
    await cancel.click()
    expect(mutations).toHaveLength(0)
    page.once('dialog', dialog => dialog.accept())
    await cancel.click()
    await expect.poll(() => mutations.length).toBe(1)
    expect(mutations[0]).toEqual({ status: 'cancelled' })
    if (rejected) {
      await expect(cancel).toBeEnabled()
      await expect(page.getByText('Mission annulée', { exact: true })).toHaveCount(0)
    } else {
      await expect(page.getByText('Mission annulée', { exact: true }).first()).toBeVisible()
      await expect(cancel).toHaveCount(0)
    }
  })
}

test('incident mission : retard, suivi du litige et reponse preservee', async ({ page, context }, testInfo) => {
  await prepare(context, 'client')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ colorScheme: 'dark' })
  const requestId = '000000000000000000000104'
  let rejectReply = true
  let request: Record<string, any> = {
    _id: requestId, status: 'on_the_way', category: 'plomberie', budget: 10000,
    acceptedOffer: { price: 8500, providerName: 'Moussa', providerId: '000000000000000000000003', etaMinutes: 30 },
  }
  const mutations: Record<string, any>[] = []
  await context.route(`**/api/services/requests/${requestId}`, async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON()
      mutations.push(body)
      if (body.action === 'dispute') request = {
        ...request, status: 'dispute', disputeStatus: 'open', disputeReason: body.reason,
        disputeMessages: [{ _id: 'provider-message', senderRole: 'provider', text: 'Je confirme mon retard.', createdAt: new Date().toISOString() }],
      }
      if (body.action === 'dispute-message') {
        if (rejectReply) return route.fulfill({ status: 503, json: { error: 'Service temporairement indisponible' } })
        request.disputeMessages = [{ _id: 'message-test', senderRole: 'client', text: body.text, createdAt: new Date().toISOString() }]
      }
    }
    await route.fulfill({ json: { item: request } })
  })
  await page.goto(`/mission/${requestId}`)
  await page.getByRole('button', { name: 'Signaler un problème', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/dispute\\?requestId=${requestId}$`))
  await page.getByRole('button', { name: 'Retard du prestataire', exact: true }).click()
  await page.getByRole('textbox', { name: 'Décrivez le problème' }).fill('Le prestataire a depasse le delai convenu.')
  await page.getByRole('button', { name: 'Envoyer ma réclamation', exact: true }).click()
  const reply = page.getByRole('textbox', { name: 'Répondre au support…', exact: true })
  await expect(reply).toBeVisible()
  await expect(page.getByText('Je confirme mon retard.', { exact: true })).toBeVisible()
  await expect(page.getByText('Prestataire', { exact: true })).toBeVisible()
  await expect(page.getByText('Support Xeuy', { exact: true })).toHaveCount(0)
  expect(mutations[0].action).toBe('dispute')
  expect(mutations[0].reason).toContain('Retard du prestataire')
  await reply.fill('Je reste disponible pour expliquer les faits.')
  const sendReply = page.getByRole('button', { name: 'Envoyer la réponse', exact: true })
  await sendReply.click()
  await expect.poll(() => mutations.filter(body => body.action === 'dispute-message').length).toBe(1)
  await expect(sendReply).toBeEnabled()
  await expect(reply).toHaveValue('Je reste disponible pour expliquer les faits.')
  rejectReply = false
  await sendReply.click()
  await expect(reply).toHaveValue('')
  await expect(page.getByText('Je reste disponible pour expliquer les faits.', { exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: testInfo.outputPath('dispute-followup-dark.png') })
  request = { ...request, status: 'completed', disputeStatus: 'resolved', disputeDecision: 'reject', disputeAdminNote: 'Dossier examine : decision communiquee aux deux parties.' }
  await page.reload()
  await expect(page.getByText(request.disputeAdminNote, { exact: true })).toBeVisible()
  await expect(sendReply).toHaveCount(0)
  await page.getByRole('button', { name: 'Fermer', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/mission/${requestId}$`))
})

test('connexion responsive et champs lisibles dans les deux themes', async ({ page, context }, testInfo) => {
  await prepare(context)
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 })
      await page.goto('/login')
      const phone = page.getByRole('textbox', { name: 'Votre numéro de téléphone' })
      await expect(phone).toHaveCSS('background-color', scheme === 'dark' ? 'rgb(27, 32, 38)' : 'rgb(255, 255, 255)')
      await expect(phone).toHaveCSS('color', scheme === 'dark' ? 'rgb(242, 245, 247)' : 'rgb(15, 23, 42)')
      await noOverflow(page)
      await page.screenshot({ path: testInfo.outputPath(`login-${scheme}-${width}.png`) })
    }
  }
})

test('le systeme change les styles sans effacer le formulaire', async ({ page, context }) => {
  await prepare(context)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login')
  const phone = page.getByRole('textbox', { name: 'Votre numéro de téléphone' })
  await phone.fill('771234567')
  await page.getByRole('checkbox').check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(phone).toHaveCSS('background-color', 'rgb(27, 32, 38)')
  await expect(phone).toHaveValue('771234567')
  await expect(page.getByRole('checkbox')).toBeChecked()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(phone).toHaveCSS('background-color', 'rgb(255, 255, 255)')
})

for (const mode of ['client', 'provider'] as const) {
  test(`apparence ${mode}, persistance et navigation coherente`, async ({ page, context }, testInfo) => {
    await prepare(context, mode)
    await page.setViewportSize({ width: 390, height: 844 })
    const route = mode === 'client' ? '/profile' : '/pro-profile'
    await page.goto(route)
    const dark = page.getByRole('tab', { name: 'Sombre', exact: true })
    await dark.click()
    await expect(dark).toHaveAttribute('aria-selected', 'true')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('app:theme'))).toBe('dark')
    const dimensions = await dark.boundingBox()
    expect(dimensions?.height).toBeGreaterThanOrEqual(44)
    await expect(page.getByText('Clair', { exact: true })).toHaveCSS('color', 'rgb(182, 194, 207)')
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(dark).toHaveAttribute('aria-selected', 'true')
    await noOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`appearance-${mode}-dark.png`) })
    await page.reload()
    await expect(dark).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Clair', exact: true }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('app:theme'))).toBe('light')
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.getByRole('tab', { name: 'Clair', exact: true })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Système', exact: true }).click()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('app:theme'))).toBe('system')
    await expect(page).toHaveURL(new RegExp(`${route}$`))
  })
}

test('le choix de theme conserve le nom en cours de modification', async ({ page, context }) => {
  await prepare(context, 'client')
  await page.goto('/profile')
  await expect(page.getByText('Awa Diop', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /nom/i }).click()
  const name = page.getByRole('textbox')
  await name.fill('Brouillon Xeuy')
  await page.getByRole('tab', { name: 'Sombre', exact: true }).click()
  await expect(name).toHaveValue('Brouillon Xeuy')
  await expect(name).toHaveCSS('background-color', 'rgb(27, 32, 38)')
})

test('une sauvegarde refusee est signalee sans bloquer le changement', async ({ page, context }) => {
  await prepare(context, 'client')
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function(key: string, value: string) {
      if (key === 'app:theme') throw new Error('storage unavailable')
      return original.call(this, key, value)
    }
  })
  await page.goto('/profile')
  await page.getByRole('tab', { name: 'Sombre', exact: true }).click()
  await expect(page.getByText('Préférence non enregistrée. Réessayez.')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Sombre', exact: true })).toHaveAttribute('aria-selected', 'true')
})

for (const mode of ['client', 'provider'] as const) {
  test(`ecrans principaux ${mode} sans debordement ni erreur React`, async ({ page, context }, testInfo) => {
    test.setTimeout(120000)
    await prepare(context, mode)
    await page.setViewportSize({ width: 320, height: 844 })
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const paths = mode === 'client'
      ? ['/', '/my-requests', '/messages', '/wallet', '/create-request']
      : ['/pro-home', '/nearby-requests', '/my-offers', '/pro-wallet']
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      for (const pathname of paths) {
        await page.goto(pathname, { waitUntil: 'domcontentloaded' })
        await expect(page.getByRole('button').or(page.getByRole('tab')).first()).toBeVisible()
        await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toHaveCount(0)
        await noOverflow(page)
        await page.screenshot({ path: testInfo.outputPath(`${scheme}-${pathname.replaceAll('/', '-') || 'home'}.png`) })
      }
    }
    expect(errors).toEqual([])
  })
}