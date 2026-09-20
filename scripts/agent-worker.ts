/**
 * Worker agent standalone — tourne SANS le serveur Next.js.
 *
 * Cas d'usage principal : veille sourcing 1688 depuis une IP résidentielle.
 * Le worker dépile les AgentJob de la base Mongo partagée — la prod (EC2)
 * enfile les scans, cette machine les exécute avec son IP box.
 *
 * Usage local :
 *   1. Copier .env.local → renseigner MONGODB_URI (prod) — ou tunnel SSH :
 *        ssh -L 27017:localhost:27017 user@ec2  puis MONGODB_URI=mongodb://localhost:27017/itvision_db
 *   2. npx playwright install chromium   (une fois)
 *   3. AGENT_WORKER_ENABLED=true AGENT_WORKER_TYPES=sourcing_scan \
 *      npx tsx scripts/agent-worker.ts
 *
 * Pour authentifier la session 1688 (une fois) :
 *   SCRAPER_HEADLESS=false npx tsx scripts/agent-worker.ts
 *   → le navigateur s'ouvre visible : connectez-vous à 1688 manuellement,
 *     la session est persistée dans SCRAPER_PROFILE_DIR pour les runs suivants.
 *
 * Sans AGENT_WORKER_TYPES, le worker prend TOUS les types (comportement défaut).
 */

import 'dotenv/config'
import { connectMongoose } from '@/lib/mongoose'
import { startAgentWorker } from '@/lib/agents/worker'

async function main() {
  process.env.AGENT_WORKER_ENABLED = 'true'
  await connectMongoose()
  startAgentWorker()
  const types = process.env.AGENT_WORKER_TYPES || '(tous)'
  console.log(`[agent-worker] standalone prêt — types: ${types} — Ctrl+C pour quitter`)
}

main().catch((e) => {
  console.error('[agent-worker] échec démarrage:', e)
  process.exit(1)
})
