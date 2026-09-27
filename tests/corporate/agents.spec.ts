import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import { ensureTestUsers, createValidatedReportFixture, cleanupAgentFixtures } from '../helpers/db'
import { runQuoteDraft } from '@/lib/agents/corporate/quote-draft'
import AgentJob from '@/lib/models/AgentJob'
import AgentDecision from '@/lib/models/AgentDecision'
import AdminQuote from '@/lib/models/AdminQuote'
import MaintenanceReport from '@/lib/models/MaintenanceReport'

/**
 * Agents corporate — chaîne complète sans worker :
 *   1. rapport validé → job `quote_draft` enfilé
 *   2. exécution du graphe (runQuoteDraft) → AgentDecision pending
 *   3. approbation admin (resumeQuoteDraft) → AdminQuote brouillon réel
 *      + rapport lié (quoteGenerated / billing.quoteStatus)
 *
 * Le LLM n'est pas configuré en test : le graphe doit dégrader proprement
 * (analyse `unavailable`) sans bloquer la proposition.
 */

let reportId: string
let adminCredentials: { email: string; password: string }

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Le resume du graphe (checkpointer Mongo) peut dépasser le timeout par défaut
test.setTimeout(120_000)

test.beforeAll(async () => {
  const users = await ensureTestUsers()
  await cleanupAgentFixtures()
  const fixture = await createValidatedReportFixture()
  reportId = fixture.reportId
  adminCredentials = { email: users.admin.email, password: users.admin.password }
})

test.afterAll(async () => {
  await cleanupAgentFixtures()
})

test.describe('Agent quote_draft — rapport validé → devis brouillon', () => {
  test('le graphe produit une proposition chiffrée à valider', async () => {
    const job = await AgentJob.create({ type: 'quote_draft', refId: reportId, status: 'pending', runAfter: new Date() })
    await runQuoteDraft(String(job._id), reportId)

    const decision = await AgentDecision.findOne({ type: 'quote_draft', refId: reportId }).lean() as any
    expect(decision, 'AgentDecision créée').toBeTruthy()
    expect(decision.status).toBe('pending')

    const proposal = decision.proposal
    expect(Array.isArray(proposal.lines)).toBeTruthy()
    // 2 matériels + 1 main d'œuvre
    expect(proposal.lines.length).toBeGreaterThanOrEqual(3)
    expect(proposal.pricing.total).toBeGreaterThan(0)

    const run = await AgentJob.findById(job._id).lean() as any
    expect(run.status).toBe('waiting_human')
  })

  test('l’approbation admin crée le devis réel et lie le rapport', async () => {
    const decision = await AgentDecision.findOne({ type: 'quote_draft', refId: reportId }).lean() as any
    expect(decision, 'décision en attente').toBeTruthy()

    // Chemin réel : la route admin enregistre la décision PUIS reprend le graphe
    const adminCtx = await pwRequest.newContext({ baseURL })
    try {
      const login = await adminCtx.post('/api/auth/login', { data: adminCredentials })
      expect(login.ok(), `login admin: ${login.status()}`).toBeTruthy()

      const res = await adminCtx.post(`/api/admin/agent-decisions/${decision._id}`, {
        data: { action: 'approve', note: 'Validé en test' },
      })
      expect(res.status(), await res.text()).toBe(200)
    } finally {
      await adminCtx.dispose()
    }

    const quote = await AdminQuote.findOne({ createdBy: 'agent:quote_draft' }).sort({ createdAt: -1 }).lean() as any
    expect(quote, 'AdminQuote créé').toBeTruthy()
    expect(quote.status).toBe('draft')
    expect(quote.numero).toMatch(/^DEV-\d{4}-\d{4}$/)
    expect(quote.total).toBeGreaterThan(0)

    const report = await MaintenanceReport.findById(reportId).lean() as any
    expect(report.quoteGenerated).toBe(true)
    expect(String(report.quoteId)).toBe(String(quote._id))
    expect(report.billing?.quoteStatus).toBe('draft')

    const updatedDecision = await AgentDecision.findById(decision._id).lean() as any
    expect(updatedDecision.status).toBe('approved')
    expect(updatedDecision.decidedBy).toBeTruthy()
  })
})
