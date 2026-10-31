import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ApiAuthError, authErrorResponse } from '@/lib/api-auth'
import Technician from '@/lib/models/Technician'
import type { ProjectTask } from '@/lib/projects/workflow'
import {
  assertProjectRead,
  canAdvanceTask,
  canManageProject,
  projectTeamIds,
  resolveProjectActor,
  type ProjectAccess,
} from '@/lib/projects/team'
import { loadProjectState, MAX_TASKS, mutateProject, ProjectError, sanitizeTask, type JournalAuthor, type ProjectState } from '@/lib/projects/tasks'
import { notifyTechnician } from '@/lib/tech/notify-technician'

export const dynamic = 'force-dynamic'

/** Champs qu'un membre (non responsable) peut changer sur sa tâche : il la fait avancer, il ne la réorganise pas. */
const MEMBER_FIELDS = ['status', 'order'] as const

async function guard(request: NextRequest, params: Promise<{ id: string }>) {
  const actor = await resolveProjectActor(request)
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) throw new ProjectError('Projet invalide', 400)
  await connectMongoose()
  const state = await loadProjectState(id)
  if (!state) throw new ProjectError('Projet introuvable', 404)
  return { id, state, access: assertProjectRead(actor, state) }
}

function requireWrite(access: ProjectAccess) {
  if (access.actor.kind === 'reader') throw new ApiAuthError('Lecture seule', 403)
}

function requireManage(access: ProjectAccess) {
  if (!canManageProject(access)) throw new ApiAuthError('Réservé à l’administrateur ou au responsable du projet', 403)
}

async function teamNames(state: Pick<ProjectState, 'leadTechnicianId' | 'technicianIds'>) {
  const ids = projectTeamIds(state).filter(x => mongoose.isValidObjectId(x))
  const techs = ids.length ? await Technician.find({ _id: { $in: ids } }).select('name').lean() as any[] : []
  return new Map<string, string>(techs.map(t => [String(t._id), t.name]))
}

function authorOf(access: ProjectAccess): JournalAuthor {
  const { actor } = access
  return actor.kind === 'technician'
    ? { name: actor.name, role: 'TECHNICIAN', technicianId: actor.techId }
    : { name: actor.name, role: 'ADMIN' }
}

/** Prévient le technicien à qui l'on vient d'attribuer une tâche (sauf s'il se l'attribue lui-même). */
function notifyAssignments(id: string, projectName: string | undefined, before: ProjectTask[], after: ProjectTask[], access: ProjectAccess) {
  const self = access.actor.kind === 'technician' ? access.actor.techId : ''
  const prev = new Map(before.map(t => [t.id, t.assigneeId]))
  for (const t of after) {
    if (!t.assigneeId || t.assigneeId === self || prev.get(t.id) === t.assigneeId) continue
    void notifyTechnician(t.assigneeId, {
      title: `Nouvelle tâche : ${t.title}`,
      message: `Projet ${projectName || ''}`.trim(),
      actionUrl: `/tech-interface?tab=projets&projet=${id}`,
      metadata: { projectId: id, taskId: t.id },
    })
  }
}

function fail(error: any, fallback: string) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  if (error instanceof ProjectError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { state } = await guard(request, params)
    return NextResponse.json({ success: true, tasks: state.tasks })
  } catch (error) {
    return fail(error, 'Erreur de chargement des tâches')
  }
}

/** POST { title, description?, status?, priority?, assigneeId?, dueDate?, milestoneId? } — admin ou responsable */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, state, access } = await guard(request, params)
    requireManage(access)
    const body = await request.json().catch(() => ({}))
    const team = await teamNames(state)
    const task = sanitizeTask(body, undefined, team)
    if (!task.title) throw new ProjectError('Titre requis', 400)
    const saved = await mutateProject(id, s => {
      if (s.tasks.length >= MAX_TASKS) throw new ProjectError(`Limite de ${MAX_TASKS} tâches atteinte`, 409)
      task.order = Math.max(0, ...s.tasks.filter(t => t.status === task.status).map(t => t.order + 1))
      return { tasks: [...s.tasks, task] }
    }, authorOf(access))
    notifyAssignments(id, state.name, state.tasks, saved.tasks, access)
    return NextResponse.json({ success: true, task, ...saved }, { status: 201 })
  } catch (error) {
    return fail(error, 'Création de la tâche impossible')
  }
}

/**
 * PATCH { taskId, ...champs } — modifie une tâche
 * PATCH { moves: [{ id, status, order }] } — déplacement Kanban (colonnes et ordre)
 *
 * Membre de l'équipe : uniquement statut/ordre de ses tâches ; une tâche non attribuée qu'il fait avancer lui revient.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, state, access } = await guard(request, params)
    requireWrite(access)
    const manage = canManageProject(access)
    const selfId = access.actor.kind === 'technician' ? access.actor.techId : undefined
    const body = await request.json().catch(() => ({}))
    const team = await teamNames(state)

    const advance = (t: ProjectTask, patch: Record<string, unknown>) => {
      if (!canAdvanceTask(access, t)) throw new ProjectError(`« ${t.title} » est attribuée à un autre technicien`, 403)
      const allowed = manage ? patch : Object.fromEntries(MEMBER_FIELDS.filter(k => patch[k] !== undefined).map(k => [k, patch[k]]))
      const next = sanitizeTask(allowed, t, team)
      // Un membre qui fait avancer une tâche libre la prend en charge
      if (!manage && selfId && !t.assigneeId && next.status !== t.status) {
        next.assigneeId = selfId
        next.assignee = team.get(selfId)
      }
      return next
    }

    const saved = await mutateProject(id, s => {
      if (Array.isArray(body?.moves)) {
        const moves = new Map<string, { status?: string; order?: number }>(
          body.moves.slice(0, MAX_TASKS).map((m: any) => [String(m?.id || ''), m])
        )
        return {
          tasks: s.tasks.map(t => {
            const m = moves.get(t.id)
            if (!m) return t
            // Réordonner une colonne touche les tâches voisines : seul le changement de statut est contrôlé
            if (!manage && (!m.status || m.status === t.status)) return { ...t, order: Number(m.order) || 0 }
            return advance(t, { status: m.status, order: m.order })
          }),
        }
      }
      const taskId = String(body?.taskId || '')
      const current = s.tasks.find(t => t.id === taskId)
      if (!current) throw new ProjectError('Tâche introuvable', 404)
      const updated = advance(current, body)
      if (!updated.title) throw new ProjectError('Titre requis', 400)
      return { tasks: s.tasks.map(t => (t.id === taskId ? updated : t)) }
    }, authorOf(access))
    notifyAssignments(id, state.name, state.tasks, saved.tasks, access)
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    return fail(error, 'Mise à jour de la tâche impossible')
  }
}

/** DELETE ?taskId=… — admin ou responsable */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, access } = await guard(request, params)
    requireManage(access)
    const taskId = new URL(request.url).searchParams.get('taskId') || ''
    const saved = await mutateProject(id, s => {
      if (!s.tasks.some(t => t.id === taskId)) throw new ProjectError('Tâche introuvable', 404)
      return { tasks: s.tasks.filter(t => t.id !== taskId) }
    })
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    return fail(error, 'Suppression de la tâche impossible')
  }
}
