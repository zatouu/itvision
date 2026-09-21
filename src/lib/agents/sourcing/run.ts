/**
 * Runner du graphe sourcing_scan : lancé par le worker sur un AgentJob.
 * Pas de reprise humaine ici (pas d'interrupt) — le HITL est délégué
 * aux jobs product_moderation enchaînés sur chaque brouillon importé.
 */

import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import type { IAgentJob } from '@/lib/models/AgentJob'
import { getSourcingGraph, closeSourcingBrowser } from './graph'

const MAX_ITEMS_CAP = 30

export async function runSourcingScan(job: Pick<IAgentJob, '_id' | 'refId' | 'payload'>) {
  const jobId = String(job._id)
  const payload = (job.payload || {}) as {
    query?: string
    urls?: string[]
    category?: string
    maxItems?: number
    groupBuyEligible?: boolean
  }
  const directUrls = (payload.urls || []).filter((u) => /detail\.1688\.com\/offer\/\d+/.test(u))
  const query = (payload.query || job.refId || '').trim()
  if (!query && directUrls.length === 0) {
    throw new Error('sourcing_scan: ni query ni urls dans le payload')
  }

  const t0 = Date.now()
  const run = await AgentRun.create({
    threadId: jobId,
    graph: 'sourcing_scan',
    refId: query,
    status: 'running',
    llmUsed: false, // extraction et pricing 100% déterministes
  })

  try {
    const result = await getSourcingGraph().invoke(
      {
        jobId,
        query: query || 'import direct',
        category: payload.category || 'Import Chine',
        maxItems: Math.min(Math.max(1, payload.maxItems || 10), MAX_ITEMS_CAP),
        groupBuyEligible: !!payload.groupBuyEligible,
        directUrls,
        offerUrls: [],
        extracted: [],
        failed: [],
        imported: [],
      },
      { configurable: { thread_id: jobId } }
    )
    await AgentRun.updateOne({ _id: run._id }, { status: 'done', durationMs: Date.now() - t0 })
    await AgentJob.updateOne({ _id: jobId }, { status: 'done', result: result.summary })
  } catch (e: any) {
    await closeSourcingBrowser()
    await AgentRun.updateOne({ _id: run._id }, { status: 'failed', error: e?.message, durationMs: Date.now() - t0 })
    throw e
  }
}
