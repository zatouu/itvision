/**
 * Test E2E local de l'agent sourcing_request (« trouvez-moi »).
 * Usage : npx tsx scripts/_test-sourcing-request.ts
 *
 * Crée une SourcingRequest avec une URL directe 1688 + enfile le job.
 * Le worker (AGENT_WORKER_TYPES=sourcing_request npx tsx scripts/agent-worker.ts)
 * le dépile. Ensuite : npx tsx scripts/_test-sourcing-request.ts resume
 * pour simuler l'approbation admin et vérifier le brouillon de proposition.
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import mongoose from 'mongoose'
import { connectMongoose } from '../src/lib/mongoose'
import SourcingRequest, { generatePublicToken, generateSourcingReference, computeSlaDueAt } from '../src/lib/models/SourcingRequest'
import { enqueueAgentJob } from '../src/lib/agents/queue'

const DIRECT_URL = process.argv[4] || 'https://detail.1688.com/offer/738066458207.html'

async function main() {
  await connectMongoose()
  const mode = process.argv[2] || 'create'

  if (mode === 'resume') {
    // Simule l'approbation admin : reprend le graphe figé
    const { resumeSourcingRequest } = await import('../src/lib/agents/sourcing/request-run')
    const AgentDecision = (await import('../src/lib/models/AgentDecision')).default
    const decision = await AgentDecision.findOne({ type: 'sourcing_request', status: 'pending' }).sort({ createdAt: -1 })
    if (!decision) { console.log('aucune décision pending'); return }
    console.log('reprise décision', decision._id, 'runId', decision.runId)
    await resumeSourcingRequest(decision.runId, { action: 'approve', note: 'test local', decidedBy: 'test' })
    const req = await SourcingRequest.findById(decision.refId).lean() as any
    console.log('status:', req.status)
    console.log('proposal:', JSON.stringify(req.proposal, null, 2).slice(0, 1500))
    return
  }

  if (mode === 'check') {
    const req = await SourcingRequest.findOne().sort({ createdAt: -1 }).lean() as any
    console.log('status:', req.status)
    console.log('externalSearchResults:', (req.externalSearchResults || []).length)
    for (const r of req.externalSearchResults || []) {
      console.log('  -', r.title?.slice(0, 60), '| ¥' + r.price1688, '|', r.supplier)
    }
    console.log('proposal:', req.proposal ? 'OUI' : 'non')
    const AgentDecision = (await import('../src/lib/models/AgentDecision')).default
    const d = await AgentDecision.findOne({ type: 'sourcing_request' }).sort({ createdAt: -1 }).lean() as any
    console.log('decision:', d?.status, '| verdict:', d?.proposal?.verdict, '| raisons:', d?.proposal?.reasons)
    return
  }

  // mode create
  const isLink = process.argv[3] === 'link'
  const doc = await SourcingRequest.create({
    contactPhone: '+221770000000',
    isAnonymous: true,
    source: isLink ? 'link' : 'text',
    externalUrl: isLink ? DIRECT_URL : undefined,
    title: isLink ? 'Test agent — URL directe' : 'écouteurs bluetooth sans fil',
    description: 'Demande de test e2e pour l agent sourcing_request',
    qty: 2,
    status: 'new',
    slaDueAt: computeSlaDueAt(new Date()),
    publicToken: generatePublicToken(),
    reference: generateSourcingReference(),
    catalogMatches: [],
  })
  console.log('SourcingRequest créée:', doc._id, doc.reference)

  const job = await enqueueAgentJob('sourcing_request', String(doc._id), { source: 'link', hasExternalUrl: true })
  console.log('job:', job ? String(job._id) : 'déjà actif')
  await mongoose.disconnect()
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
