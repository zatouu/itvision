/**
 * Runner du graphe sourcing_scan : lancé par le worker sur un AgentJob.
 * Pas de reprise humaine ici (pas d'interrupt) — le HITL est délégué
 * aux jobs product_moderation enchaînés sur chaque brouillon importé.
 */

import AgentRun from '@/lib/models/AgentRun'
import AgentJob from '@/lib/models/AgentJob'
import type { IAgentJob } from '@/lib/models/AgentJob'
import { getSourcingGraph, closeSourcingBrowser } from './graph'
import { classifySourceUrl } from '@/lib/browser-scraper'

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
  // URLs directes 1688/AliExpress/Alibaba (ex: liens fournis par les contacts en Chine)
  const directUrls = (payload.urls || []).filter((u) => classifySourceUrl(u) !== null)
  const query = (payload.query || job.refId || '').trim()
  if (!query && directUrls.length === 0) {
    throw new Error('sourcing_scan: ni query ni urls dans le payload')
  }

  const t0 = Date.now()
  // Upsert : retry-safe (threadId = jobId a un index unique sur agentruns)
  const run = await AgentRun.findOneAndUpdate(
    { threadId: jobId },
    {
      $set: { status: 'running', graph: 'sourcing_scan', refId: query, llmUsed: false, error: undefined },
      $setOnInsert: { threadId: jobId },
    },
    { upsert: true, new: true }
  )

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
