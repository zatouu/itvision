/**
 * Migration du cycle de vie des projets (idempotente).
 *
 * 1. Remplace l'ancien validateur $jsonSchema de `projects` (statut limité à
 *    pending|in_progress|completed|cancelled, value en chaîne) par un validateur
 *    aligné sur le workflow (src/lib/projects/workflow.ts).
 * 2. Normalise les données : statut historique → phase détaillée, value chaîne → nombre,
 *    montant du projet = somme des devis acceptés liés.
 *
 * collMod exige un compte disposant de dbAdmin (root) : l'URI applicative (readWrite) ne suffit pas.
 *   MONGODB_URI="mongodb://admin:***@mongodb:27017/itvision_db?authSource=admin&replicaSet=rs0" \
 *     node .ops/migrate-projects-workflow.cjs --dry-run | --apply
 */
import { MongoClient } from 'mongodb'
import AdminQuote from '../src/lib/models/AdminQuote'
import { PROJECT_STATUSES, normalizeProjectStatus } from '../src/lib/projects/workflow'

const NEW_VALIDATOR = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'status'],
    properties: {
      name: { bsonType: 'string' },
      status: { bsonType: 'string', enum: [...PROJECT_STATUSES] },
      value: { bsonType: ['double', 'int', 'long', 'decimal', 'string', 'null'] },
      progress: { bsonType: ['double', 'int', 'long', 'null'], minimum: 0, maximum: 100 },
      tasks: { bsonType: ['array', 'null'] },
      documents: { bsonType: ['array', 'null'] },
      timeline: { bsonType: ['array', 'null'] },
    },
  },
}

function isLegacyValidator(validator: any) {
  const statusEnum: unknown = validator?.$jsonSchema?.properties?.status?.enum
  if (!Array.isArray(statusEnum)) return false
  return PROJECT_STATUSES.some(s => !statusEnum.includes(s))
}

async function main() {
  const args = process.argv.slice(2)
  if (args.some(a => !['--apply', '--dry-run'].includes(a)) || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage : migrate-projects-workflow [--dry-run | --apply]')
  }
  const apply = args.includes('--apply')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI doit être fournie explicitement')

  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
  try {
    await client.connect()
    const db = client.db()
    const info = (await db.listCollections({ name: 'projects' }).toArray())[0] as any
    if (!info) {
      console.log('Collection projects absente : rien à migrer.')
      return
    }

    // 1. Validateur
    const legacy = isLegacyValidator(info.options?.validator)
    if (legacy) {
      console.log('Validateur historique détecté (statuts limités, value en chaîne) → remplacement par le validateur du workflow.')
      if (apply) {
        try {
          await db.command({ collMod: 'projects', validator: NEW_VALIDATOR, validationLevel: 'moderate', validationAction: 'error' })
          console.log('  ✓ validateur remplacé')
        } catch (err: any) {
          if (err?.code === 13 || /not authorized/i.test(String(err?.message))) {
            throw new Error('collMod refusé : relancez avec une URI du compte root Mongo (authSource=admin). Aucune donnée modifiée.')
          }
          throw err
        }
      }
    } else {
      console.log('Validateur déjà compatible (ou absent) : aucune modification du schéma.')
    }

    // 2. Données
    const quotes = db.collection(AdminQuote.collection.name)
    const accepted = await quotes.aggregate([
      { $match: { status: 'accepted', projectId: { $exists: true, $ne: null } } },
      { $group: { _id: '$projectId', total: { $sum: '$total' } } },
    ]).toArray()
    const contracted = new Map(accepted.map((a: any) => [String(a._id), Math.round(Number(a.total) || 0)]))
    const sentProjects = new Set(
      (await quotes.distinct('projectId', { status: 'sent', projectId: { $exists: true, $ne: null } })).map(String)
    )

    const projects = await db.collection('projects').find({}, { projection: { status: 1, value: 1, progress: 1, quote: 1, name: 1 } }).toArray()
    let changed = 0
    const counts: Record<string, number> = {}
    for (const p of projects as any[]) {
      const id = String(p._id)
      const set: Record<string, any> = {}
      let status = normalizeProjectStatus(p.status)
      if (p.status === 'pending') {
        status = contracted.has(id) || p.quote?.status === 'approved'
          ? 'approved'
          : sentProjects.has(id) || p.quote?.status === 'sent' ? 'quoted' : 'lead'
      }
      if (status !== p.status) set.status = status
      const value = contracted.get(id) ?? (typeof p.value === 'string' ? Math.round(parseFloat(p.value) || 0) : p.value)
      if (value !== undefined && value !== null && value !== p.value) set.value = Math.round(Number(value) || 0)
      if (typeof p.progress === 'number' && !Number.isInteger(p.progress)) set.progress = Math.max(0, Math.min(100, Math.round(p.progress)))
      if (Object.keys(set).length === 0) continue
      changed++
      const key = `${p.status ?? '∅'} → ${set.status ?? p.status}`
      counts[key] = (counts[key] || 0) + 1
      console.log(`  ${apply ? '✓' : '·'} ${p.name || id} : ${JSON.stringify(set)}`)
      if (apply) await db.collection('projects').updateOne({ _id: p._id }, { $set: { ...set, updatedAt: new Date() } })
    }
    console.log(`\n${projects.length} projet(s) examiné(s), ${changed} à normaliser.`)
    Object.entries(counts).forEach(([k, n]) => console.log(`  ${k} : ${n}`))
    if (legacy && !apply) console.log('\nDry-run : relancez avec --apply (URI root) pour appliquer.')
    else if (!apply && changed) console.log('\nDry-run : relancez avec --apply pour appliquer.')
    else console.log(apply ? '\nMigration appliquée.' : '\nRien à faire.')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error('Migration refusée :', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
