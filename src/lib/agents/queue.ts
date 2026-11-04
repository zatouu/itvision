/**
 * File de travail des agents — collection AgentJob en Mongo.
 * enqueue() depuis les routes métier (fire-and-forget), le worker
 * dépile par claim atomique (findOneAndUpdate) → multi-process safe.
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'
import { readSharedPricing } from '@/lib/pricing/shared-settings'

export const AGENT_MAX_ATTEMPTS = 3
export const AGENT_STALE_MS = 15 * 60 * 1000

export async function claimAgentJob(types: string[]) {
  return AgentJob.findOneAndUpdate(
    { status: 'pending', runAfter: { $lte: new Date() }, type: { $in: types }, attempts: { $lt: AGENT_MAX_ATTEMPTS } },
    { $set: { status: 'running', heartbeatAt: new Date() }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  )
}

export async function heartbeatAgentJob(jobId: string, attempt: number) {
  const result = await AgentJob.updateOne(
    { _id: jobId, status: 'running', attempts: attempt },
    { $set: { heartbeatAt: new Date() } }
  )
  return result.matchedCount > 0
}

export function staleAgentJobFilter(types: string[], now = new Date()) {
  const cutoff = new Date(now.getTime() - AGENT_STALE_MS)
  return {
    status: 'running',
    type: { $in: types },
    $or: [
      { heartbeatAt: { $lte: cutoff } },
      { heartbeatAt: null, updatedAt: { $lte: cutoff } },
    ],
  }
}

export async function recoverStaleAgentJobs(types: string[], now = new Date()) {
  const stale = staleAgentJobFilter(types, now)
  const exhausted = await AgentJob.updateMany(
    { type: { $in: types }, attempts: { $gte: AGENT_MAX_ATTEMPTS }, $or: [stale, { status: 'pending' }] },
    { $set: { status: 'failed', error: 'Nombre maximal de tentatives atteint' }, $unset: { heartbeatAt: 1 } }
  )
  const recovered = await AgentJob.updateMany(
    { ...stale, attempts: { $lt: AGENT_MAX_ATTEMPTS } },
    { $set: { status: 'pending', runAfter: now, error: 'Worker sans battement : nouvelle tentative planifiee' }, $unset: { heartbeatAt: 1 } }
  )
  return { requeued: recovered.modifiedCount, failed: exhausted.modifiedCount }
}

export type AgentJobType =
  | 'product_moderation'
  | 'sourcing_scan'
  | 'sourcing_request'
  | 'quote_draft'
  | 'contract_renewal'
  | 'client_digest'
  | 'group_order_rescue'
  | 'group_order_seeding'

export async function enqueueAgentJob(
  type: AgentJobType,
  refId: string,
  payload?: Record<string, unknown>
) {
  try {
    await connectMongoose()
    // Un seul job actif par cible — évite les doubles analyses sur le même produit
    const existing = await AgentJob.findOne({
      type,
      refId,
      status: { $in: ['pending', 'running', 'waiting_human'] },
    }).lean()
    if (existing) return null
    const pricing = type === 'sourcing_request' ? await readSharedPricing() : undefined
    const jobPayload = type === 'sourcing_request'
      ? {
          ...payload,
          marketPricing: pricing,
          sourcingPricing: {
            singleImportServiceFeeRate: pricing!.config.defaults.singleImportServiceFeeRate,
            capturedAt: new Date().toISOString(),
          },
        }
      : payload
    const job = await AgentJob.create({ type, refId, payload: jobPayload, status: 'pending', runAfter: new Date() })
    return job
  } catch (e) {
    console.error(`[agents] enqueue ${type} failed:`, e)
    return null
  }
}

/** Y a-t-il déjà un job de ce type en cours/pending ? (throttle par type) */
export async function hasActiveJob(type: AgentJobType): Promise<boolean> {
  await connectMongoose()
  const existing = await AgentJob.findOne({
    type,
    status: { $in: ['pending', 'running', 'waiting_human'] },
  }).lean()
  return !!existing
}
