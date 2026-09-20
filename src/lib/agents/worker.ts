/**
 * Worker agent — polling de la file AgentJob, dispatch par type.
 * Démarré depuis instrumentation.ts (runtime Node), env-gated par
 * AGENT_WORKER_ENABLED. Concurrence bornée (AGENT_CONCURRENCY).
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'
import { runProductModeration } from './moderation/run'

const POLL_MS = parseInt(process.env.AGENT_POLL_MS || '15000', 10)
const CONCURRENCY = Math.max(1, parseInt(process.env.AGENT_CONCURRENCY || '3', 10))
const MAX_ATTEMPTS = 3

const RUNNERS: Record<string, (jobId: string, refId: string) => Promise<void>> = {
  product_moderation: runProductModeration,
}

let started = false
let running = 0

async function tick(): Promise<boolean> {
  if (running >= CONCURRENCY) return false
  // Claim atomique : le premier worker qui pose 'running' gagne le job
  const job = await AgentJob.findOneAndUpdate(
    { status: 'pending', runAfter: { $lte: new Date() }, type: { $in: Object.keys(RUNNERS) } },
    { $set: { status: 'running' }, $inc: { attempts: 1 } },
    { sort: { createdAt: 1 }, new: true }
  )
  if (!job) return false

  running++
  const runner = RUNNERS[job.type]
  runner(String(job._id), job.refId)
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
    .finally(() => { running-- })
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
  console.log(`[agent-worker] démarré — poll ${POLL_MS}ms, concurrence ${CONCURRENCY}`)
}
