import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ApiAuthError, authErrorResponse } from '@/lib/api-auth'
import Technician from '@/lib/models/Technician'
import { projectsCollection } from '@/lib/projects/persistence'
import { assertProjectRead, loadProjectTeam, projectTeamIds, resolveProjectActor } from '@/lib/projects/team'
import { journalEntry, MAX_JOURNAL, ProjectError } from '@/lib/projects/tasks'
import { emitToTechnician, notifyTechnician } from '@/lib/tech/notify-technician'
import { emitProjectEvent } from '@/lib/socket-emit'

export const dynamic = 'force-dynamic'

const MAX_TEAM = 30

async function load(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new ProjectError('Projet invalide', 400)
  await connectMongoose()
  const project = await projectsCollection().findOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { projection: { name: 1, leadTechnicianId: 1, technicianIds: 1, tasks: 1, journal: 1 } }
  ) as any
  if (!project) throw new ProjectError('Projet introuvable', 404)
  return project
}

function fail(error: any, fallback: string) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  if (error instanceof ProjectError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

/** GET — équipe du projet (admin, lecteurs, membres de l'équipe) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await resolveProjectActor(request)
    const { id } = await params
    const project = await load(id)
    const { teamRole } = assertProjectRead(actor, project)
    return NextResponse.json({ success: true, team: await loadProjectTeam(project), myRole: teamRole })
  } catch (error) {
    return fail(error, 'Chargement de l’équipe impossible')
  }
}

/**
 * PUT { leadTechnicianId: string | null, technicianIds: string[] } — admin.
 * Le responsable fait toujours partie de l'équipe. Une équipe vide est valide : l'admin pilote seul.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await resolveProjectActor(request)
    if (actor.kind !== 'admin') throw new ApiAuthError('Réservé à l’administrateur', 403)
    const { id } = await params
    const project = await load(id)
    const body = await request.json().catch(() => ({}))

    const lead = body?.leadTechnicianId ? String(body.leadTechnicianId) : ''
    const wanted = Array.from(new Set([lead, ...(Array.isArray(body?.technicianIds) ? body.technicianIds.map(String) : [])].filter(Boolean)))
    if (wanted.length > MAX_TEAM) throw new ProjectError(`Équipe limitée à ${MAX_TEAM} techniciens`, 400)
    if (wanted.some(x => !mongoose.isValidObjectId(x))) throw new ProjectError('Technicien invalide', 400)

    const techs = wanted.length ? await Technician.find({ _id: { $in: wanted } }).select('name isActive').lean() as any[] : []
    const names = new Map(techs.map(t => [String(t._id), t.name as string]))
    const missing = wanted.filter(x => !names.has(x))
    if (missing.length) throw new ProjectError('Technicien introuvable', 404)
    const previous = new Set(projectTeamIds(project))
    const added = wanted.filter(x => !previous.has(x) && techs.find(t => String(t._id) === x)?.isActive === false)
    if (added.length) throw new ProjectError(`${names.get(added[0])} est désactivé : réactivez sa fiche avant de l’affecter`, 409)

    const prevLead = project.leadTechnicianId ? String(project.leadTechnicianId) : ''
    const removed = Array.from(previous).filter(x => !wanted.includes(x))
    const newcomers = wanted.filter(x => !previous.has(x))

    // Une tâche d'un technicien retiré redevient libre (elle ne disparaît pas des radars)
    const tasks = (project.tasks || []).map((t: any) => (t.assigneeId && removed.includes(t.assigneeId) ? { ...t, assigneeId: undefined, assignee: undefined } : t))
    const changes = [
      ...newcomers.map(x => `${names.get(x)} rejoint l’équipe${x === lead ? ' comme responsable' : ''}`),
      ...(lead && lead !== prevLead && previous.has(lead) ? [`${names.get(lead)} devient responsable`] : []),
      ...(!lead && prevLead ? ['Plus de responsable désigné'] : []),
      ...(removed.length ? [`${removed.length} technicien(s) retiré(s) de l’équipe`] : []),
    ]
    const entry = changes.length ? journalEntry({ name: actor.name, role: 'ADMIN' }, { kind: 'note', message: changes.join(' · ') }) : null

    await projectsCollection().updateOne(
      { _id: project._id },
      {
        $set: {
          leadTechnicianId: lead ? new mongoose.Types.ObjectId(lead) : null,
          technicianIds: wanted.map(x => new mongoose.Types.ObjectId(x)),
          tasks,
          updatedAt: new Date(),
        },
        $inc: { tasksVersion: 1 },
        ...(entry ? { $push: { journal: { $each: [entry], $slice: -MAX_JOURNAL } } } : {}),
      } as any
    )

    const url = `/tech-interface?tab=projets&projet=${id}`
    for (const x of newcomers) {
      void notifyTechnician(x, {
        title: x === lead ? `Responsable du projet ${project.name}` : `Affecté au projet ${project.name}`,
        message: x === lead ? 'Vous pilotez ce projet : tâches, jalons et journal de chantier.' : 'Retrouvez les tâches et le journal du projet dans votre espace.',
        actionUrl: url, metadata: { projectId: id },
      })
      void emitToTechnician(x, 'corp:project:assigned', { projectId: id, role: x === lead ? 'lead' : 'member' })
    }
    if (lead && lead !== prevLead && previous.has(lead)) {
      void notifyTechnician(lead, { title: `Responsable du projet ${project.name}`, message: 'Vous pilotez désormais ce projet.', actionUrl: url, metadata: { projectId: id } })
    }
    for (const x of removed) {
      void notifyTechnician(x, { type: 'warning', title: `Retiré du projet ${project.name}`, message: 'Le projet ne figure plus dans votre espace.', metadata: { projectId: id } })
    }
    emitProjectEvent(id, 'corp:project:updated', { team: true })

    const fresh = await load(id)
    return NextResponse.json({ success: true, team: await loadProjectTeam(fresh) })
  } catch (error) {
    return fail(error, 'Mise à jour de l’équipe impossible')
  }
}
