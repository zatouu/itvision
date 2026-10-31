import mongoose from 'mongoose'
import type { NextRequest } from 'next/server'
import Technician from '@/lib/models/Technician'
import User from '@/lib/models/User'
import { ADMIN_ROLES, ApiAuthError, requireApiUser } from '@/lib/api-auth'
import { resolveTechnicianId } from '@/lib/interventions-access'
import type { ProjectTask, ProjectTeamMember, ProjectTeamRole } from './workflow'

/**
 * Équipe terrain d'un projet et droits associés — règle unique pour l'API projets et le portail tech.
 *
 * - Admin : tous les droits, avec ou sans équipe (il peut piloter le projet seul et consigner
 *   pour le compte d'un technicien qui ne maîtrise pas encore l'outil).
 * - Responsable (lead) : fait avancer et organise toutes les tâches, consigne au journal.
 * - Membre : fait avancer ses tâches (et celles non attribuées, qu'il prend), consigne au journal.
 * - Comptable : lecture.
 */

type TeamLike = { leadTechnicianId?: unknown; technicianIds?: unknown[] | null }

export type ProjectActor =
  | { kind: 'admin'; userId: string; role: string; name: string }
  | { kind: 'reader'; userId: string; role: string; name: string }
  | { kind: 'technician'; userId: string; role: 'TECHNICIAN'; name: string; techId: string }

const READER_ROLES = ['ACCOUNTANT'] as const

const idOf = (v: unknown) => (v ? String((v as any)?._id ?? v) : '')

export function projectTeamIds(project: TeamLike): string[] {
  const ids = [idOf(project.leadTechnicianId), ...(project.technicianIds || []).map(idOf)].filter(Boolean)
  return Array.from(new Set(ids))
}

export function projectTechRole(project: TeamLike, techId?: string | null): ProjectTeamRole | null {
  if (!techId) return null
  if (idOf(project.leadTechnicianId) === techId) return 'lead'
  return (project.technicianIds || []).some(t => idOf(t) === techId) ? 'member' : null
}

/** Filtre Mongo : projets où le technicien est responsable ou membre. */
export function technicianProjectFilter(techId: string) {
  const oid = new mongoose.Types.ObjectId(techId)
  return { $or: [{ leadTechnicianId: oid }, { technicianIds: oid }] }
}

/** Identifie l'appelant (admin, lecteur, technicien rattaché à sa fiche). Lève ApiAuthError. */
export async function resolveProjectActor(request: NextRequest): Promise<ProjectActor> {
  const user = await requireApiUser(request, [...ADMIN_ROLES, ...READER_ROLES, 'TECHNICIAN'])
  const account = mongoose.isValidObjectId(user.userId)
    ? await User.findById(user.userId).select('name').lean() as { name?: string } | null
    : null
  const name = String(account?.name || user.username || user.email || 'IT Vision')
  if ((ADMIN_ROLES as readonly string[]).includes(user.role)) return { kind: 'admin', userId: user.userId, role: user.role, name }
  if (user.role !== 'TECHNICIAN') return { kind: 'reader', userId: user.userId, role: user.role, name }
  const techId = await resolveTechnicianId(user.email)
  if (!techId) throw new ApiAuthError('Votre compte n’est relié à aucune fiche technicien', 403)
  const tech = await Technician.findById(techId).select('name').lean() as { name?: string } | null
  return { kind: 'technician', userId: user.userId, role: 'TECHNICIAN', name: tech?.name || name, techId }
}

export type ProjectAccess = { actor: ProjectActor; teamRole: ProjectTeamRole | null }

/** Lecture du projet : admin et lecteurs toujours, technicien seulement s'il fait partie de l'équipe. */
export function assertProjectRead(actor: ProjectActor, project: TeamLike): ProjectAccess {
  if (actor.kind !== 'technician') return { actor, teamRole: null }
  const teamRole = projectTechRole(project, actor.techId)
  if (!teamRole) throw new ApiAuthError('Projet réservé à son équipe', 403)
  return { actor, teamRole }
}

/** Organiser le projet (créer/supprimer/réattribuer des tâches, résoudre les blocages) : admin ou responsable. */
export function canManageProject(access: ProjectAccess) {
  return access.actor.kind === 'admin' || access.teamRole === 'lead'
}

/** Faire avancer une tâche : organisateur, ou membre sur sa tâche / une tâche non attribuée. */
export function canAdvanceTask(access: ProjectAccess, task: Pick<ProjectTask, 'assigneeId'>) {
  if (canManageProject(access)) return true
  if (access.actor.kind !== 'technician' || !access.teamRole) return false
  return !task.assigneeId || task.assigneeId === access.actor.techId
}

/** Consigner au journal : admin ou membre de l'équipe. */
export function canWriteJournal(access: ProjectAccess) {
  return access.actor.kind === 'admin' || !!access.teamRole
}

const FINANCIAL_DOC_TYPES = ['quote', 'invoice', 'contract']

/**
 * Vue d'un projet sans aucune donnée financière (montant, marge, devis, prix du matériel, budget,
 * documents devis/factures/contrats) — règle commerciale : un technicien ne voit jamais les montants.
 */
export function withoutFinance<T extends Record<string, any>>(project: T): T {
  const { value, margin, quote, ...rest } = project as Record<string, any>
  const out: Record<string, any> = { ...rest }
  if (Array.isArray(rest.products)) {
    out.products = rest.products.map(({ unitPrice, totalPrice, supplier, ...p }: any) => p)
  }
  if (rest.metrics) {
    const { budgetPlanned, budgetUsed, ...metrics } = rest.metrics
    out.metrics = metrics
  }
  if (Array.isArray(rest.documents)) {
    out.documents = rest.documents.filter((d: any) => !FINANCIAL_DOC_TYPES.includes(String(d?.type)))
  }
  return out as T
}

/** Fiches techniciens de l'équipe, enrichies de la charge et de la dernière activité consignée. */
export async function loadProjectTeam(project: TeamLike & {
  tasks?: Array<{ status: string; assigneeId?: string }>
  journal?: Array<{ technicianId?: string; date: Date | string; presence?: 'in' | 'out'; hours?: number }>
}): Promise<ProjectTeamMember[]> {
  const ids = projectTeamIds(project).filter(id => mongoose.isValidObjectId(id))
  if (!ids.length) return []
  const techs = await Technician.find({ _id: { $in: ids } }).select('name phone email specialties isActive').lean() as any[]
  const byId = new Map(techs.map(t => [String(t._id), t]))
  const lastActivity = new Map<string, Date>()
  const lastPresence = new Map<string, { d: Date; v: 'in' | 'out' }>()
  const hoursTotal = new Map<string, number>()
  for (const e of project.journal || []) {
    if (!e.technicianId) continue
    const d = new Date(e.date)
    if (!lastActivity.has(e.technicianId) || lastActivity.get(e.technicianId)! < d) lastActivity.set(e.technicianId, d)
    if (e.presence) {
      const cur = lastPresence.get(e.technicianId)
      if (!cur || cur.d < d) lastPresence.set(e.technicianId, { d, v: e.presence })
    }
    if (Number(e.hours) > 0) hoursTotal.set(e.technicianId, (hoursTotal.get(e.technicianId) || 0) + Number(e.hours))
  }
  return ids.flatMap(id => {
    const t = byId.get(id)
    if (!t) return []
    return [{
      id,
      name: t.name,
      phone: t.phone,
      email: t.email,
      specialties: t.specialties || [],
      isActive: t.isActive !== false,
      role: projectTechRole(project, id) as ProjectTeamRole,
      openTasks: (project.tasks || []).filter(x => x.assigneeId === id && x.status !== 'done').length,
      lastActivityAt: lastActivity.get(id) || null,
      onSite: lastPresence.get(id)?.v === 'in',
      hoursTotal: hoursTotal.get(id) || 0,
    }]
  })
}
