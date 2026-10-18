import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import { projectsCollection } from '@/lib/projects/persistence'
import {
  isTaskPriority,
  isTaskStatus,
  tasksProgress,
  TASK_STATUSES,
  type ProjectTask,
} from '@/lib/projects/workflow'

export const dynamic = 'force-dynamic'

const MAX_TASKS = 300

function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

function sanitize(raw: any, base?: ProjectTask): ProjectTask {
  const now = new Date()
  const status = isTaskStatus(raw?.status) ? raw.status : base?.status || 'todo'
  return {
    id: base?.id || new mongoose.Types.ObjectId().toString(),
    title: String(raw?.title ?? base?.title ?? '').trim().slice(0, 200),
    description: raw?.description !== undefined ? String(raw.description || '').slice(0, 4000) : base?.description,
    status,
    priority: isTaskPriority(raw?.priority) ? raw.priority : base?.priority || 'medium',
    assignee: raw?.assignee !== undefined ? String(raw.assignee || '').trim().slice(0, 120) || undefined : base?.assignee,
    dueDate: raw?.dueDate !== undefined ? toDate(raw.dueDate) : base?.dueDate ?? null,
    milestoneId: raw?.milestoneId !== undefined ? String(raw.milestoneId || '') || undefined : base?.milestoneId,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : base?.order ?? 0,
    createdAt: base?.createdAt || now,
    updatedAt: now,
    completedAt: status === 'done' ? (base?.status === 'done' ? base.completedAt || now : now) : null,
  }
}

async function loadTasks(id: string) {
  const project = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { tasks: 1, tasksVersion: 1 } }) as any
  if (!project) return null
  return { tasks: (project.tasks || []) as ProjectTask[], version: Number(project.tasksVersion || 0) }
}

class TaskError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

/**
 * Applique une modification au tableau avec verrou optimiste (tasksVersion) : en cas d'écriture
 * concurrente (deux déplacements rapprochés, deux admins), la modification est rejouée sur l'état frais.
 */
async function mutateTasks(id: string, change: (tasks: ProjectTask[]) => ProjectTask[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await loadTasks(id)
    if (!current) throw new TaskError('Projet introuvable', 404)
    const ordered = [...change(current.tasks)].sort((a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.order - b.order)
    const progress = tasksProgress(ordered)
    const res = await projectsCollection().updateOne(
      { _id: new mongoose.Types.ObjectId(id), ...(current.version ? { tasksVersion: current.version } : { tasksVersion: { $exists: false } }) },
      {
        $set: {
          tasks: ordered,
          tasksVersion: current.version + 1,
          'metrics.tasksTotal': ordered.length,
          'metrics.tasksCompleted': ordered.filter(t => t.status === 'done').length,
          ...(progress !== null ? { progress } : {}),
          updatedAt: new Date(),
        },
      }
    )
    if (res.matchedCount) return { tasks: ordered, progress }
  }
  throw new TaskError('Le tableau a été modifié simultanément, rechargez', 409)
}

async function guard(request: NextRequest, params: Promise<{ id: string }>, roles: readonly string[]) {
  await requireApiUser(request, roles)
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) throw new TaskError('Projet invalide', 400)
  await connectMongoose()
  return id
}

function fail(error: any, fallback: string) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  if (error instanceof TaskError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await guard(request, params, [...ADMIN_ROLES, 'ACCOUNTANT', 'TECHNICIAN'])
    const current = await loadTasks(id)
    if (!current) throw new TaskError('Projet introuvable', 404)
    return NextResponse.json({ success: true, tasks: current.tasks })
  } catch (error) {
    return fail(error, 'Erreur de chargement des tâches')
  }
}

/** POST { title, description?, status?, priority?, assignee?, dueDate?, milestoneId? } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await guard(request, params, ADMIN_ROLES)
    const body = await request.json().catch(() => ({}))
    const task = sanitize(body)
    if (!task.title) throw new TaskError('Titre requis', 400)
    const saved = await mutateTasks(id, tasks => {
      if (tasks.length >= MAX_TASKS) throw new TaskError(`Limite de ${MAX_TASKS} tâches atteinte`, 409)
      task.order = Math.max(0, ...tasks.filter(t => t.status === task.status).map(t => t.order + 1))
      return [...tasks, task]
    })
    return NextResponse.json({ success: true, task, ...saved }, { status: 201 })
  } catch (error) {
    return fail(error, 'Création de la tâche impossible')
  }
}

/**
 * PATCH { taskId, ...champs } — modifie une tâche
 * PATCH { moves: [{ id, status, order }] } — déplacement Kanban (colonnes et ordre)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await guard(request, params, ADMIN_ROLES)
    const body = await request.json().catch(() => ({}))
    const saved = await mutateTasks(id, tasks => {
      if (Array.isArray(body?.moves)) {
        const moves = new Map<string, { status?: string; order?: number }>(
          body.moves.slice(0, MAX_TASKS).map((m: any) => [String(m?.id || ''), m])
        )
        return tasks.map(t => {
          const m = moves.get(t.id)
          return m ? sanitize({ status: m.status, order: m.order }, t) : t
        })
      }
      const taskId = String(body?.taskId || '')
      const current = tasks.find(t => t.id === taskId)
      if (!current) throw new TaskError('Tâche introuvable', 404)
      const updated = sanitize(body, current)
      if (!updated.title) throw new TaskError('Titre requis', 400)
      return tasks.map(t => (t.id === taskId ? updated : t))
    })
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    return fail(error, 'Mise à jour de la tâche impossible')
  }
}

/** DELETE ?taskId=… */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await guard(request, params, ADMIN_ROLES)
    const taskId = new URL(request.url).searchParams.get('taskId') || ''
    const saved = await mutateTasks(id, tasks => {
      if (!tasks.some(t => t.id === taskId)) throw new TaskError('Tâche introuvable', 404)
      return tasks.filter(t => t.id !== taskId)
    })
    return NextResponse.json({ success: true, ...saved })
  } catch (error) {
    return fail(error, 'Suppression de la tâche impossible')
  }
}