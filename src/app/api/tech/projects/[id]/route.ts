import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ApiAuthError, authErrorResponse } from '@/lib/api-auth'
import { projectsCollection } from '@/lib/projects/persistence'
import { assertProjectRead, canManageProject, loadProjectTeam, resolveProjectActor } from '@/lib/projects/team'
import { normalizeProjectStatus, PROJECT_STATUS_META } from '@/lib/projects/workflow'

export const dynamic = 'force-dynamic'

/**
 * GET — fiche projet vue du terrain : site, contacts, équipe, jalons, tâches, journal.
 * Sans données financières. Réservée aux membres de l'équipe.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const actor = await resolveProjectActor(request)
    if (actor.kind !== 'technician') throw new ApiAuthError('Espace réservé aux techniciens', 403)
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })

    const p = await projectsCollection().findOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        projection: {
          name: 1, description: 1, status: 1, progress: 1, address: 1, serviceType: 1, startDate: 1, endDate: 1, currentPhase: 1,
          clientSnapshot: 1, site: 1, leadTechnicianId: 1, technicianIds: 1, milestones: 1, tasks: 1,
          journal: { $slice: -100 },
        },
      }
    ) as any
    if (!p) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    const access = assertProjectRead(actor, p)
    const status = normalizeProjectStatus(p.status)

    return NextResponse.json({
      success: true,
      myRole: access.teamRole,
      techId: actor.techId,
      canManage: canManageProject(access),
      project: {
        id: String(p._id),
        name: p.name,
        description: p.description || '',
        status,
        statusLabel: PROJECT_STATUS_META[status].label,
        progress: Number(p.progress) || 0,
        address: p.address || '',
        currentPhase: p.currentPhase || '',
        startDate: p.startDate || null,
        endDate: p.endDate || null,
        client: p.clientSnapshot || null,
        site: p.site ? { name: p.site.name, address: p.site.address, access: p.site.access, constraints: p.site.constraints || [], contacts: p.site.contacts || [] } : null,
        milestones: (p.milestones || []).map((m: any) => ({ id: m.id, name: m.name, status: m.status, dueDate: m.dueDate || null, completedDate: m.completedDate || null })),
        tasks: p.tasks || [],
      },
      team: await loadProjectTeam(p),
      journal: ((p.journal || []) as any[]).reverse(),
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[tech/projects/:id]', error)
    return NextResponse.json({ error: 'Chargement du projet impossible' }, { status: 500 })
  }
}
