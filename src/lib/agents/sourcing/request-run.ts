/**
 * Runner du graphe sourcing_request — déclenché à la création d'une demande
 * « trouvez-moi » client. interrupt() fige en attente de décision admin ;
 * resumeSourcingRequest() le réveille (approuve → brouillon proposition).
 */

import { Command } from '@langchain/langgraph'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import type { IAgentJob } from '@/lib/models/AgentJob'
import { getSourcingRequestGraph, SOURCING_RETRY_DELAY_MS } from './request-graph'
import { closeSourcingBrowser } from './graph'
import { resolveSourcingSingleImportRate } from './request-policy'
import { readSharedPricing, sharedPricingSnapshotSchema } from '@/lib/pricing/shared-settings'

export async function runSourcingRequest(job: Pick<IAgentJob, '_id' | 'refId' | 'attempts' | 'payload'>, signal?: AbortSignal) {
  const jobId = String(job._id)
  const runningAttempt = { _id: jobId, status: 'running', attempts: job.attempts }
  const requestId = job.refId
  // Chaque essai (relance après blocage ou échec) repart d'un fil neuf ; le suffixe reste rattaché au job.
  const threadId = (job.attempts || 1) > 1 ? `${jobId}-r${job.attempts}` : jobId
  const t0 = Date.now()
  // Upsert : en cas de retry du même job (threadId unique),
  // on réutilise le run existant au lieu de planter sur E11000.
  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'sourcing_request', refId: requestId, llmUsed: false, error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const pricingPinned = job.payload?.marketPricing !== undefined
    const pricingSnapshot = pricingPinned ? sharedPricingSnapshotSchema.parse(job.payload!.marketPricing) : await readSharedPricing()
    const result = await getSourcingRequestGraph().invoke(
      { requestId, runId: threadId, candidates: [], singleImportServiceFeeRate: resolveSourcingSingleImportRate(job.payload?.sourcingPricing), pricingSnapshot, pricingPinned },
      { configurable: { thread_id: threadId }, signal }
    )
    signal?.throwIfAborted()
    if ((result as any)?.retryLater) {
      await AgentRun.updateOne({ _id: run._id }, { status: 'done', durationMs: Date.now() - t0 })
      await AgentJob.updateOne(runningAttempt, { status: 'pending', runAfter: new Date(Date.now() + SOURCING_RETRY_DELAY_MS) })
      return
    }
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne(runningAttempt, { status })
  } catch (e: any) {
    await closeSourcingBrowser()
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}

export interface SourcingRequestDecision {
  action: 'approve' | 'reject'
  note?: string
  decidedBy?: string
}

export async function resumeSourcingRequest(threadId: string, decision: SourcingRequestDecision) {
  const graph = getSourcingRequestGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId.split('-r')[0], status: 'waiting_human' }, { status: 'done' })
}
