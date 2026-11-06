/**
 * Worker agent — polling de la file AgentJob, dispatch par type.
 * Démarré depuis instrumentation.ts (runtime Node), env-gated par
 * AGENT_WORKER_ENABLED. Concurrence bornée (AGENT_CONCURRENCY).
 */

import { connectMongoose } from '@/lib/mongoose'
import AgentJob from '@/lib/models/AgentJob'
import { claimAgentJob, heartbeatAgentJob, recoverStaleAgentJobs, AGENT_MAX_ATTEMPTS } from './queue'
import { runProductModeration } from './moderation/run'
import { runSourcingScan } from './sourcing/run'
import { runSourcingRequest } from './sourcing/request-run'
import { runQuoteDraft } from './corporate/quote-draft'
import { runContractRenewal } from './corporate/contract-renewal'
import { runClientDigest } from './corporate/client-digest'
import { runGroupRescue } from './market/group-rescue-run'
import { runGroupSeeding } from './market/group-seeding-run'

const POLL_MS = parseInt(process.env.AGENT_POLL_MS || '15000', 10)
const CONCURRENCY = Math.max(1, parseInt(process.env.AGENT_CONCURRENCY || '3', 10))
const HEARTBEAT_MS = 30_000
const RECOVERY_MS = 60_000

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

const RUNNERS: Record<string, (job: any, signal?: AbortSignal) => Promise<void>> = {
  product_moderation: (job) => runProductModeration(String(job._id), job.refId),
  sourcing_scan: (job, signal) => runSourcingScan(job, signal),
  sourcing_request: (job, signal) => runSourcingRequest(job, signal),
  // Agents corporate (IT Vision B2B)
  quote_draft: (job) => runQuoteDraft(String(job._id), job.refId),
  contract_renewal: (job) => runContractRenewal(String(job._id), job.refId),
  client_digest: (job) => runClientDigest(String(job._id), job.refId).then(() => undefined),
  // Agents DDM+ (marketplace)
  group_order_rescue: (job) => runGroupRescue(String(job._id), job.refId),
  group_order_seeding: (job) => runGroupSeeding(String(job._id), job.refId),
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
  const job = await claimAgentJob(allowedTypes)
  if (!job) return false

  running++
  const pool = TYPE_POOL[job.type] || job.type
  runningByPool.set(pool, (runningByPool.get(pool) || 0) + 1)
  const runner = RUNNERS[job.type]
  const controller = new AbortController()
  let heartbeatRunning = false
  const heartbeat = setInterval(() => {
    if (heartbeatRunning) return
    heartbeatRunning = true
    void heartbeatAgentJob(String(job._id), job.attempts)
      .then(owned => {
        if (!owned) {
          clearInterval(heartbeat)
          controller.abort(new Error('Tentative du worker perdue'))
        }
      })
      .catch(error => {
        clearInterval(heartbeat)
        console.error(`[agent-worker] heartbeat ${job._id} failed:`, error)
        controller.abort(new Error('Impossible de renouveler le battement du worker'))
      })
      .finally(() => { heartbeatRunning = false })
  }, HEARTBEAT_MS)
  heartbeat.unref()
  Promise.resolve().then(() => runner(job, controller.signal))
    .catch(async (e: any) => {
      console.error(`[agent-worker] job ${job._id} (${job.type}) failed:`, e?.message)
      const attempts = job.attempts ?? 1
      try {
        await AgentJob.updateOne(
          { _id: job._id, status: 'running', attempts: job.attempts },
          attempts < AGENT_MAX_ATTEMPTS
            ? { $set: { status: 'pending', runAfter: new Date(Date.now() + attempts * 30_000), error: e?.message } }
            : { $set: { status: 'failed', error: e?.message } }
        )
      } catch (e2) {
        console.error('[agent-worker] failed to update job:', e2)
      }
    })
    .finally(() => {
      clearInterval(heartbeat)
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
  const recoveryTypes = Object.keys(RUNNERS).filter(type => ENABLED_TYPES.length === 0 || ENABLED_TYPES.includes(type))
  let polling = false
  let lastRecoveryAt = 0
  const loop = async () => {
    if (polling) return
    polling = true
    try {
      await connectMongoose()
      if (Date.now() - lastRecoveryAt >= RECOVERY_MS) {
        const recovered = await recoverStaleAgentJobs(recoveryTypes)
        lastRecoveryAt = Date.now()
        if (recovered.requeued || recovered.failed) {
          console.log(`[agent-worker] reprise : ${recovered.requeued} en attente, ${recovered.failed} en echec`)
        }
      }
      // Dépile jusqu'à la concurrence max — chaque job tourne en tâche de fond
      while (running < CONCURRENCY && (await tick())) { /* drain */ }
    } catch (e) {
      console.error('[agent-worker] tick error:', e)
    } finally {
      polling = false
    }
  }
  setInterval(loop, POLL_MS).unref()
  void loop()
  console.log(`[agent-worker] démarré — poll ${POLL_MS}ms, concurrence ${CONCURRENCY}, types: ${ENABLED_TYPES.length ? ENABLED_TYPES.join(',') : 'tous'}`)
}
