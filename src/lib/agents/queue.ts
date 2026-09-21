/**
 * File de travail des agents — collection AgentJob en Mongo.
 * enqueue() depuis les routes métier (fire-and-forget), le worker
 * dépile par claim atomique (findOneAndUpdate) → multi-process safe.
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'

export type AgentJobType = 'product_moderation' | 'sourcing_scan' | 'sourcing_request'

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
    const job = await AgentJob.create({ type, refId, payload, status: 'pending', runAfter: new Date() })
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
