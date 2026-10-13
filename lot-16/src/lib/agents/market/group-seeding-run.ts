/**
 * Cycle de vie du graphe « group_order_seeding » : détection quotidienne, lancement (worker), reprise (admin).
 */

import { Command } from '@langchain/langgraph'
import mongoose from 'mongoose'
import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import AgentDecision from '@/lib/models/AgentDecision'
import GroupInterest from '@/lib/models/GroupInterest'
import SourcingRequest from '@/lib/models/SourcingRequest'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { getAgentModel } from '../llm'
import { enqueueAgentJob } from '../queue'
import { getGroupSeedingGraph } from './group-seeding'

const MIN_INTERESTED = Number(process.env.GROUP_SEED_MIN_INTERESTED) || 3
const MAX_PER_DAY = 5
const COOLDOWN_DAYS = 30

/** Produits avec des « Prévenez-moi » en attente et sans groupe ouvert : jusqu'à 5 analyses par jour. */
export async function scanGroupSeedCandidates(now = new Date()): Promise<number> {
  const rows = await GroupInterest.aggregate([
    { $match: { notified: false, productId: { $ne: null } } },
    { $group: { _id: '$productId', interested: { $sum: 1 } } },
    { $match: { interested: { $gte: MIN_INTERESTED } } },
    { $sort: { interested: -1 } },
    { $limit: 30 },
  ])
  // Plusieurs clients ont demandé le même produit via « Trouvez-moi » : demande avérée.
  const sourced = await SourcingRequest.aggregate([
    { $match: { productId: { $nin: [null, ''] }, createdAt: { $gt: new Date(now.getTime() - 60 * 86_400_000) } } },
    { $group: { _id: '$productId', requests: { $sum: 1 } } },
    { $match: { requests: { $gte: 2 } } },
    { $sort: { requests: -1 } },
    { $limit: 20 },
  ])
  for (const s of sourced) {
    if (!rows.some((r: any) => String(r._id) === String(s._id))) rows.push({ _id: s._id })
  }
  const cooldown = new Date(now.getTime() - COOLDOWN_DAYS * 86_400_000)
  let queued = 0
  for (const r of rows) {
    if (queued >= MAX_PER_DAY) break
    const refId = String(r._id)
    const [openGroup, recentProposal] = await Promise.all([
      GroupOrder.exists({ 'product.productId': new mongoose.Types.ObjectId(refId), status: { $in: ['draft', 'open'] } }),
      AgentDecision.exists({ type: 'group_order_seeding', refId, createdAt: { $gt: cooldown } }),
    ])
    if (openGroup || recentProposal) continue
    if (await enqueueAgentJob('group_order_seeding', refId)) queued++
  }
  return queued
}

export async function runGroupSeeding(jobId: string, productId: string) {
  const graph = getGroupSeedingGraph()
  const threadId = jobId
  const t0 = Date.now()
  const run = await AgentRun.findOneAndUpdate(
    { threadId },
    {
      $set: { status: 'running', graph: 'group_order_seeding', refId: productId, llmUsed: !!getAgentModel(), error: undefined },
      $setOnInsert: { threadId },
    },
    { upsert: true, new: true }
  )
  try {
    const result = await graph.invoke({ productId, runId: threadId }, { configurable: { thread_id: threadId } })
    const interrupted = Array.isArray((result as any)?.__interrupt__) && (result as any).__interrupt__.length > 0
    const status = interrupted ? 'waiting_human' : 'done'
    await AgentRun.updateOne({ _id: run._id }, { status, durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status, result: interrupted ? undefined : { outcome: 'demand_too_low' } })
  } catch (e: any) {
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}

export async function resumeGroupSeeding(threadId: string, decision: { action: 'approve' | 'reject'; note?: string; decidedBy?: string }) {
  const graph = getGroupSeedingGraph()
  await graph.invoke(new Command({ resume: decision }), { configurable: { thread_id: threadId } })
  await AgentRun.updateOne({ threadId }, { status: 'done' })
  await AgentJob.updateOne({ _id: threadId, status: 'waiting_human' }, { status: 'done' })
}
