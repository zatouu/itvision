/**
 * Équipe terrain des projets (idempotente, additive) : convertit l'ancien `assignedTo` (noms libres
 * ou User._id mélangés) en `technicianIds` (fiches Technician) et relie les tâches dont `assignee`
 * correspond à un membre (`assigneeId`). `assignedTo` est conservé tel quel ; le responsable
 * (`leadTechnicianId`) n'est jamais deviné : il se désigne depuis la fiche projet.
 *
 *   MONGODB_URI=... npx tsx scripts/migrate-project-team.ts --dry-run | --apply
 */
import { MongoClient, ObjectId } from 'mongodb'

const norm = (s: unknown) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

async function main() {
  const args = process.argv.slice(2)
  if (args.some(a => !['--apply', '--dry-run'].includes(a)) || (args.includes('--apply') && args.includes('--dry-run'))) {
    throw new Error('Usage : migrate-project-team [--dry-run | --apply]')
  }
  const apply = args.includes('--apply')
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI doit être fournie explicitement')

  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 })
  try {
    await client.connect()
    const db = client.db()
    const techs = await db.collection('technicians').find({}, { projection: { name: 1, email: 1 } }).toArray()
    const techById = new Map(techs.map(t => [String(t._id), t]))
    const techByEmail = new Map(techs.map(t => [norm(t.email), String(t._id)]))
    const techByName = new Map<string, string[]>()
    for (const t of techs) techByName.set(norm(t.name), [...(techByName.get(norm(t.name)) || []), String(t._id)])

    const resolve = async (value: string): Promise<string | null> => {
      if (ObjectId.isValid(value) && String(new ObjectId(value)) === value) {
        if (techById.has(value)) return value
        const user = await db.collection('users').findOne({ _id: new ObjectId(value) }, { projection: { email: 1 } })
        if (user?.email) return techByEmail.get(norm(user.email)) || null
      }
      if (value.includes('@')) return techByEmail.get(norm(value)) || null
      const byName = techByName.get(norm(value)) || []
      return byName.length === 1 ? byName[0] : null
    }

    const cursor = db.collection('projects').find(
      { $or: [{ 'assignedTo.0': { $exists: true } }, { 'tasks.assignee': { $exists: true, $nin: [null, ''] } }] },
      { projection: { name: 1, assignedTo: 1, technicianIds: 1, leadTechnicianId: 1, tasks: 1 } }
    )

    let scanned = 0, updated = 0
    const unmatched: string[] = []
    for await (const p of cursor) {
      scanned++
      const current = new Set<string>((p.technicianIds || []).map(String))
      const team = new Set<string>(current)
      for (const raw of (p.assignedTo || []) as string[]) {
        const value = String(raw || '').trim()
        if (!value) continue
        const id = await resolve(value)
        if (id) team.add(id)
        else unmatched.push(`${p.name} : « ${value} »`)
      }

      // Tâches : nom saisi librement → membre de l'équipe portant ce nom (sans ambiguïté)
      const teamByName = new Map<string, string[]>()
      for (const id of team) {
        const n = norm(techById.get(id)?.name)
        teamByName.set(n, [...(teamByName.get(n) || []), id])
      }
      let tasksChanged = 0
      const tasks = ((p.tasks || []) as any[]).map(t => {
        if (t.assigneeId || !t.assignee) return t
        const match = teamByName.get(norm(t.assignee)) || []
        if (match.length !== 1) return t
        tasksChanged++
        return { ...t, assigneeId: match[0], assignee: techById.get(match[0])?.name || t.assignee }
      })

      const added = [...team].filter(id => !current.has(id))
      if (!added.length && !tasksChanged) continue
      updated++
      console.log(`${apply ? '✔' : '•'} ${p.name} : +${added.length} technicien(s)${tasksChanged ? `, ${tasksChanged} tâche(s) reliée(s)` : ''}`)
      if (apply) {
        await db.collection('projects').updateOne(
          { _id: p._id },
          {
            $set: {
              technicianIds: [...team].map(id => new ObjectId(id)),
              ...(tasksChanged ? { tasks } : {}),
              ...(p.leadTechnicianId === undefined ? { leadTechnicianId: null } : {}),
            },
            ...(tasksChanged ? { $inc: { tasksVersion: 1 } } : {}),
          }
        )
      }
    }

    console.log(`\n${scanned} projet(s) examiné(s), ${updated} ${apply ? 'mis à jour' : 'à mettre à jour'}.`)
    if (unmatched.length) {
      console.log(`\n${unmatched.length} valeur(s) d'assignedTo sans fiche technicien correspondante (à affecter depuis la fiche projet) :`)
      for (const u of unmatched) console.log(`  - ${u}`)
    }
    if (!apply) console.log('\nDry-run : aucune écriture. Relancer avec --apply.')
  } finally {
    await client.close()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
