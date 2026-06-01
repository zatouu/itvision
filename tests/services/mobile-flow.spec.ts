import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'

/**
 * Tests E2E du flux complet services mobile (API only).
 * Simule le parcours consumer + provider via les endpoints REST.
 *
 * Flow:
 * 1. OTP login consumer + provider
 * 2. Consumer crée une demande
 * 3. Provider cherche les demandes proches (matching)
 * 4. Provider envoie une offre
 * 5. Consumer voit les offres et accepte
 * 6. Provider met à jour les statuts (arriving → in_progress → completed)
 * 7. Consumer laisse un avis
 * 8. Vérifier l'avis
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Test phone numbers (server in dev mode returns _devCode)
const CONSUMER_PHONE = '771000001'
const PROVIDER_PHONE = '771000002'

let consumerCtx: APIRequestContext
let providerCtx: APIRequestContext
let consumerToken: string
let providerToken: string
let requestId: string
let offerId: string

async function otpLogin(phone: string, role: 'CLIENT' | 'TECHNICIAN'): Promise<{ token: string; user: any }> {
  const ctx = await pwRequest.newContext({ baseURL })

  // Send OTP
  const sendRes = await ctx.post('/api/auth/mobile/send-otp', {
    data: { phone, role }
  })
  expect(sendRes.ok(), `send-otp failed: ${sendRes.status()}`).toBeTruthy()
  const sendBody = await sendRes.json()
  const code = sendBody._devCode
  expect(code, 'Dev code not returned — is server in dev mode?').toBeTruthy()

  // Verify OTP
  const verifyRes = await ctx.post('/api/auth/mobile/verify-otp', {
    data: { phone, code, role }
  })
  expect(verifyRes.ok(), `verify-otp failed: ${verifyRes.status()}`).toBeTruthy()
  const verifyBody = await verifyRes.json()
  expect(verifyBody.token).toBeTruthy()

  await ctx.dispose()
  return { token: verifyBody.token, user: verifyBody.user }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

test.describe.serial('Services Mobile Flow', () => {

  test('1. OTP login consumer', async () => {
    const { token } = await otpLogin(CONSUMER_PHONE, 'CLIENT')
    consumerToken = token
    consumerCtx = await pwRequest.newContext({
      baseURL,
      extraHTTPHeaders: authHeaders(token),
    })
  })

  test('2. OTP login provider', async () => {
    const { token } = await otpLogin(PROVIDER_PHONE, 'TECHNICIAN')
    providerToken = token
    providerCtx = await pwRequest.newContext({
      baseURL,
      extraHTTPHeaders: authHeaders(token),
    })
  })

  test('3. Consumer creates a service request', async () => {
    const res = await consumerCtx.post('/api/services/requests', {
      data: {
        category: 'plomberie',
        description: 'E2E Test — fuite robinet cuisine',
        location: {
          type: 'Point',
          coordinates: [-17.4467, 14.6928], // Dakar
          address: 'Place de l\'Indépendance, Dakar',
        },
        budget: 15000,
        channel: 'mobile',
      }
    })
    expect(res.ok(), `create request failed: ${res.status()}`).toBeTruthy()
    const body = await res.json()
    requestId = body.item?._id || body._id
    expect(requestId).toBeTruthy()
  })

  test('4. Provider finds nearby requests via matching', async () => {
    const res = await providerCtx.get(
      `/api/services/matching?lng=-17.4467&lat=14.6928&radiusKm=20&excludeMine=true`
    )
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const items = body.items || []
    const found = items.find((it: any) => it._id === requestId)
    expect(found, 'Created request should appear in nearby matching').toBeTruthy()
  })

  test('5. Provider sends an offer', async () => {
    const res = await providerCtx.post('/api/services/offers', {
      data: {
        requestId,
        price: 12000,
        etaMinutes: 20,
        comment: 'E2E — je suis disponible immédiatement',
        validityMinutes: 30,
        providerName: 'E2E Provider',
      }
    })
    expect(res.ok(), `send offer failed: ${res.status()}`).toBeTruthy()
    const body = await res.json()
    offerId = body.item?._id
    expect(offerId).toBeTruthy()
  })

  test('6. Consumer sees the offer', async () => {
    const res = await consumerCtx.get(`/api/services/offers?requestId=${requestId}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const offers = body.items || []
    expect(offers.length).toBeGreaterThanOrEqual(1)
    const found = offers.find((o: any) => String(o._id) === String(offerId))
    expect(found).toBeTruthy()
    expect(found.price).toBe(12000)
  })

  test('7. Consumer accepts the offer → mission starts', async () => {
    const res = await consumerCtx.post(`/api/services/requests/${requestId}/accept`, {
      data: { offerId }
    })
    expect(res.ok(), `accept offer failed: ${res.status()}`).toBeTruthy()
    const acceptBody = await res.json()
    expect(acceptBody.success).toBe(true)

    // Verify status changed to assigned
    const checkRes = await consumerCtx.get(`/api/services/requests/${requestId}`)
    expect(checkRes.ok()).toBeTruthy()
    const body = await checkRes.json()
    expect(body.item?.status).toBe('assigned')
  })

  test('8. Provider updates status: arriving', async () => {
    const res = await providerCtx.patch(`/api/services/requests/${requestId}`, {
      data: { status: 'provider_arriving' }
    })
    expect(res.ok(), `status→arriving failed: ${res.status()}`).toBeTruthy()
  })

  test('9. Provider updates status: in_progress', async () => {
    const res = await providerCtx.patch(`/api/services/requests/${requestId}`, {
      data: { status: 'in_progress' }
    })
    expect(res.ok(), `status→in_progress failed: ${res.status()}`).toBeTruthy()
  })

  test('10. Provider updates status: completed', async () => {
    const res = await providerCtx.patch(`/api/services/requests/${requestId}`, {
      data: { status: 'completed' }
    })
    expect(res.ok(), `status→completed failed: ${res.status()}`).toBeTruthy()
  })

  test('11. Consumer verifies final mission status', async () => {
    const res = await consumerCtx.get(`/api/services/requests/${requestId}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    const item = body.item || body
    expect(item.status).toBe('completed')
    expect(item.completedAt).toBeTruthy()
  })

  test('12. Consumer rates the mission', async () => {
    const res = await consumerCtx.post('/api/services/reviews', {
      data: {
        requestId,
        rating: 5,
        comment: 'E2E — Excellent service, rapide et efficace',
        tags: ['Ponctuel', 'Pro', 'Rapide'],
      }
    })
    expect(res.ok(), `rate mission failed: ${res.status()}`).toBeTruthy()
  })

  test('13. Review is visible on provider profile', async () => {
    // Get provider user ID from the request
    const reqRes = await consumerCtx.get(`/api/services/requests/${requestId}`)
    const reqBody = await reqRes.json()
    const providerId = reqBody.item?.assignedProviderId

    if (providerId) {
      const res = await consumerCtx.get(`/api/services/reviews?providerId=${providerId}`)
      expect(res.ok()).toBeTruthy()
      const body = await res.json()
      expect(body.reviews?.length).toBeGreaterThanOrEqual(1)
    }
  })

  test.afterAll(async () => {
    // Cleanup : delete the test request
    if (requestId) {
      try {
        await consumerCtx.patch(`/api/services/requests/${requestId}`, {
          data: { status: 'cancelled' }
        })
      } catch { /* already completed, ignore */ }
    }
    await consumerCtx?.dispose()
    await providerCtx?.dispose()
  })
})
