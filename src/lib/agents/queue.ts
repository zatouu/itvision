/**
 * File de travail des agents — collection AgentJob en Mongo.
 * enqueue() depuis les routes métier (fire-and-forget), le worker
 * dépile par claim atomique (findOneAndUpdate) → multi-process safe.
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'

export type AgentJobType = 'product_moderation'

export async function enqueueAgentJob(type: AgentJobType, refId: string) {
  try {
    await connectMongoose()
    // Un seul job actif par cible — évite les doubles analyses sur le même produit
    const existing = await AgentJob.findOne({
      type,
      refId,
      status: { $in: ['pending', 'running', 'waiting_human'] },
    }).lean()
    if (existing) return
    await AgentJob.create({ type, refId, status: 'pending', runAfter: new Date() })
  } catch (e) {
    console.error(`[agents] enqueue ${type} failed:`, e)
  }
}
