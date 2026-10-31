import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import {
  ensureTestUsers,
  ensureCompanyMember,
  getTestCompanyId,
  countCompanySourcingRequests,
  countAgentJobsFor,
  cleanupCompanySourcingRequests,
} from '../helpers/db'

/**
 * « Trouvez-moi » B2B — le portail entreprise passe par l'API interne market
 * (/api/internal/market/sourcing-request*), jamais par un import de modèle
 * cross-domaine (cf. AGENTS.md règle 1 et test:boundaries).
 *
 * Vérifie la chaîne complète : corporate → internal market → AgentJob
 * `sourcing_request` (l'agent existant prend le relais pour la proposition HITL).
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
  await cleanupCompanySourcingRequests(companyId)

  const owner = await ensureCompanyMember({ email: 'e2e-member-owner@itvision.sn', name: 'E2E Owner', companyRole: 'owner' })
  const viewer = await ensureCompanyMember({ email: 'e2e-member-viewer@itvision.sn', name: 'E2E Viewer', companyRole: 'viewer' })
  ownerCtx = await loginCtx(owner.email, owner.password)
  viewerCtx = await loginCtx(viewer.email, viewer.password)
})

test.afterAll(async () => {
  await cleanupCompanySourcingRequests(companyId)
  await ownerCtx?.dispose()
  await viewerCtx?.dispose()
})

test.describe('Sourcing B2B — « Trouvez-moi »', () => {
  test('un viewer ne peut pas lancer de demande', async () => {
    const res = await viewerCtx.post('/api/client-enterprise/sourcing', {
      data: {
        description: 'Caméras IP 4MP extérieures avec NVR 8 canaux pour site industriel',
        qty: 10,
        contactPhone: '+221770000000',
      },
    })
    expect(res.status()).toBe(403)
  })

  test('l’owner crée une demande et l’agent sourcing est enfilé', async () => {
    const res = await ownerCtx.post('/api/client-enterprise/sourcing', {
      data: {
        title: 'Caméras IP 4MP + NVR',
        description: 'Caméras IP 4MP extérieures avec NVR 8 canaux pour site industriel — marque Hikvision ou Dahua',
        qty: 10,
        budgetMaxFCFA: 1500000,
        contactPhone: '+221770000000',
      },
    })

    expect(res.status(), await res.text()).toBe(201)
    const body = await res.json()
    expect(body.reference).toBeTruthy()
    expect(body.id).toBeTruthy()

    // La demande est bien rattachée à la société (scoping corporate)
    expect(await countCompanySourcingRequests(companyId)).toBe(1)

    // L'agent `sourcing_request` existant est déclenché (HITL admin → proposition)
    expect(await countAgentJobsFor(body.id)).toBe(1)
  })

  test('la liste des demandes est visible par les membres de la société', async () => {
    const res = await ownerCtx.get('/api/client-enterprise/sourcing')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.requests)).toBeTruthy()
    expect(body.requests.length).toBe(1)
    expect(body.requests[0].reference).toBeTruthy()
    // Proposition masquée tant qu'elle n'est pas envoyée au client
    expect(body.requests[0].proposal).toBeNull()
  })

  test('description trop courte refusée', async () => {
    const res = await ownerCtx.post('/api/client-enterprise/sourcing', {
      data: { description: 'court', qty: 1, contactPhone: '+221770000000' },
    })
    expect(res.status()).toBe(400)
  })
})
