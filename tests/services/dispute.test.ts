import { test, expect } from '@playwright/test'
import { ensureTestUsers, createTestServiceMission, cleanupServiceTestData } from '../helpers/db'

test.use({ storageState: 'tests/.auth/admin.json' })

test.beforeEach(async () => {
  await cleanupServiceTestData()
})

test.afterEach(async () => {
  await cleanupServiceTestData()
})

test.describe('Service dispute lifecycle', () => {
  test('client opens a dispute and admin resolves with full refund', async ({ request, page }) => {
    const users = await ensureTestUsers()
    const { requestId } = await createTestServiceMission(users.client.userId, users.tech.userId, 10000)

    // 1. Client opens the dispute
    const clientCtx = await request.newContext({ storageState: 'tests/.auth/client.json' })
    const openRes = await clientCtx.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'dispute', reason: 'qualite' },
    })
    expect(openRes.ok()).toBeTruthy()
    const opened = await openRes.json()
    expect(opened.item.status).toBe('dispute')
    expect(opened.item.disputeStatus).toBe('open')
    expect(opened.item.escrowLocked).toBe(true)

    // 2. Client adds a message and evidence URL
    const msgRes = await clientCtx.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'dispute-message', text: 'Prestataire non venu' },
    })
    expect(msgRes.ok()).toBeTruthy()
    const evidenceRes = await clientCtx.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'dispute-evidence', type: 'image', url: '/api/uploads/disputes/e2e-proof.jpg' },
    })
    expect(evidenceRes.ok()).toBeTruthy()
    await clientCtx.dispose()

    // 3. Admin resolves with refund
    const resolveRes = await request.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'resolve-dispute', decision: 'refund', adminNote: 'Remboursement intégral' },
    })
    expect(resolveRes.ok()).toBeTruthy()

    // 4. Verify final state
    const detailRes = await request.get(`/api/admin/services/disputes/${requestId}`)
    expect(detailRes.ok()).toBeTruthy()
    const detail = await detailRes.json()
    expect(detail.item.status).toBe('cancelled')
    expect(detail.item.disputeStatus).toBe('resolved')
    expect(detail.item.disputeDecision).toBe('refund')
    expect(detail.payments[0].status).toBe('refunded')
    expect(detail.payments[0].refundAmount).toBe(10000)
    expect(detail.messages.length).toBeGreaterThan(0)
    expect(detail.evidence.length).toBeGreaterThan(0)
    expect(detail.auditLogs.some((l: any) => l.action === 'dispute_resolved')).toBe(true)

    // 5. Admin UI renders the dispute list and detail
    await page.goto('/admin/services/disputes')
    await expect(page.locator('text=Litiges services')).toBeVisible()
    await page.goto(`/admin/services/disputes/${requestId}`)
    await expect(page.locator('text=Remboursement intégral')).toBeVisible()
    await expect(page.locator('text=10 000 FCFA')).toBeVisible()
  })

  test('admin resolves with partial refund and provider payout', async ({ request }) => {
    const users = await ensureTestUsers()
    const { requestId } = await createTestServiceMission(users.client.userId, users.tech.userId, 10000)

    const clientCtx = await request.newContext({ storageState: 'tests/.auth/client.json' })
    const openRes = await clientCtx.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'dispute', reason: 'retard' },
    })
    expect(openRes.ok()).toBeTruthy()
    await clientCtx.dispose()

    const resolveRes = await request.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'resolve-dispute', decision: 'partial_refund', refundAmount: 3000, adminNote: 'Remboursement partiel 3000' },
    })
    expect(resolveRes.ok()).toBeTruthy()

    const detailRes = await request.get(`/api/admin/services/disputes/${requestId}`)
    const detail = await detailRes.json()
    expect(detail.item.status).toBe('completed')
    expect(detail.item.disputeDecision).toBe('partial_refund')
    expect(detail.item.disputeRefundAmount).toBe(3000)
    expect(detail.payments[0].status).toBe('refunded')
    expect(detail.payments[0].refundAmount).toBe(3000)
  })

  test('admin resolves releasing escrow to provider', async ({ request }) => {
    const users = await ensureTestUsers()
    const { requestId } = await createTestServiceMission(users.client.userId, users.tech.userId, 10000)

    const clientCtx = await request.newContext({ storageState: 'tests/.auth/client.json' })
    const openRes = await clientCtx.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'dispute', reason: 'comportement' },
    })
    expect(openRes.ok()).toBeTruthy()
    await clientCtx.dispose()

    const resolveRes = await request.patch(`/api/services/requests/${requestId}`, {
      data: { action: 'resolve-dispute', decision: 'release_escrow', adminNote: 'Paiement libéré au prestataire' },
    })
    expect(resolveRes.ok()).toBeTruthy()

    const detailRes = await request.get(`/api/admin/services/disputes/${requestId}`)
    const detail = await detailRes.json()
    expect(detail.item.status).toBe('completed')
    expect(detail.item.disputeDecision).toBe('release_escrow')
    expect(detail.payments[0].status).toBe('released')
  })
})
