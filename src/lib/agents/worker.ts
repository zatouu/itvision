/**
 * Worker agent — polling de la file AgentJob, dispatch par type.
 * Démarré depuis instrumentation.ts (runtime Node), env-gated par
 * AGENT_WORKER_ENABLED. Concurrence bornée (AGENT_CONCURRENCY).
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'
import { runProductModeration } from './moderation/run'
import { runSourcingScan } from './sourcing/run'
import { runSourcingRequest } from './sourcing/request-run'

const POLL_MS = parseInt(process.env.AGENT_POLL_MS || '15000', 10)
const CONCURRENCY = Math.max(1, parseInt(process.env.AGENT_CONCURRENCY || '3', 10))
const MAX_ATTEMPTS = 3

// Pools de concurrence : les types 'browser' partagent UNE seule instance
// Chromium (le singleton scraper est module-level + RAM limitée).
const TYPE_POOL: Record<string, string> = {
  sourcing_scan: 'browser',
  sourcing_request: 'browser',
}
const POOL_CONCURRENCY: Record<string, number> = {
  browser: 1,
}

// AGENT_WORKER_TYPES=sourcing_scan → ce worker ne prend QUE les scans 1688.
// Cas d'usage : worker local sur une IP résidentielle (box/tunnel) pendant
// que le serveur traite la modération. Vide/absent = tous les types.
const ENABLED_TYPES = (process.env.AGENT_WORKER_TYPES || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean)

const RUNNERS: Record<string, (job: any) => Promise<void>> = {
  product_moderation: (job) => runProductModeration(String(job._id), job.refId),
  sourcing_scan: (job) => runSourcingScan(job),
  sourcing_request: (job) => runSourcingRequest(job),
}

let started = false
let running = 0
const runningByPool = new Map<string, number>()

async function tick(): Promise<boolean> {
  if (running >= CONCURRENCY) return false
  // Pools saturés → types concernés exclus du claim
  const saturatedPools = new Set(
    Object.entries(POOL_CONCURRENCY)
      .filter(([p, max]) => (runningByPool.get(p) || 0) >= max)
      .map(([p]) => p)
  )
  const allowedTypes = Object.keys(RUNNERS).filter(
    (t) =>
      !(TYPE_POOL[t] && saturatedPools.has(TYPE_POOL[t])) &&
      (ENABLED_TYPES.length === 0 || ENABLED_TYPES.includes(t))
  )
  if (allowedTypes.length === 0) return false

  // Claim atomique : le premier worker qui pose 'running' gagne le job
  const job = await AgentJob.findOneAndUpdate(
    { status: 'pending', runAfter: { $lte: new Date() }, type: { $in: allowedTypes } },
    { $set: { status: 'running' }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  )
  if (!job) return false

  running++
  const pool = TYPE_POOL[job.type] || job.type
  runningByPool.set(pool, (runningByPool.get(pool) || 0) + 1)
  const runner = RUNNERS[job.type]
  runner(job)
    .catch(async (e: any) => {
      console.error(`[agent-worker] job ${job._id} (${job.type}) failed:`, e?.message)
      const attempts = job.attempts ?? 1
      try {
        await AgentJob.updateOne(
          { _id: job._id },
          attempts < MAX_ATTEMPTS
            ? { $set: { status: 'pending', runAfter: new Date(Date.now() + attempts * 30_000), error: e?.message } }
            : { $set: { status: 'failed', error: e?.message } }
        )
      } catch (e2) {
        console.error('[agent-worker] failed to update job:', e2)
      }
    })
    .finally(() => {
      running--
      runningByPool.set(pool, Math.max(0, (runningByPool.get(pool) || 1) - 1))
    })
  return true
}

export function startAgentWorker() {
  if (started) return
  if (process.env.AGENT_WORKER_ENABLED !== 'true') {
    console.log('[agent-worker] désactivé (AGENT_WORKER_ENABLED != true)')
    return
  }
  started = true
  // Récupération crash : un job 'running' depuis >15 min = worker mort en
  // plein run → remis en pending pour re-claim. (Garde-fou temps pour ne pas
  // réenfiler un job légitimement long encore actif chez un autre worker.)
  const STALE_MS = 15 * 60 * 1000
  void (async () => {
    try {
      await connectMongoose()
      const r = await AgentJob.updateMany(
        { status: 'running', updatedAt: { $lt: new Date(Date.now() - STALE_MS) } },
        { $set: { status: 'pending', runAfter: new Date() } }
      )
      if (r.modifiedCount > 0) console.log(`[agent-worker] ${r.modifiedCount} job(s) 'running' orphelins remis en file`)
    } catch (e) {
      console.error('[agent-worker] stale-job recovery failed:', e)
    }
  })()
  const loop = async () => {
    try {
      await connectMongoose()
      // Dépile jusqu'à la concurrence max — chaque job tourne en tâche de fond
      while (running < CONCURRENCY && (await tick())) { /* drain */ }
    } catch (e) {
      console.error('[agent-worker] tick error:', e)
    }
  }
  setInterval(loop, POLL_MS).unref()
  void loop()
  console.log(`[agent-worker] démarré — poll ${POLL_MS}ms, concurrence ${CONCURRENCY}, types: ${ENABLED_TYPES.length ? ENABLED_TYPES.join(',') : 'tous'}`)
}
