import dotenv from 'dotenv'
dotenv.config({ path: '.env.worker' })
import mongoose from 'mongoose'

async function main() {
  const uri = process.env.MONGODB_URI || ''
  const masked = uri.replace(/:\/\/[^@]+@/, '://***@')
  console.log('URI:', masked)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  const db = mongoose.connection.db!
  const admin = db.admin()
  const dbs = await admin.listDatabases().catch(() => null)
  const jobs = await db.collection('agentjobs').countDocuments().catch(() => -1)
  const pending = await db.collection('agentjobs').countDocuments({ status: 'pending' }).catch(() => -1)
  const srs = await db.collection('sourcingrequests').countDocuments().catch(() => -1)
  console.log(`connecté — agentjobs:${jobs} (pending:${pending}) sourcingrequests:${srs}`)
  if (dbs) console.log('bases:', dbs.databases.map((d: any) => d.name).join(', '))
  await mongoose.disconnect()
  process.exit(0)
}
main().catch(e => { console.error('CONNEXION ÉCHOUÉE:', e.message); process.exit(1) })
