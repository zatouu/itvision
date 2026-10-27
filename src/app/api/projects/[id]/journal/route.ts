import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ApiAuthError, authErrorResponse } from '@/lib/api-auth'
import Technician from '@/lib/models/Technician'
import ProjectImage from '@/lib/models/ProjectImage'
import { projectsCollection } from '@/lib/projects/persistence'
import { JOURNAL_INPUT_KINDS, isTaskStatus, type JournalKind, type ProjectJournalEntry } from '@/lib/projects/workflow'
import {
  assertProjectRead,
  canAdvanceTask,
  canManageProject,
  canWriteJournal,
  projectTechRole,
  resolveProjectActor,
} from '@/lib/projects/team'
import { journalEntry, loadProjectState, mutateProject, ProjectError, sanitizeTask, type JournalAuthor } from '@/lib/projects/tasks'
import { notifyAdmins } from '@/lib/notify'
import { notifyTechnician } from '@/lib/tech/notify-technician'
import { emitProjectEvent } from '@/lib/socket-emit'

export const dynamic = 'force-dynamic'

const CLIENT_TITLES: Record<JournalKind, string> = {
  progress: 'Avancement du chantier',
  blocker: 'Point d’attention',
  note: 'Point d’étape',
  task: 'Tâche réalisée',
  report: 'Rapport d’intervention',
}

const isUrl = (v: unknown) => typeof v === 'string' && /^(https?:\/\/|\/)[^\s]{1,1000}$/.test(v)

async function guard(request: NextRequest, params: Promise<{ id: string }>) {
  const actor = await resolveProjectActor(request)
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) throw new ProjectError('Projet invalide', 400)
  await connectMongoose()
  const state = await loadProjectState(id)
  if (!state) throw new ProjectError('Projet introuvable', 404)
  return { id, state, access: assertProjectRead(actor, state) }
}

async function findEntry(id: string, entryId: string) {
  const p = await projectsCollection().findOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { projection: { journal: { $elemMatch: { id: entryId } } } }
  ) as any
  const entry = p?.journal?.[0] as ProjectJournalEntry | undefined
  if (!entry) throw new ProjectError('Entrée introuvable', 404)
  return entry
}

function fail(error: any, fallback: string) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  if (error instanceof ProjectError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error(fallback, error)
  return NextResponse.json({ error: fallback }, { status: 500 })
}

/** GET ?limit= — journal du projet, du plus récent au plus ancien */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await guard(request, params)
    const limit = Math.min(Math.max(Number(new URL(request.url).searchParams.get('limit')) || 100, 1), 500)
    const p = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { journal: { $slice: -limit } } }) as any
    const journal = ((p?.journal || []) as ProjectJournalEntry[]).reverse()
    return NextResponse.json({ success: true, journal })
  } catch (error) {
    return fail(error, 'Chargement du journal impossible')
  }
}

/**
 * POST { kind, message, taskUpdates?: [{ taskId, status }], photos?: string[], hours?, technicianId? }
 * Technicien de l'équipe : consigne en son nom. Admin : en son nom, ou pour le compte d'un membre (`technicianId`).
 * Les tâches avancées sont appliquées dans la même écriture (progression et jalons recalculés).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, state, access } = await guard(request, params)
    if (!canWriteJournal(access)) throw new ApiAuthError('Réservé à l’équipe du projet', 403)
    const body = await request.json().catch(() => ({}))

    const kind = (JOURNAL_INPUT_KINDS as readonly string[]).includes(body?.kind) ? body.kind as JournalKind : 'note'
    const message = String(body?.message || '').trim().slice(0, 4000)
    const photos = (Array.isArray(body?.photos) ? body.photos : []).filter(isUrl).slice(0, 12) as string[]
    const hoursRaw = Number(body?.hours)
    const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.min(Math.round(hoursRaw * 4) / 4, 24) : undefined
    const updates = (Array.isArray(body?.taskUpdates) ? body.taskUpdates : [])
      .filter((u: any) => u?.taskId && isTaskStatus(u?.status))
      .slice(0, 100) as Array<{ taskId: string; status: string }>
    if (!message && !updates.length && !photos.length) throw new ProjectError('Décrivez ce qui a été fait, ou cochez une tâche', 400)

    // Auteur : le technicien lui-même, ou l'admin (éventuellement pour le compte d'un membre)
    let author: JournalAuthor
    if (access.actor.kind === 'technician') {
      author = { name: access.actor.name, role: 'TECHNICIAN', technicianId: access.actor.techId }
    } else {
      const onBehalf = body?.technicianId ? String(body.technicianId) : ''
      if (onBehalf && !projectTechRole(state, onBehalf)) throw new ProjectError('Ce technicien ne fait pas partie de l’équipe du projet', 400)
      const tech = onBehalf ? await Technician.findById(onBehalf).select('name').lean() as { name?: string } | null : null
      author = { name: access.actor.name, role: 'ADMIN', ...(tech ? { technicianId: onBehalf, onBehalfOf: tech.name } : {}) }
    }

    const entry = journalEntry(author, {
      kind,
      message: message || (updates.length ? 'Avancement des tâches' : 'Photos du chantier'),
      ...(updates.length ? { taskIds: updates.map(u => String(u.taskId)) } : {}),
      ...(photos.length ? { photos } : {}),
      ...(hours ? { hours } : {}),
      ...(kind === 'blocker' ? { resolvedAt: null } : {}),
    })

    const saved = await mutateProject(id, s => {
      const byId = new Map(updates.map(u => [String(u.taskId), u.status]))
      const tasks = s.tasks.map(t => {
        const status = byId.get(t.id)
        if (!status || status === t.status) return t
        if (!canAdvanceTask(access, t)) throw new ProjectError(`« ${t.title} » est attribuée à un autre technicien`, 403)
        const next = sanitizeTask({ status }, t)
        if (!t.assigneeId && author.technicianId && !canManageProject(access)) next.assigneeId = author.technicianId
        return next
      })
      return { tasks, journal: [entry] }
    }, author)

    if (photos.length) {
      const base = await ProjectImage.countDocuments({ projectId: state._id })
      await ProjectImage.insertMany(photos.map((url, i) => ({
        projectId: state._id,
        url,
        filename: url.split('/').pop() || 'photo',
        title: `${CLIENT_TITLES[kind]} — ${author.onBehalfOf || author.name}`,
        description: message.slice(0, 500),
        order: base + i,
        clientVisible: false,
      }))).catch(e => console.error('[journal] photos projet:', e))
    }

    if (kind === 'blocker') {
      const who = author.onBehalfOf || author.name
      void notifyAdmins({
        type: 'warning', title: `Blocage sur ${state.name || 'un projet'}`, message: `${who} : ${entry.message.slice(0, 200)}`,
        actionUrl: `/admin/projects/${id}`, metadata: { projectId: id, journalId: entry.id },
      })
      const lead = state.leadTechnicianId ? String(state.leadTechnicianId) : ''
      if (lead && lead !== author.technicianId) {
        void notifyTechnician(lead, {
          type: 'warning', title: `Blocage signalé : ${state.name || 'projet'}`, message: `${who} : ${entry.message.slice(0, 200)}`,
          actionUrl: `/tech-interface?tab=projets&projet=${id}`, metadata: { projectId: id },
        })
      }
    }

    return NextResponse.json({ success: true, entry, ...saved }, { status: 201 })
  } catch (error) {
    return fail(error, 'Enregistrement au journal impossible')
  }
}

/**
 * PATCH { entryId, clientVisible?: boolean, resolved?: boolean }
 * - clientVisible (admin) : publie l'entrée dans la timeline du portail client, ou la retire.
 * - resolved (admin, responsable, ou auteur du blocage) : lève / rouvre un blocage.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, access } = await guard(request, params)
    const body = await request.json().catch(() => ({}))
    const entryId = String(body?.entryId || '')
    const entry = await findEntry(id, entryId)
    const _id = new mongoose.Types.ObjectId(id)
    const set: Record<string, unknown> = {}
    const extra: Record<string, unknown> = {}

    if (typeof body?.clientVisible === 'boolean') {
      if (access.actor.kind !== 'admin') throw new ApiAuthError('Seul l’administrateur publie au client', 403)
      set['journal.$[e].clientVisible'] = body.clientVisible
      const timelineId = `journal-${entry.id}`
      await projectsCollection().updateOne({ _id }, { $pull: { timeline: { id: timelineId } } } as any)
      if (body.clientVisible) {
        extra.$push = {
          timeline: {
            id: timelineId, date: new Date(entry.date), type: entry.kind === 'blocker' ? 'issue' : 'milestone',
            title: CLIENT_TITLES[entry.kind] || 'Point d’étape', description: entry.message, author: 'IT Vision', clientVisible: true,
          },
        }
      }
    }
    if (typeof body?.resolved === 'boolean') {
      if (entry.kind !== 'blocker') throw new ProjectError('Seul un blocage se lève', 400)
      const own = access.actor.kind === 'technician' && entry.technicianId === access.actor.techId
      if (!canManageProject(access) && !own) throw new ApiAuthError('Réservé à l’administrateur, au responsable ou à l’auteur', 403)
      set['journal.$[e].resolvedAt'] = body.resolved ? new Date() : null
    }
    if (!Object.keys(set).length) throw new ProjectError('Aucune modification', 400)

    await projectsCollection().updateOne({ _id }, { $set: { ...set, updatedAt: new Date() }, ...extra } as any, { arrayFilters: [{ 'e.id': entryId }] })
    emitProjectEvent(id, 'corp:project:journal', { entryId })
    return NextResponse.json({ success: true, entry: await findEntry(id, entryId) })
  } catch (error) {
    return fail(error, 'Mise à jour du journal impossible')
  }
}

/** DELETE ?entryId= — admin (retire aussi l'entrée publiée côté client) */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id, access } = await guard(request, params)
    if (access.actor.kind !== 'admin') throw new ApiAuthError('Réservé à l’administrateur', 403)
    const entryId = new URL(request.url).searchParams.get('entryId') || ''
    await findEntry(id, entryId)
    await projectsCollection().updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $pull: { journal: { id: entryId }, timeline: { id: `journal-${entryId}` } }, $set: { updatedAt: new Date() } } as any
    )
    emitProjectEvent(id, 'corp:project:journal', { entryId, deleted: true })
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'Suppression impossible')
  }
}
