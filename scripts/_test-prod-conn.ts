import dotenv from 'dotenv'
dotenv.config({ path: '.env.worker' })
import mongoose from 'mongoose'

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 8000 })
  const db = mongoose.connection.db!
  const job = await db.collection('agentjobs').findOne({ 'payload.query': /bluetooth|écouteurs/i }, { sort: { createdAt: -1 } }) as any
  console.log('job:', job?.payload?.query, job?.status, '→', JSON.stringify(job?.result || {}))
  const recent = await db.collection('products').find({
    createdAt: { $gte: new Date(Date.now() - 2 * 3600 * 1000) }
  }).sort({ createdAt: -1 })
    .project({ name: 1, 'sourcing.platform': 1, price: 1, price1688: 1, price1688Currency: 1 })
    .toArray()
  console.log(`\n— ${recent.length} produits créés <2h —`)
  recent.forEach(d => console.log(` [${(d as any).sourcing?.platform || '?'}] ${(d.name || '').slice(0, 60)}  ${d.price1688} ${d.price1688Currency || ''} → ${d.price} F`))
  const mods = await db.collection('agentjobs').countDocuments({ type: 'product_moderation', status: /pending|running/ })
  const modsDone = await db.collection('agentjobs').countDocuments({ type: 'product_moderation', status: 'waiting_human' })
  console.log(`\nmoderation: ${mods} en file, ${modsDone} en attente humaine`)
  await mongoose.disconnect()
  process.exit(0)
}
main().catch(e => { console.error('ERR:', e.message); process.exit(1) })
