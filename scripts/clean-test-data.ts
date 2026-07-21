/**
 * Nettoyage des données de test du flux Xeuy Bi.
 * Run:
 *   npx tsx scripts/clean-test-data.ts                  -> dry-run
 *   npx tsx scripts/clean-test-data.ts --confirm        -> suppression réelle
 *   npx tsx scripts/clean-test-data.ts --confirm --older-than-days 1 --statuses created,broadcasted,pending_offers,expired,cancelled
 */
import mongoose from 'mongoose'
import { ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/itvision'

const COLLECTIONS = {
  requests: 'servicerequests',
  offers: 'offers',
  chatMessages: 'chatmessages',
  missionUnlocks: 'missionunlocks',
  visibilityDispatches: 'visibilitydispatches',
  scheduledTasks: 'scheduledtasks',
  serviceReviews: 'servicereviews',
  payments: 'payments',
}

function parseArgs() {
  const args = process.argv.slice(2)
  const confirm = args.includes('--confirm')
  const dryRun = !confirm

  const olderThanArg = args.find(a => a.startsWith('--older-than-days='))
  const olderThanDays = olderThanArg ? Number(olderThanArg.split('=')[1]) : 0

  const statusesArg = args.find(a => a.startsWith('--statuses='))
  const statuses = statusesArg
    ? statusesArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
    : ['created', 'pending_offers', 'broadcasted', 'expired', 'cancelled']

  return { confirm, dryRun, olderThanDays, statuses }
}

async function main() {
  const { confirm, dryRun, olderThanDays, statuses } = parseArgs()
  await mongoose.connect(MONGO_URI)
  const db = mongoose.connection.db!
  console.log(`Connected to ${mongoose.connection.name || MONGO_URI}\n`)
  console.log(`Mode: ${confirm ? 'SUPRESSION' : 'DRY-RUN'}`)
  console.log(`Statuts ciblés: ${statuses.join(', ')}`)
  console.log(`Âge minimum: ${olderThanDays > 0 ? olderThanDays + ' jour(s)' : 'toutes dates'}\n`)

  const cutoff = olderThanDays > 0 ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) : null
  const filter: any = { status: { $in: statuses } }
  if (cutoff) filter.createdAt = { $lte: cutoff }

  const requestCol = db.collection(COLLECTIONS.requests)
  const requests = await requestCol.find(filter, { projection: { _id: 1 } }).toArray()
  const requestIds = requests.map(r => r._id as ObjectId)

  if (requestIds.length === 0) {
    console.log('Aucune demande correspondante trouvée.')
    await mongoose.disconnect()
    return
  }

  console.log(`${requestIds.length} demande(s) concernée(s).\n`)

  const relatedFilters = requestIds.map(id => ({ requestId: id }))
  const orQuery = relatedFilters.length > 1 ? { $or: relatedFilters } : relatedFilters[0]

  const counts: Record<string, number> = {
    requests: requestIds.length,
  }

  for (const [name, collName] of Object.entries(COLLECTIONS).filter(([k]) => k !== 'requests')) {
    // Pour les paiements, ne supprimer que ceux liés à une demande Xeuy (requestId présent)
    const q = name === 'payments' ? { ...orQuery, requestId: { $exists: true, $ne: null } } : orQuery
    counts[name] = await db.collection(collName).countDocuments(q)
  }

  console.log('Compteurs :')
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  - ${k}: ${v}`)
  }

  if (dryRun) {
    console.log('\nAucune suppression effectuée (dry-run).')
    console.log('Relancez avec --confirm pour supprimer réellement.')
    await mongoose.disconnect()
    return
  }

  console.log('\nSuppression en cours...')
  await requestCol.deleteMany({ _id: { $in: requestIds } })

  for (const [name, collName] of Object.entries(COLLECTIONS).filter(([k]) => k !== 'requests')) {
    const q = name === 'payments' ? { ...orQuery, requestId: { $exists: true, $ne: null } } : orQuery
    const res = await db.collection(collName).deleteMany(q)
    console.log(`  ✓ ${name}: ${res.deletedCount} supprimé(s)`)
  }

  console.log(`\nNettoyage terminé (${requestIds.length} demande(s) supprimée(s)).`)
  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
