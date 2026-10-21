import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import { computeProjectFinance } from '@/lib/finance/project-finance'
import { projectsCollection, updateProjectFields, MIGRATION_REQUIRED_MESSAGE } from '@/lib/projects/persistence'
import {
  allowedTransitions,
  checkProjectTransition,
  nextActions,
  normalizeProjectStatus,
  PROJECT_STATUSES,
  PROJECT_STATUS_META,
  type ProjectStatus,
  type WorkflowContext,
} from '@/lib/projects/workflow'
import { notifyProjectChange } from '@/lib/portal/project-notify'

export const dynamic = 'force-dynamic'

async function loadContext(id: string) {
  const project = await projectsCollection().findOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { projection: { status: 1, tasks: 1, milestones: 1, reception: 1, clientCompanyId: 1, name: 1, clientAccess: 1, startedAt: 1 } }
  ) as any
  if (!project) return null
  const finance = await computeProjectFinance(id)
  const ctx: WorkflowContext = {
    acceptedQuotes: finance.acceptedQuotes,
    sentQuotes: finance.sentQuotes,
    tasksOpen: (project.tasks || []).filter((t: any) => t.status !== 'done').length,
    milestonesOpen: (project.milestones || []).filter((m: any) => m.status !== 'completed').length,
    outstanding: finance.outstanding,
    remainingToInvoice: finance.remainingToInvoice,
    receptionSigned: !!project.reception?.signedAt,
  }
  return { project, finance, ctx, status: normalizeProjectStatus(project.status) }
}

/** GET /api/projects/[id]/workflow — phase courante, passages possibles (avec garde-fous) et prochaines actions. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiUser(request, [...ADMIN_ROLES, 'ACCOUNTANT'])
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    await connectMongoose()
    const loaded = await loadContext(id)
    if (!loaded) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    const { status, ctx, finance } = loaded
    return NextResponse.json({
      success: true,
      status,
      // Statut stocké au format historique (pending…) : la migration n'a pas été lancée
      migrationRequired: !(PROJECT_STATUSES as readonly string[]).includes(String(loaded.project.status)),
      transitions: allowedTransitions(status).map(to => ({ to, label: PROJECT_STATUS_META[to].label, ...checkProjectTransition(status, to, ctx) })),
      nextActions: nextActions(status, { ...ctx, projectId: id }),
      context: ctx,
      finance: {
        contracted: finance.contracted,
        invoiced: finance.invoiced,
        paid: finance.paid,
        outstanding: finance.outstanding,
        remainingToInvoice: finance.remainingToInvoice,
        coherent: finance.coherent,
        warnings: finance.warnings,
      },
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('GET /api/projects/[id]/workflow:', error)
    return NextResponse.json({ error: 'Erreur de chargement du workflow' }, { status: 500 })
  }
}

/** POST /api/projects/[id]/workflow { to, note?, force? } — change de phase selon le workflow. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser(request, ADMIN_ROLES)
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const requested = String(body?.to || '').trim().toLowerCase()
    if (!(PROJECT_STATUSES as readonly string[]).includes(requested)) {
      return NextResponse.json({ error: 'Phase cible invalide' }, { status: 400 })
    }
    const to = requested as ProjectStatus
    const note = String(body?.note || '').trim().slice(0, 500)

    await connectMongoose()
    const loaded = await loadContext(id)
    if (!loaded) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    const from = loaded.status
    if (from === to) return NextResponse.json({ success: true, status: to, warnings: [] })

    const check = checkProjectTransition(from, to, loaded.ctx)
    if (!check.allowed) return NextResponse.json({ error: check.blocking }, { status: 409 })
    if (check.blocking && !(body?.force === true && note)) {
      return NextResponse.json({ error: check.blocking, canForce: true, warnings: check.warnings }, { status: 409 })
    }

    const now = new Date()
    const author = user.email || user.userId
    const label = PROJECT_STATUS_META[to].label
    const set: Record<string, any> = { status: to }
    if (to === 'in_progress' && !loaded.project.startedAt) set.startedAt = now
    if (to === 'completed') set.completedAt = now
    const { legacy } = await updateProjectFields(id, set, {
      push: {
        statusHistory: { date: now, status: to, author, note: note || undefined },
        timeline: {
          id: `status-${now.getTime()}`,
          date: now,
          type: to === 'approved' ? 'approved' : to === 'in_progress' ? 'started' : to === 'completed' ? 'completed' : 'milestone',
          title: `Phase : ${label}`,
          description: note || undefined,
          author,
          clientVisible: !['lead', 'quoted', 'negotiation', 'cancelled'].includes(to),
        },
      },
    })

    void notifyProjectChange(loaded.project, { ...loaded.project, status: to }).catch(e => console.error('[workflow] notification:', e))

    return NextResponse.json({
      success: true,
      status: to,
      warnings: check.warnings,
      forced: !!check.blocking,
      ...(legacy ? { warning: MIGRATION_REQUIRED_MESSAGE, migrationRequired: true } : {}),
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('POST /api/projects/[id]/workflow:', error)
    return NextResponse.json({ error: 'Changement de phase impossible' }, { status: 500 })
  }
}
