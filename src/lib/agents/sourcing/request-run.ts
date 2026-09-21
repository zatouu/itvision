/**
 * Runner du graphe sourcing_request — déclenché à la création d'une demande
 * « trouvez-moi » client. interrupt() fige en attente de décision admin ;
 * resumeSourcingRequest() le réveille (approuve → brouillon proposition).
 */

import { Command } from '@langchain/langgraph'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import type { IAgentJob } from '@/lib/models/AgentJob'
import { getSourcingRequestGraph, } from './request-graph'
import { closeSourcingBrowser } from './graph'

export async function runSourcingRequest(job: Pick<IAgentJob, '_id' | 'refId'>) {
  const jobId = String(job._id)
  const requestId = job.refId
  const t0 = Date.now()
  // Upsert : en cas de retry du même job (threadId = jobId, index unique),
  // on réutilise le run existant au lieu de planter sur E11000.
  const run = await AgentRun.findOneAndUpdate(
    { threadId: jobId },
    {
      $set: { status: 'running', graph: 'sourcing_request', refId: requestId, llmUsed: false, error: undefined },
      $setOnInsert: { threadId: jobId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await getSourcingRequestGraph().invoke(
      { requestId, runId: jobId, candidates: [] },
      { configurable: { thread_id: jobId } }
    )
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status })
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
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
