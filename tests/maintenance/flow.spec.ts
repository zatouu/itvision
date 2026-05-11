import { test, expect, Page, APIRequestContext } from '@playwright/test'
import { ensureTestUsers, createTestContract, cleanupTestData } from '../helpers/db'

/**
 * Tests E2E du flux complet maintenance.
 * Prérequis : les sessions auth ont été créées par tests/auth.setup.ts
 *
 * Mode distant (déploiement en ligne) : PLAYWRIGHT_BASE_URL=https://... npm run test:e2e
 */

const isRemote = !!process.env.PLAYWRIGHT_BASE_URL

let adminCtx: APIRequestContext
let clientCtx: APIRequestContext
let techCtx: APIRequestContext
let interventionId: string
let reportId: string

async function createInterventionViaApi(clientUserId: string): Promise<string> {
  const contractId = await createTestContract(clientUserId)
  const res = await clientCtx.post('/api/client-enterprise/interventions/request', {
    data: {
      title: 'E2E Intervention Test',
      description: 'Test E2E automatique du flux maintenance complet',
      typeIntervention: 'maintenance',
      priority: 'medium',
      preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    }
  })
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Failed to create intervention: ${res.status()} ${JSON.stringify(body)}`)
  }
  const json = await res.json() as any
  return json.intervention?._id || json.intervention?.id
}

async function autoAssignViaApi(interventionId: string): Promise<any> {
  const res = await adminCtx.post('/api/scheduling/auto-assign', {
    data: { interventionId, dryRun: false }
  })
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Auto-assign failed: ${res.status()} ${JSON.stringify(body)}`)
  }
  return res.json()
}

test.beforeAll(async ({ browser }) => {
  // Créer des contextes API authentifiés pour manipuler les données en arrière-plan
  const adminPage = await browser.newPage({ storageState: 'tests/.auth/admin.json' })
  adminCtx = adminPage.request

  const clientPage = await browser.newPage({ storageState: 'tests/.auth/client.json' })
  clientCtx = clientPage.request

  const techPage = await browser.newPage({ storageState: 'tests/.auth/tech.json' })
  techCtx = techPage.request

  // Cleanup désactivé — on conserve les données de test pour inspection
  // await cleanupTestData()
})

test.afterAll(async () => {
  // Cleanup désactivé temporairement pour inspection manuelle
  // await cleanupTestData()
  await adminCtx.dispose()
  await clientCtx.dispose()
  await techCtx.dispose()
})

// ======================= STEP 1 : CLIENT DEMANDE INTERVENTION =======================

test.describe('Step 1 — Client demande une intervention', () => {
  test('le client peut naviguer vers le portail et demander une intervention', async ({ page }) => {
    // Se connecter comme client (via storage state déjà injecté)
    await page.goto('/portail-entreprise')

    // Vérifier que le portail s'affiche
    await expect(page.locator('text=Portail Entreprise').or(page.locator('text=Tableau de bord'))).toBeVisible()

    // Naviguer vers les interventions
    await page.goto('/portail-entreprise/interventions')
    await expect(page.locator('text=Interventions')).toBeVisible()

    // Le bouton de demande doit être présent
    const requestBtn = page.locator('button:has-text("Demander"), button:has-text("Nouvelle"), a:has-text("Demander"), a:has-text("Nouvelle")').first()
    await expect(requestBtn).toBeVisible()
  })

  test('créer une intervention via API pour le reste du flux', async () => {
    test.skip(isRemote, 'Création de données via DB non disponible en mode distant')
    const users = await ensureTestUsers()
    interventionId = await createInterventionViaApi(users.client.userId)
    expect(interventionId).toBeTruthy()
    console.log('[E2E] Intervention created:', interventionId)
  })
})

// ======================= STEP 2 : ADMIN ASSIGNE TECHNICIEN =======================

test.describe('Step 2 — Admin assigne un technicien', () => {
  test('l\'admin voit l\'intervention dans le planning', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('text=Admin').or(page.locator('text=Dashboard'))).toBeVisible()

    // Naviguer vers le planning
    await page.goto('/admin/planning')

    // Vérifier que le planning s'affiche
    await expect(page.locator('text=Planning').or(page.locator('text=planning'))).toBeVisible()
  })

  test('auto-assign fonctionne via API', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const result = await autoAssignViaApi(interventionId)
    expect(result.success).toBe(true)
    expect(result.assignedTechnician).toBeTruthy()
    console.log('[E2E] Technician assigned:', result.assignedTechnician?.name)
  })
})

// ======================= STEP 3 : TECHNICIEN SOUMET RAPPORT =======================

test.describe('Step 3 — Technicien soumet un rapport', () => {
  test('le technicien voit l\'intervention assignée', async ({ page }) => {
    await page.goto('/tech-interface')
    await expect(page.locator('text=Technicien').or(page.locator('text=Tableau de bord'))).toBeVisible()
  })

  test('créer et soumettre un rapport via API', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    // Créer un rapport brouillon
    const res = await techCtx.post('/api/maintenance/reports', {
      data: {
        interventionId,
        site: 'Site E2E',
        interventionType: 'maintenance',
        priority: 'medium',
        initialObservations: 'Observations initiales pour le test E2E automatique. L\'équipement fonctionne correctement.',
        tasksPerformed: ['Vérification caméras', 'Test d\'accès', 'Nettoyage équipement'],
        results: 'Toutes les caméras sont opérationnelles. Le contrôle d\'accès répond correctement.',
        startTime: '09:00',
        endTime: '11:00',
        materialsUsed: [{ name: 'Câble RJ45', quantity: 2, unitPrice: 500 }]
      }
    })
    if (!res.ok()) {
      const body = await res.json().catch(() => ({}))
      throw new Error(`Failed to create report: ${res.status()} ${JSON.stringify(body)}`)
    }
    const json = await res.json() as any
    reportId = json.report?.id || json.report?._id
    expect(reportId).toBeTruthy()

    // Soumettre le rapport
    const submitRes = await techCtx.post('/api/maintenance/reports/submit', {
      data: { reportId }
    })
    expect(submitRes.ok()).toBe(true)
    console.log('[E2E] Report submitted:', reportId)
  })
})

// ======================= STEP 4 : ADMIN VALIDE + DEVIS =======================

test.describe('Step 4 — Admin valide le rapport et génère un devis', () => {
  test('l\'admin peut valider le rapport via API', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const res = await adminCtx.post(`/api/admin/reports/${reportId}/validate`, {
      data: { action: 'approved', comments: 'Rapport validé automatiquement par E2E' }
    })
    expect(res.ok()).toBe(true)
    const json = await res.json() as any
    expect(json.report.status).toBe('published')
    console.log('[E2E] Report validated')
  })

  test('génération automatique du devis depuis le rapport validé', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const res = await adminCtx.post(`/api/admin/reports/${reportId}/generate-quote`)
    expect(res.ok()).toBe(true)
    const json = await res.json() as any
    expect(json.quote).toBeTruthy()
    expect(json.quote.totalAmount).toBeGreaterThan(0)
    console.log('[E2E] Quote generated:', json.quote.totalAmount, 'FCFA')
  })

  test('le snapshot du contrat est consultable', async () => {
    test.skip(isRemote, 'Création de données via DB non disponible en mode distant')
    // On crée un snapshot manuellement pour tester l'API
    const users = await ensureTestUsers()
    const contractId = await createTestContract(users.client.userId)
    const res = await adminCtx.post(`/api/admin/reports/${contractId}/snapshot`, {
      data: { reason: 'Snapshot E2E test' }
    })
    expect(res.ok()).toBe(true)
    const json = await res.json() as any
    expect(json.snapshot).toBeTruthy()
    console.log('[E2E] Contract snapshot created')
  })

  test('l\'audit trail enregistre les événements', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const res = await adminCtx.get('/api/admin/audit?entityType=Intervention&limit=10')
    expect(res.ok()).toBe(true)
    const json = await res.json() as any
    expect(json.logs).toBeInstanceOf(Array)
    const interventionLogs = json.logs.filter((l: any) => String(l.entityId) === interventionId)
    expect(interventionLogs.length).toBeGreaterThan(0)
    console.log('[E2E] Audit logs found:', interventionLogs.length)
  })
})

// ======================= STEP 5 : CLIENT FEEDBACK =======================

test.describe('Step 5 — Client laisse un feedback', () => {
  test('le client voit l\'intervention terminée dans le portail', async ({ page }) => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    await page.goto('/portail-entreprise/interventions')

    // Attendre que la page charge les interventions
    await page.waitForLoadState('networkidle')

    // Vérifier que l'intervention E2E est listée
    const interventionCard = page.locator('text=E2E Intervention Test')
    await expect(interventionCard.first()).toBeVisible()
  })

  test('le client peut soumettre un feedback via API', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const res = await clientCtx.post(`/api/client-enterprise/interventions/${interventionId}/feedback`, {
      data: {
        rating: 5,
        comment: 'Excellent service, intervention rapide et professionnelle. Test E2E.'
      }
    })
    expect(res.ok()).toBe(true)
    console.log('[E2E] Client feedback submitted')
  })

  test('le client peut signer l\'accusé de réception via API', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    const res = await clientCtx.post(`/api/client-enterprise/interventions/${interventionId}/acknowledge`, {
      data: {
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        name: 'E2E Client',
        title: 'Directeur'
      }
    })
    expect(res.ok()).toBe(true)
    console.log('[E2E] Client acknowledgement signed')
  })
})

// ======================= RÉCAPITULATIF =======================

test.describe('Recap — Flux complet', () => {
  test('vérifie que l\'intervention a parcouru tout le workflow', async () => {
    test.skip(isRemote, 'Données pré-existantes requises en mode distant')
    // Le GET /api/interventions retourne une liste filtrable par status
    const res = await adminCtx.get(`/api/interventions?status=completed&limit=200`)
    expect(res.ok()).toBe(true)
    const json = await res.json() as any
    const interventions = json.interventions || []
    const intervention = interventions.find((i: any) => String(i._id) === interventionId)
    expect(intervention).toBeTruthy()
    const validStatuses = ['completed', 'in_progress']
    expect(validStatuses).toContain(intervention.status)
    expect(intervention.assignedTechnician || intervention.technicienId).toBeTruthy()
    console.log('[E2E] Full flow completed. Final status:', intervention.status)
  })
})
