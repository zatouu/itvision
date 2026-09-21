/**
 * Worker agent standalone — tourne SANS le serveur Next.js.
 *
 * Cas d'usage principal : veille sourcing 1688 depuis une IP résidentielle.
 * Le worker dépile les AgentJob de la base Mongo partagée — la prod (EC2)
 * enfile les jobs, cette machine les exécute avec son IP box.
 *
 * Commandes :
 *   npx tsx scripts/agent-worker.ts            # démarre (refuse si un worker tourne)
 *   npx tsx scripts/agent-worker.ts stop       # arrête le worker + balaie les orphelins
 *   npx tsx scripts/agent-worker.ts restart    # stop + start
 *   npx tsx scripts/agent-worker.ts status     # état du worker
 *
 * Cycle de vie :
 * - PID file data/agent-worker.pid — empêche les doubles instances qui
 *   claîmeraient des jobs avec du code périmé (orphelins de shells tués).
 * - `stop` balaie AUSSI tout process node « agent-worker.ts » (orphelins
 *   hérités d'avant le PID file).
 * - SIGINT/SIGTERM → fermeture propre (navigateur + Mongo + pid file).
 * - Les jobs restés 'running' après un kill sont remis en file par le
 *   mécanisme de récupération du worker (>15 min).
 *
 * Usage local :
 *   1. .env.local → MONGODB_URI (prod ou tunnel SSH :
 *      ssh -L 27017:localhost:27017 user@ec2)
 *   2. npx playwright install chromium   (une fois)
 *   3. AGENT_WORKER_TYPES=sourcing_scan,sourcing_request \
 *      npx tsx scripts/agent-worker.ts
 *
 * Login 1688 (une fois) : npx tsx scripts/browser-login.ts
 * Sans AGENT_WORKER_TYPES, le worker prend TOUS les types.
 */

import dotenv from 'dotenv'
// WORKER_ENV_FILE permet de pointer une env dédiée (ex: .env.worker avec
// MONGODB_URI vers la prod via tunnel SSH) sans toucher à .env.local.
dotenv.config({ path: process.env.WORKER_ENV_FILE || '.env.local' })
dotenv.config() // .env en fallback pour les clés manquantes
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const PID_FILE = path.resolve(process.cwd(), 'data', 'agent-worker.pid')
const cmd = process.argv[2] || 'start'

function readPidFile(): { pid: number; startedAt?: string } | null {
  try {
    const raw = JSON.parse(fs.readFileSync(PID_FILE, 'utf8'))
    return typeof raw?.pid === 'number' ? raw : null
  } catch {
    return null
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function writePidFile() {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true })
  fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }))
}

function removePidFile() {
  try { fs.unlinkSync(PID_FILE) } catch {}
}

/** PID de tous les process node dont la ligne de commande contient « agent-worker ». */
function findWorkerPids(): number[] {
  try {
    const out =
      process.platform === 'win32'
        ? execSync(
            'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*agent-worker*\' } | Select-Object -ExpandProperty ProcessId"',
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
          )
        : execSync('pgrep -f "agent-worker"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] })
    return out
      .split(/\r?\n/)
      .map((l) => parseInt(l.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

/** PID du process courant + tous ses ancêtres (npx → tsx → node).
 *  Sans ça, `stop` tuerait son propre wrapper npx. */
function selfAndAncestors(): Set<number> {
  const out = new Set<number>([process.pid])
  let pid: number = process.ppid
  for (let i = 0; i < 8 && pid > 0 && !out.has(pid); i++) {
    out.add(pid)
    try {
      const ppid =
        process.platform === 'win32'
          ? execSync(
              `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').ParentProcessId"`,
              { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
            ).trim()
          : execSync(`ps -o ppid= -p ${pid}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
      pid = parseInt(ppid, 10) || 0
    } catch {
      break
    }
  }
  return out
}

function stopWorkers(): number {
  const self = selfAndAncestors()
  const fromFile = readPidFile()?.pid
  const pids = new Set<number>([...findWorkerPids(), ...(fromFile ? [fromFile] : [])])
  let killed = 0
  for (const pid of pids) {
    if (self.has(pid) || !isAlive(pid)) continue
    try {
      process.kill(pid, 'SIGTERM')
      killed++
      console.log(`[agent-worker] process ${pid} arrêté`)
    } catch (e: any) {
      console.warn(`[agent-worker] kill ${pid} échoué:`, e?.message)
    }
  }
  removePidFile()
  return killed
}

async function start() {
  const existing = readPidFile()
  if (existing && isAlive(existing.pid)) {
    console.error(`[agent-worker] un worker tourne déjà (PID ${existing.pid}, depuis ${existing.startedAt || '?'}).`)
    console.error('  → `npx tsx scripts/agent-worker.ts stop` ou `restart` pour le remplacer.')
    process.exit(1)
  }
  // PID file périmé (process mort sans cleanup) — on balaie quand même les
  // éventuels orphelins non trackés puis on prend la place.
  if (existing) {
    console.log('[agent-worker] PID file périmé — nettoyage')
    stopWorkers()
  }

  writePidFile()

  const cleanup = async () => {
    removePidFile()
    try {
      const { closeSourcingBrowser } = await import('@/lib/agents/sourcing/graph')
      await closeSourcingBrowser()
    } catch {}
    try {
      const mongoose = (await import('mongoose')).default
      await mongoose.disconnect()
    } catch {}
    process.exit(0)
  }
  process.on('SIGINT', () => void cleanup())
  process.on('SIGTERM', () => void cleanup())
  process.on('exit', removePidFile)

  process.env.AGENT_WORKER_ENABLED = 'true'
  const { connectMongoose } = await import('@/lib/mongoose')
  const { startAgentWorker } = await import('@/lib/agents/worker')
  await connectMongoose()
  startAgentWorker()
  const types = process.env.AGENT_WORKER_TYPES || '(tous)'
  console.log(`[agent-worker] standalone prêt — PID ${process.pid} — types: ${types} — Ctrl+C pour quitter`)
}

async function main() {
  switch (cmd) {
    case 'stop': {
      const n = stopWorkers()
      console.log(n > 0 ? `[agent-worker] ${n} process arrêté(s)` : '[agent-worker] aucun worker en cours')
      return
    }
    case 'restart': {
      stopWorkers()
      await start()
      return
    }
    case 'status': {
      const p = readPidFile()
      if (p && isAlive(p.pid)) {
        console.log(`[agent-worker] en cours — PID ${p.pid}, depuis ${p.startedAt || '?'}`)
      } else {
        const self = selfAndAncestors()
        const stray = findWorkerPids().filter((pid) => !self.has(pid))
        console.log(`[agent-worker] arrêté${stray.length ? ` — ${stray.length} orphelin(s) détecté(s): ${stray.join(', ')} (stop pour nettoyer)` : ''}`)
      }
      return
    }
    case 'start':
    default:
      await start()
  }
}

main().catch((e) => {
  console.error('[agent-worker] échec démarrage:', e)
  process.exit(1)
})
