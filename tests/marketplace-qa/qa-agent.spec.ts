/**
 * Agent recetteur QA — Marketplace (sourcing / vente / achats groupés).
 *
 * Cet agent se comporte comme un recetteur senior : il parcourt seul toutes
 * les routes publiques du marketplace, exerce les parcours clés et collecte
 * les anomalies (erreurs console/JS, HTTP, images/liens cassés, coquilles,
 * problèmes d'accessibilité et de flow), puis produit un rapport structuré.
 *
 * Cible : le marketplace est servi sur le sous-domaine `market.*`.
 *   QA_BASE_URL par défaut = http://market.localhost:3000
 *   (les navigateurs résolvent *.localhost vers 127.0.0.1)
 *
 * Lancer :
 *   npm run test:qa
 *   QA_BASE_URL=https://market.itvisionplus.sn npm run test:qa
 *   QA_STRICT=1 npm run test:qa   # échoue si anomalie critique
 */
import { test, expect } from '@playwright/test'
import { QaCollector, auditPage, writeReport } from './qa-utils'

const BASE_URL = process.env.QA_BASE_URL || 'http://market.localhost:3000'
const STRICT = process.env.QA_STRICT === '1'

// Routes publiques du marketplace à parcourir.
const ROUTES: { path: string; label: string }[] = [
  { path: '/', label: 'Accueil marketplace' },
  { path: '/produits', label: 'Catalogue produits' },
  { path: '/achats-groupes', label: 'Liste achats groupés' },
  { path: '/achats-groupes/nouveau', label: 'Créer un achat groupé' },
  { path: '/panier', label: 'Panier' },
  { path: '/retrouver-ma-commande', label: 'Retrouver ma commande' },
  { path: '/login', label: 'Connexion' },
  { path: '/register', label: 'Inscription' },
]

const collector = new QaCollector()

test.describe.configure({ mode: 'serial' })

test.describe('Agent recetteur — Marketplace', () => {
  test.afterAll(async () => {
    const { summary } = writeReport(collector, BASE_URL)
    if (STRICT) {
      expect(summary.critical, 'Anomalies critiques détectées (mode strict)').toBe(0)
    }
  })

  // ─── 1. Audit page par page de toutes les routes ───
  for (const route of ROUTES) {
    test(`Audit: ${route.label} (${route.path})`, async ({ page }) => {
      const ctx = collector.attach(page)
      ctx.route = route.path

      const resp = await page.goto(BASE_URL + route.path, {
        waitUntil: 'networkidle',
        timeout: 45_000,
      }).catch((err) => {
        collector.add({
          severity: 'critical',
          category: 'flow',
          route: route.path,
          message: 'Échec de chargement de la page',
          detail: String(err?.message || err).slice(0, 300),
        })
        return null
      })

      if (resp && resp.status() >= 400) {
        collector.add({
          severity: resp.status() >= 500 ? 'critical' : 'high',
          category: 'http',
          route: route.path,
          message: `Page renvoie HTTP ${resp.status()}`,
        })
      }

      // Laisse le temps aux fetchs clients (catalogue, groupes) de répondre.
      await page.waitForTimeout(1500)
      await auditPage(page, route.path, collector)
    })
  }

  // ─── 2. Parcours : ouverture de la modale de sourcing ───
  test('Flow: sourcing à la demande (ouverture modale)', async ({ page }) => {
    const ctx = collector.attach(page)
    ctx.route = '/ (sourcing)'
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1000)

    const trigger = page
      .getByRole('button', { name: /trouvez-moi|on le trouve|sourcing|trouver ce produit/i })
      .first()

    if ((await trigger.count()) === 0) {
      collector.add({
        severity: 'medium',
        category: 'flow',
        route: '/ (sourcing)',
        message: 'Aucun déclencheur de sourcing trouvé sur la home',
      })
      return
    }

    await trigger.click().catch(() => {})
    await page.waitForTimeout(800)

    // Une modale (dialog) ou des champs de contact doivent apparaître.
    const dialogVisible =
      (await page.locator('[role="dialog"], .modal, [aria-modal="true"]').count()) > 0
    if (!dialogVisible) {
      collector.add({
        severity: 'high',
        category: 'flow',
        route: '/ (sourcing)',
        message: 'La modale de sourcing ne s’ouvre pas après clic',
      })
    }
    await auditPage(page, '/ (sourcing modale)', collector)
  })

  // ─── 3. Parcours : catalogue → fiche produit → panier ───
  test('Flow: catalogue → fiche produit → ajout panier', async ({ page }) => {
    const ctx = collector.attach(page)
    ctx.route = '/produits (flow)'
    await page.goto(BASE_URL + '/produits', { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1800)

    // Récupère les liens vers les fiches produit.
    const productHref = await page.evaluate(() => {
      const a = Array.from(document.querySelectorAll('a[href*="/produits/"]')) as HTMLAnchorElement[]
      const found = a.find((el) => /\/produits\/[^/]+/.test(el.getAttribute('href') || ''))
      return found ? found.getAttribute('href') : null
    })

    if (!productHref) {
      collector.add({
        severity: 'high',
        category: 'flow',
        route: '/produits (flow)',
        message: 'Aucune fiche produit accessible depuis le catalogue',
      })
      return
    }

    const url = productHref.startsWith('http') ? productHref : BASE_URL + productHref
    ctx.route = productHref
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1200)
    await auditPage(page, productHref, collector)

    // Tente l'ajout au panier.
    const addBtn = page
      .getByRole('button', { name: /ajouter au panier|acheter maintenant/i })
      .first()
    if ((await addBtn.count()) === 0) {
      collector.add({
        severity: 'high',
        category: 'flow',
        route: productHref,
        message: 'Aucun bouton "Ajouter au panier" sur la fiche produit',
      })
    } else {
      await addBtn.click().catch(() => {})
      await page.waitForTimeout(1000)
    }
  })

  // ─── 4. Parcours : panier → checkout (navigation) ───
  test('Flow: panier → checkout', async ({ page }) => {
    const ctx = collector.attach(page)
    ctx.route = '/panier (flow)'
    await page.goto(BASE_URL + '/panier', { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1200)
    await auditPage(page, '/panier (flow)', collector)

    const checkoutBtn = page
      .getByRole('button', { name: /commander|passer|paiement|checkout|valider/i })
      .first()
    // Sur panier vide le bouton peut être absent : on ne lève pas d'erreur dure.
    if ((await checkoutBtn.count()) > 0) {
      await checkoutBtn.click().catch(() => {})
      await page.waitForTimeout(1200)
    }
  })

  // ─── 5. Parcours : liste achats groupés → détail groupe ───
  test('Flow: achats groupés → détail groupe', async ({ page }) => {
    const ctx = collector.attach(page)
    ctx.route = '/achats-groupes (flow)'
    await page.goto(BASE_URL + '/achats-groupes', { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1800)

    const groupHref = await page.evaluate(() => {
      const a = Array.from(
        document.querySelectorAll('a[href*="/achats-groupes/"]')
      ) as HTMLAnchorElement[]
      const found = a.find((el) => {
        const h = el.getAttribute('href') || ''
        return /\/achats-groupes\/[^/]+/.test(h) && !h.endsWith('/nouveau')
      })
      return found ? found.getAttribute('href') : null
    })

    if (!groupHref) {
      collector.add({
        severity: 'medium',
        category: 'flow',
        route: '/achats-groupes (flow)',
        message: 'Aucun groupe d’achat cliquable (catalogue vide ou liens absents)',
      })
      return
    }

    const url = groupHref.startsWith('http') ? groupHref : BASE_URL + groupHref
    ctx.route = groupHref
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 })
    await page.waitForTimeout(1200)
    await auditPage(page, groupHref, collector)

    const joinBtn = page.getByRole('button', { name: /rejoindre|participer/i }).first()
    if ((await joinBtn.count()) === 0) {
      collector.add({
        severity: 'medium',
        category: 'flow',
        route: groupHref,
        message: 'Aucun bouton "Rejoindre" sur la fiche groupe',
      })
    }
  })
})
