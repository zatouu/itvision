/**
 * Worker agent — polling de la file AgentJob, dispatch par type.
 * Démarré depuis instrumentation.ts (runtime Node), env-gated par
 * AGENT_WORKER_ENABLED. Concurrence bornée (AGENT_CONCURRENCY).
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'
import { runProductModeration } from './moderation/run'
import { runSourcingScan } from './sourcing/run'

const POLL_MS = parseInt(process.env.AGENT_POLL_MS || '15000', 10)
const CONCURRENCY = Math.max(1, parseInt(process.env.AGENT_CONCURRENCY || '3', 10))
const MAX_ATTEMPTS = 3

// Concurrence max PAR TYPE : un navigateur Chrome par scan sourcing max —
// deux Chromium simultanés satureraient la RAM du conteneur.
const TYPE_CONCURRENCY: Record<string, number> = {
  sourcing_scan: 1,
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
}

let started = false
let running = 0
const runningByType = new Map<string, number>()

async function tick(): Promise<boolean> {
  if (running >= CONCURRENCY) return false
  // Types dont la concurrence par-type est saturée → exclus du claim
  const saturated = Object.entries(TYPE_CONCURRENCY)
    .filter(([t, max]) => (runningByType.get(t) || 0) >= max)
    .map(([t]) => t)
  const allowedTypes = Object.keys(RUNNERS).filter(
    (t) => !saturated.includes(t) && (ENABLED_TYPES.length === 0 || ENABLED_TYPES.includes(t))
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
  runningByType.set(job.type, (runningByType.get(job.type) || 0) + 1)
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
      runningByType.set(job.type, (runningByType.get(job.type) || 1) - 1)
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
