import dotenv from 'dotenv'
dotenv.config({ path: '.env.worker' })
import mongoose from 'mongoose'

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 })
  const db = mongoose.connection.db!
  const query = process.argv[2] || 'écouteurs bluetooth sans fil'
  const r = await db.collection('agentjobs').insertOne({
    type: 'sourcing_scan',
    refId: query.toLowerCase(),
    payload: { query, category: 'Import Chine', maxItems: 10, groupBuyEligible: false },
    status: 'pending',
    runAfter: new Date(),
    attempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  console.log('job enfilé:', r.insertedId, '→', query)
  await mongoose.disconnect()
  process.exit(0)
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
