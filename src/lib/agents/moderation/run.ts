/**
 * Cycle de vie du graphe modération : lancement (worker) et reprise (admin).
 * threadId = AgentJob._id — le checkpoint MongoDB fait le lien entre les deux.
 */

import { Command } from '@langchain/langgraph'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import { getAgentModel } from '../llm'
import { getModerationGraph } from './graph'

export async function runProductModeration(jobId: string, refId: string) {
  const graph = getModerationGraph()
  const threadId = jobId
  const t0 = Date.now()
  // Upsert : retry-safe (threadId = jobId a un index unique sur agentruns)
  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'product_moderation', refId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await graph.invoke(
      { productId: refId, runId: threadId },
      { configurable: { thread_id: threadId } }
    )
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status })
  } catch (e: any) {
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}

export interface HumanDecision {
  action: 'approve' | 'reject'
  note?: string
  decidedBy?: string
}

export async function resumeProductModeration(threadId: string, decision: HumanDecision) {
  const graph = getModerationGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
