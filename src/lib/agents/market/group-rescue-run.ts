/**
 * Cycle de vie du graphe « group_order_rescue » : détection (cron), lancement (worker), reprise (admin).
 * threadId = AgentJob._id — le checkpoint MongoDB fait le lien entre les étapes.
 */

import { Command } from '@langchain/langgraph'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import AgentDecision from '@/lib/models/AgentDecision'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { getAgentModel } from '../llm'
import { enqueueAgentJob } from '../queue'
import { getGroupRescueGraph } from './group-rescue'

/** Groupes ouverts qui ferment sous 48 h sans minimum atteint, avec un début de traction. */
export async function scanGroupsAtRisk(now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 48 * 3600_000)
  const groups = await GroupOrder.find({
    status: 'open',
    deadline: { $gt: now, $lte: soon },
    $expr: { $lt: ['$currentQty', '$minQty'] },
  }).select('groupId').limit(50).lean() as any[]
  let queued = 0
  const dayAgo = new Date(now.getTime() - 24 * 3600_000)
  for (const g of groups) {
    const refId = String(g.groupId)
    // Une seule proposition par groupe (même refusée), et au plus un diagnostic par jour.
    const [proposed, recent] = await Promise.all([
      AgentDecision.exists({ type: 'group_order_rescue', refId }),
      AgentJob.exists({ type: 'group_order_rescue', refId, createdAt: { $gt: dayAgo } }),
    ])
    if (proposed || recent) continue
    if (await enqueueAgentJob('group_order_rescue', refId)) queued++
  }
  return queued
}

export async function runGroupRescue(jobId: string, groupId: string) {
  const graph = getGroupRescueGraph()
  const threadId = jobId
  const t0 = Date.now()
  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'group_order_rescue', refId: groupId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )

  try {
    const result = await graph.invoke({ groupId, runId: threadId }, { configurable: { thread_id: threadId } })
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status, result: interrupted ? undefined : { outcome: 'no_action_needed' } })
  } catch (e: any) {
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}

export async function resumeGroupRescue(threadId: string, decision: { action: 'approve' | 'reject'; note?: string; decidedBy?: string }) {
  const graph = getGroupRescueGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
