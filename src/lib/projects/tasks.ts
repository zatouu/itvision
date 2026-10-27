import mongoose from 'mongoose'
import { projectsCollection } from './persistence'
import {
  isTaskPriority,
  isTaskStatus,
  syncMilestonesWithTasks,
  tasksProgress,
  TASK_STATUSES,
  TASK_STATUS_META,
  type ProjectJournalEntry,
  type ProjectTask,
} from './workflow'
import { notifyProjectChange } from '@/lib/portal/project-notify'
import { emitProjectEvent } from '@/lib/socket-emit'

/**
 * Moteur unique d'écriture des tâches / jalons / journal d'un projet (verrou optimiste `tasksVersion`).
 * Partagé par /api/projects/[id]/tasks (Kanban admin, portail tech) et /api/projects/[id]/journal.
 */

export const MAX_TASKS = 300
export const MAX_JOURNAL = 500

export class ProjectError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

const STATE_PROJECTION = {
  tasks: 1, tasksVersion: 1, milestones: 1, progress: 1, status: 1, clientAccess: 1, clientCompanyId: 1,
  name: 1, serviceType: 1, leadTechnicianId: 1, technicianIds: 1,
}

export type ProjectState = {
  _id: mongoose.Types.ObjectId
  tasks: ProjectTask[]
  version: number
  milestones: any[]
  progress?: number
  status?: string
  clientAccess?: boolean
  clientCompanyId?: unknown
  name?: string
  serviceType?: string
  leadTechnicianId?: unknown
  technicianIds?: unknown[]
}

export async function loadProjectState(id: string): Promise<ProjectState | null> {
  if (!mongoose.isValidObjectId(id)) return null
  const p = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: STATE_PROJECTION }) as any
  if (!p) return null
  return { ...p, tasks: (p.tasks || []) as ProjectTask[], version: Number(p.tasksVersion || 0), milestones: p.milestones || [] }
}

function toDate(v: unknown): Date | null {
  if (!v) return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Normalise une tâche. `team` (id → nom) valide l'attribution : on n'attribue qu'à un membre de l'équipe.
 * Le nom libre historique (`assignee` sans `assigneeId`) reste accepté pour les projets sans équipe.
 */
export function sanitizeTask(raw: any, base?: ProjectTask, team?: Map<string, string>): ProjectTask {
  const now = new Date()
  const status = isTaskStatus(raw?.status) ? raw.status : base?.status || 'todo'
  let assigneeId = base?.assigneeId
  let assignee = base?.assignee
  if (raw?.assigneeId !== undefined) {
    const id = String(raw.assigneeId || '').trim()
    if (id && team && !team.has(id)) throw new ProjectError('Ce technicien ne fait pas partie de l’équipe du projet', 400)
    assigneeId = id || undefined
    assignee = id ? team?.get(id) || assignee : undefined
  } else if (raw?.assignee !== undefined) {
    assignee = String(raw.assignee || '').trim().slice(0, 120) || undefined
    assigneeId = undefined
  }
  return {
    id: base?.id || new mongoose.Types.ObjectId().toString(),
    title: String(raw?.title ?? base?.title ?? '').trim().slice(0, 200),
    description: raw?.description !== undefined ? String(raw.description || '').slice(0, 4000) : base?.description,
    status,
    priority: isTaskPriority(raw?.priority) ? raw.priority : base?.priority || 'medium',
    assignee,
    assigneeId,
    dueDate: raw?.dueDate !== undefined ? toDate(raw.dueDate) : base?.dueDate ?? null,
    milestoneId: raw?.milestoneId !== undefined ? String(raw.milestoneId || '') || undefined : base?.milestoneId,
    order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : base?.order ?? 0,
    createdAt: base?.createdAt || now,
    updatedAt: now,
    completedAt: status === 'done' ? (base?.status === 'done' ? base.completedAt || now : now) : null,
  }
}

export type JournalAuthor = {
  name: string
  role: 'ADMIN' | 'TECHNICIAN'
  /** Technicien à qui attribuer les entrées générées (auteur, ou technicien pour qui l'admin agit). */
  technicianId?: string
  onBehalfOf?: string
}

export function journalEntry(author: JournalAuthor, fields: Partial<ProjectJournalEntry> & Pick<ProjectJournalEntry, 'kind' | 'message'>): ProjectJournalEntry {
  return {
    id: new mongoose.Types.ObjectId().toString(),
    date: new Date(),
    technicianId: author.technicianId,
    authorName: author.name,
    authorRole: author.role,
    ...(author.onBehalfOf ? { onBehalfOf: author.onBehalfOf } : {}),
    clientVisible: false,
    ...fields,
  }
}

/** Entrées « tâche » générées pour chaque changement de colonne (le journal garde qui a fait avancer quoi). */
function taskChangeEntries(before: ProjectTask[], after: ProjectTask[], author: JournalAuthor): ProjectJournalEntry[] {
  const prev = new Map(before.map(t => [t.id, t]))
  return after.flatMap(t => {
    const old = prev.get(t.id)
    if (!old || old.status === t.status) return []
    return [journalEntry(author, {
      kind: 'task',
      message: `« ${t.title} » : ${TASK_STATUS_META[old.status].label} → ${TASK_STATUS_META[t.status].label}`,
      taskIds: [t.id],
    })]
  })
}

/** Ajoute des entrées au journal sans toucher aux tâches (événements externes : rapport validé…). */
export async function appendJournal(projectId: string, entries: ProjectJournalEntry[]) {
  if (!entries.length || !mongoose.isValidObjectId(projectId)) return
  const now = new Date()
  await projectsCollection().updateOne(
    { _id: new mongoose.Types.ObjectId(projectId) },
    { $push: { journal: { $each: entries, $slice: -MAX_JOURNAL } }, $set: { lastActivityAt: now, updatedAt: now } } as any
  )
  emitProjectEvent(projectId, 'corp:project:journal', { count: entries.length })
}

export type MutationResult = { tasks: ProjectTask[]; progress: number | null; milestones: any[]; journal: ProjectJournalEntry[] }

/**
 * Applique une modification (tâches + entrées de journal) de façon atomique, rejouée sur l'état frais en
 * cas d'écriture concurrente. Recalcule progression, compteurs et jalons ; prévient le client et les écrans ouverts.
 */
export async function mutateProject(
  id: string,
  change: (state: ProjectState) => { tasks: ProjectTask[]; journal?: ProjectJournalEntry[] },
  author?: JournalAuthor
): Promise<MutationResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await loadProjectState(id)
    if (!current) throw new ProjectError('Projet introuvable', 404)
    const result = change(current)
    const ordered = [...result.tasks].sort((a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.order - b.order)
    const progress = tasksProgress(ordered)
    const { milestones, changed: milestonesChanged } = syncMilestonesWithTasks(current.milestones, ordered)
    const journal = [...(author ? taskChangeEntries(current.tasks, ordered, author) : []), ...(result.journal || [])]
    const now = new Date()
    const res = await projectsCollection().updateOne(
      { _id: current._id, ...(current.version ? { tasksVersion: current.version } : { tasksVersion: { $exists: false } }) },
      {
        $set: {
          tasks: ordered,
          tasksVersion: current.version + 1,
          'metrics.tasksTotal': ordered.length,
          'metrics.tasksCompleted': ordered.filter(t => t.status === 'done').length,
          ...(progress !== null ? { progress } : {}),
          ...(milestonesChanged ? { milestones } : {}),
          ...(journal.length ? { lastActivityAt: now } : {}),
          updatedAt: now,
        },
        ...(journal.length ? { $push: { journal: { $each: journal, $slice: -MAX_JOURNAL } } } : {}),
      } as any
    )
    if (!res.matchedCount) continue

    const after = { ...current, milestones, progress: progress ?? current.progress }
    void notifyProjectChange(current as any, after as any).catch(e => console.error('[projects] notification client:', e))
    emitProjectEvent(id, 'corp:project:updated', { progress: after.progress ?? null })
    if (journal.length) emitProjectEvent(id, 'corp:project:journal', { count: journal.length })
    return { tasks: ordered, progress, milestones, journal }
  }
  throw new ProjectError('Le projet a été modifié simultanément, rechargez', 409)
}
