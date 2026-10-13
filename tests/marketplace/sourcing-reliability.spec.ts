import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentJob from '@/lib/models/AgentJob'
import { claimAgentJob, enqueueAgentJob, heartbeatAgentJob, recoverStaleAgentJobs, staleAgentJobFilter, AGENT_STALE_MS, AGENT_MAX_ATTEMPTS } from '@/lib/agents/queue'
import { deliverSourcingProposalNotification, pendingSourcingProposalNotification } from '@/lib/market/sourcing-proposal'
import { readSharedPricing } from '@/lib/pricing/shared-settings'
import { resolveSourcingSingleImportRate } from '@/lib/agents/sourcing/request-policy'

test.describe('Reprise des jobs sourcing', () => {
  let jobId: string
  let jobType: string

  test.beforeEach(async () => {
    await connectMongoose()
    jobType = `e2e-sourcing-${randomUUID()}`
    const job = await AgentJob.create({ type: jobType, refId: randomUUID(), runAfter: new Date(0) })
    jobId = String(job._id)
  })

  test.afterEach(async () => {
    if (jobId) await AgentJob.deleteOne({ _id: jobId })
  })

  test('un seul worker obtient une tentative concurrente', async () => {
    const claims = await Promise.all([claimAgentJob([jobType]), claimAgentJob([jobType])])
    expect(claims.filter(Boolean)).toHaveLength(1)
    const job = await AgentJob.findById(jobId).lean()
    expect(job?.status).toBe('running')
    expect(job?.attempts).toBe(1)
    expect(job?.heartbeatAt).toBeInstanceOf(Date)
  })

  test('un ancien worker ne renouvelle pas une nouvelle tentative', async () => {
    await claimAgentJob([jobType])
    await AgentJob.updateOne({ _id: jobId }, { $set: { attempts: 2 } })
    expect(await heartbeatAgentJob(jobId, 1)).toBe(false)
    expect(await heartbeatAgentJob(jobId, 2)).toBe(true)
  })

  test('un job sans battement peut être repris avec une nouvelle tentative', async () => {
    await claimAgentJob([jobType])
    await AgentJob.updateOne({ _id: jobId }, { $set: { heartbeatAt: new Date(Date.now() - AGENT_STALE_MS - 1000) } })
    expect(await AgentJob.countDocuments(staleAgentJobFilter([jobType]))).toBe(1)
    expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 1, failed: 0 })
    const reclaimed = await claimAgentJob([jobType])
    expect(reclaimed?.attempts).toBe(2)
    expect(await heartbeatAgentJob(jobId, 1)).toBe(false)
    expect(await heartbeatAgentJob(jobId, 2)).toBe(true)
  })

  test('un job long avec un battement récent reste actif', async () => {
    const job = await claimAgentJob([jobType])
    await AgentJob.collection.updateOne({ _id: job._id }, { $set: { updatedAt: new Date(0) } })
    expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 0, failed: 0 })
    expect((await AgentJob.findById(jobId).lean())?.status).toBe('running')
  })

  for (const status of ['pending', 'running'] as const) {
    test(`un job ${status} épuisé ne repart pas une quatrième fois`, async () => {
      await AgentJob.updateOne({ _id: jobId }, { $set: { status, attempts: AGENT_MAX_ATTEMPTS, heartbeatAt: new Date(0) } })
      expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 0, failed: 1 })
      expect(await claimAgentJob([jobType])).toBeNull()
      expect((await AgentJob.findById(jobId).lean())?.status).toBe('failed')
    })
  }

  test('les types non autorisés et les validations humaines restent intacts', async () => {
    expect(await claimAgentJob([])).toBeNull()
    await AgentJob.updateOne({ _id: jobId }, { $set: { status: 'running', attempts: 1, heartbeatAt: new Date(0) } })
    expect(await recoverStaleAgentJobs([])).toEqual({ requeued: 0, failed: 0 })
    await AgentJob.updateOne({ _id: jobId }, { $set: { status: 'waiting_human', attempts: AGENT_MAX_ATTEMPTS } })
    expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 0, failed: 0 })
    expect((await AgentJob.findById(jobId).lean())?.status).toBe('waiting_human')
  })

  test('un ancien job sans champ heartbeat conserve une voie de reprise', async () => {
    const job = await AgentJob.findById(jobId)
    await AgentJob.collection.updateOne(
      { _id: job._id },
      { $set: { status: 'running', attempts: 1, updatedAt: new Date(0) }, $unset: { heartbeatAt: 1 } }
    )
    expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 1, failed: 0 })
  })

  test('un battement null utilise la date de derniere mise a jour', async () => {
    const job = await AgentJob.findById(jobId)
    await AgentJob.collection.updateOne(
      { _id: job._id },
      { $set: { status: 'running', attempts: 1, updatedAt: new Date(0), heartbeatAt: null } }
    )
    expect(await AgentJob.countDocuments(staleAgentJobFilter([jobType]))).toBe(1)
    expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 1, failed: 0 })
  })

  test('le tarif serveur est enregistre et conserve apres une reprise', async () => {
    const refId = `e2e-pricing-${randomUUID()}`
    try {
      const job = await enqueueAgentJob('sourcing_request', refId, {
        sourcingPricing: { singleImportServiceFeeRate: 999 },
      })
      expect(job).toBeTruthy()
      const snapshot = job!.payload.sourcingPricing
      expect(resolveSourcingSingleImportRate(snapshot)).toBe((await readSharedPricing()).config.defaults.singleImportServiceFeeRate)
      expect(job!.payload.marketPricing.version).toBe((await readSharedPricing()).version)
      expect(Number.isNaN(Date.parse(snapshot.capturedAt))).toBe(false)
      await AgentJob.updateOne({ _id: job!._id }, { $set: {
        type: jobType, status: 'running', attempts: 1, heartbeatAt: new Date(0),
      } })
      expect(await recoverStaleAgentJobs([jobType])).toEqual({ requeued: 1, failed: 0 })
      const restored = await AgentJob.findById(job!._id).lean()
      expect(restored?.payload.sourcingPricing).toEqual(snapshot)
    } finally {
      await AgentJob.deleteMany({ refId })
    }
  })
})

test.describe('Fiabilité des propositions sourcing', () => {
  let requestId: string
  let publicToken: string

  test.beforeEach(async () => {
    await connectMongoose()
    publicToken = randomUUID()
    const doc = await SourcingRequest.create({
      reference: `E2E-SOURCING-${randomUUID()}`,
      publicToken,
      source: 'text',
      description: 'Produit de test',
      qty: 1,
      contactPhone: '+221770000000',
      status: 'proposal_sent',
      slaDueAt: new Date(Date.now() + 86400_000),
      proposalSentAt: new Date(),
      proposalNotification: pendingSourcingProposalNotification(),
      proposal: {
        productName: 'Produit de test',
        productCostFCFA: 10000,
        serviceFeeRate: 10,
        serviceFeeAmount: 1000,
        insuranceRate: 2.5,
        insuranceAmount: 250,
        shippingMethod: 'air_economy',
        shippingCost: 8500,
        totalClientPrice: 19750,
        currency: 'FCFA',
        qty: 1,
        deliveryDays: 13,
        proposedBy: 'e2e',
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400_000),
      },
    })
    requestId = String(doc._id)
  })

  test.afterEach(async () => {
    if (requestId) await SourcingRequest.deleteOne({ _id: requestId })
  })

  test('deux tentatives concurrentes ne transmettent qu’un SMS', async () => {
    let calls = 0
    const send = async () => { calls++; return true }
    const outcomes = await Promise.all([
      deliverSourcingProposalNotification(requestId, send),
      deliverSourcingProposalNotification(requestId, send),
    ])
    expect(outcomes.filter(Boolean)).toHaveLength(1)
    expect(calls).toBe(1)
    expect(await deliverSourcingProposalNotification(requestId, send)).toBe(false)
    const doc = await SourcingRequest.findById(requestId).lean()
    expect(doc?.proposalNotification?.status).toBe('submitted')
    expect(doc?.proposalNotification?.attempts).toBe(1)
    expect(calls).toBe(1)
  })

  test('un échec reste en file et respecte le délai de reprise', async () => {
    expect(await deliverSourcingProposalNotification(requestId, async () => false)).toBe(false)
    let calls = 0
    const send = async () => { calls++; return true }
    expect(await deliverSourcingProposalNotification(requestId, send)).toBe(false)
    expect(calls).toBe(0)
    await SourcingRequest.updateOne({ _id: requestId }, { $set: { 'proposalNotification.nextAttemptAt': new Date(0) } })
    expect(await deliverSourcingProposalNotification(requestId, send)).toBe(true)
    const doc = await SourcingRequest.findById(requestId).lean()
    expect(doc?.proposalNotification?.attempts).toBe(2)
    expect(doc?.proposalNotification?.status).toBe('submitted')
  })

  test('trois échecs déclenchent un état nécessitant une intervention', async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await SourcingRequest.updateOne({ _id: requestId }, { $set: { 'proposalNotification.nextAttemptAt': new Date(0) } })
      await deliverSourcingProposalNotification(requestId, async () => { throw new Error('SMS indisponible') })
    }
    let calls = 0
    await deliverSourcingProposalNotification(requestId, async () => { calls++; return true })
    const doc = await SourcingRequest.findById(requestId).lean()
    expect(doc?.proposalNotification?.status).toBe('failed')
    expect(doc?.proposalNotification?.attempts).toBe(3)
    expect(calls).toBe(0)
  })

  test('une tentative interrompue peut reprendre après expiration du verrou', async () => {
    await SourcingRequest.updateOne({ _id: requestId }, { $set: {
      'proposalNotification.status': 'sending',
      'proposalNotification.attempts': 1,
      'proposalNotification.leaseId': 'ancien-worker',
      'proposalNotification.nextAttemptAt': new Date(0),
    } })
    expect(await deliverSourcingProposalNotification(requestId, async () => true)).toBe(true)
    const doc = await SourcingRequest.findById(requestId).lean()
    expect(doc?.proposalNotification?.attempts).toBe(2)
    expect(doc?.proposalNotification?.leaseId).toBeUndefined()
  })

  test('aucun SMS pour une proposition expirée ou une demande acceptée', async () => {
    let calls = 0
    const send = async () => { calls++; return true }
    await SourcingRequest.updateOne({ _id: requestId }, { $set: { 'proposal.expiresAt': new Date(0) } })
    expect(await deliverSourcingProposalNotification(requestId, send)).toBe(false)
    await SourcingRequest.updateOne({ _id: requestId }, { $set: { status: 'accepted', 'proposal.expiresAt': new Date(Date.now() + 86400_000) } })
    expect(await deliverSourcingProposalNotification(requestId, send)).toBe(false)
    expect(calls).toBe(0)
  })

  test('le suivi public ne révèle pas un prix encore en brouillon', async ({ request }) => {
    await SourcingRequest.updateOne({ _id: requestId }, { $set: { status: 'proposal_ready' } })
    const response = await request.get(`/api/market/sourcing/track/${publicToken}`)
    expect(response.ok()).toBeTruthy()
    expect((await response.json()).request.proposal).toBeNull()
    let calls = 0
    await deliverSourcingProposalNotification(requestId, async () => { calls++; return true })
    expect(calls).toBe(0)
  })
})