import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import {
  ensureTestUsers,
  ensureCompanyMember,
  setCompanyPermissions,
  getTestCompanyId,
  cleanupTestData,
} from '../helpers/db'

/**
 * Garde-fous du portail entreprise (P0 gouvernance) :
 * - companyRole : un `viewer` ne peut pas engager l'entreprise (devis, intervention, ticket)
 * - champs société réservés owner/admin (le profil personnel reste éditable)
 * - interrupteurs admin Client.permissions (canAccessPortal) qui coupent l'API
 *
 * Vérifie la règle unique `companyCapabilities()` (domain-access.ts) appliquée
 * côté API par requireCompanyCapability().
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

let ownerCtx: APIRequestContext
let viewerCtx: APIRequestContext
let companyId: string

async function loginCtx(email: string, password: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL })
  const res = await ctx.post('/api/auth/login', { data: { email, password } })
  expect(res.ok(), `login ${email}: ${res.status()}`).toBeTruthy()
  return ctx
}

test.beforeAll(async () => {
  await ensureTestUsers()
  companyId = await getTestCompanyId()
  const owner = await ensureCompanyMember({ email: 'e2e-member-owner@itvision.sn', name: 'E2E Owner', companyRole: 'owner' })
  const viewer = await ensureCompanyMember({ email: 'e2e-member-viewer@itvision.sn', name: 'E2E Viewer', companyRole: 'viewer' })
  ownerCtx = await loginCtx(owner.email, owner.password)
  viewerCtx = await loginCtx(viewer.email, viewer.password)
})

test.afterAll(async () => {
  await setCompanyPermissions({ canAccessPortal: true, canViewReports: true, canRequestMaintenance: true })
  await cleanupTestData()
  await ownerCtx?.dispose()
  await viewerCtx?.dispose()
})

test.describe('Capacités entreprise — lecture seule', () => {
  test('le viewer lit les documents mais ne crée pas de ticket', async () => {
    const read = await viewerCtx.get('/api/client-enterprise/documents')
    expect(read.status()).toBe(200)

    const write = await viewerCtx.post('/api/client-enterprise/tickets', {
      data: { title: 'E2E ticket viewer', category: 'incident', priority: 'low' },
    })
    expect(write.status()).toBe(403)
  })

  test('le viewer ne peut pas demander une intervention', async () => {
    const res = await viewerCtx.post('/api/client-enterprise/interventions/request', {
      data: {
        title: 'E2E intervention viewer',
        description: 'Tentative de demande par un rôle lecture seule',
        typeIntervention: 'maintenance',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('le viewer ne peut pas engager l’entreprise sur un devis', async () => {
    // Devis inexistant : la garde de capacité doit répondre avant le 404
    const res = await viewerCtx.post('/api/client-enterprise/quotes/000000000000000000000000/action', {
      data: { action: 'accepted' },
    })
    expect(res.status()).toBe(403)
  })

  test('le viewer ne peut pas éditer la fiche société mais garde son profil', async () => {
    const company = await viewerCtx.put('/api/client-enterprise/me', {
      data: { companyName: 'E2E Company piratée' },
    })
    expect(company.status()).toBe(403)

    const personal = await viewerCtx.put('/api/client-enterprise/me', {
      data: { userName: 'E2E Viewer Renommé' },
    })
    expect(personal.status()).toBe(200)
  })
})

test.describe('Capacités entreprise — propriétaire', () => {
  test('l’owner crée un ticket partagé avec la société', async () => {
    const res = await ownerCtx.post('/api/client-enterprise/tickets', {
      data: { title: 'E2E ticket owner', category: 'incident', priority: 'low' },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(String(body.ticket.clientCompanyId)).toBe(companyId)

    // Le ticket est bien visible par un autre membre de la société (scoping entreprise)
    const list = await viewerCtx.get('/api/client-enterprise/tickets')
    expect(list.status()).toBe(200)
    const { tickets } = await list.json()
    expect(tickets.some((t: any) => t.title === 'E2E ticket owner')).toBeTruthy()
  })
})

test.describe('Interrupteurs admin (Client.permissions)', () => {
  test('canAccessPortal=false coupe l’API corporate', async () => {
    await setCompanyPermissions({ canAccessPortal: false, canViewReports: true, canRequestMaintenance: true })

    const res = await ownerCtx.get('/api/client-enterprise/documents')
    expect(res.status()).toBe(403)

    await setCompanyPermissions({ canAccessPortal: true, canViewReports: true, canRequestMaintenance: true })
    const restored = await ownerCtx.get('/api/client-enterprise/documents')
    expect(restored.status()).toBe(200)
  })
})
