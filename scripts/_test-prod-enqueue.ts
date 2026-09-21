import dotenv from 'dotenv'
dotenv.config({ path: '.env.worker' })
import { connectMongoose } from '../src/lib/mongoose'
import mongoose from 'mongoose'

async function main() {
  await connectMongoose()
  const db = mongoose.connection.db!

  const req = await db.collection('sourcingrequests').insertOne({
    isAnonymous: true,
    contactPhone: '+221770000000',
    contactName: 'TEST E2E worker-local',
    source: 'text',
    title: 'TEST — écouteurs bluetooth sans fil A9 Pro',
    description: '[TEST PIPELINE] Écouteurs bluetooth sans fil type A9 Pro, boîtier chargeur. Test worker local→prod.',
    qty: 50,
    status: 'new',
    slaDueAt: new Date(Date.now() + 48 * 3600 * 1000),
    publicToken: 'test-e2e-' + Date.now(),
    reference: 'SR-TEST-' + Date.now().toString(36).toUpperCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log('SourcingRequest prod:', req.insertedId)

  const job = await db.collection('agentjobs').insertOne({
    type: 'sourcing_request',
    refId: String(req.insertedId),
    status: 'pending',
    runAfter: new Date(),
    attempts: 0,
    payload: { source: 'text', title: 'TEST — écouteurs bluetooth A9 Pro', hasImage: false, hasExternalUrl: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log('AgentJob prod:', job.insertedId)
  await mongoose.disconnect()
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
