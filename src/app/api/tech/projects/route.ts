import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { ApiAuthError, authErrorResponse } from '@/lib/api-auth'
import { projectsCollection } from '@/lib/projects/persistence'
import { projectTechRole, resolveProjectActor, technicianProjectFilter } from '@/lib/projects/team'
import { normalizeProjectStatus } from '@/lib/projects/workflow'

export const dynamic = 'force-dynamic'

/** GET — projets de l'équipe du technicien connecté (responsable ou membre), actifs d'abord. */
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const actor = await resolveProjectActor(request)
    if (actor.kind !== 'technician') throw new ApiAuthError('Espace réservé aux techniciens', 403)
    const docs = await projectsCollection()
      .find(technicianProjectFilter(actor.techId), {
        projection: {
          name: 1, status: 1, progress: 1, address: 1, serviceType: 1, startDate: 1, endDate: 1, clientSnapshot: 1,
          leadTechnicianId: 1, technicianIds: 1, milestones: 1, tasks: 1, lastActivityAt: 1,
          journal: { $slice: -50 },
        },
      })
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray() as any[]

    const closed = ['completed', 'maintenance', 'cancelled']
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const projects = docs.map(p => {
      const status = normalizeProjectStatus(p.status)
      const tasks = (p.tasks || []) as any[]
      const nextMilestone = (p.milestones || [])
        .filter((m: any) => m.status !== 'completed')
        .sort((a: any, b: any) => new Date(a.dueDate || 8.64e15).getTime() - new Date(b.dueDate || 8.64e15).getTime())[0]
      return {
        id: String(p._id),
        name: p.name,
        status,
        progress: Number(p.progress) || 0,
        address: p.address || '',
        client: p.clientSnapshot?.company || p.clientSnapshot?.contact || '',
        endDate: p.endDate || null,
        role: projectTechRole(p, actor.techId),
        myOpenTasks: tasks.filter(t => t.assigneeId === actor.techId && t.status !== 'done').length,
        myTasks: tasks
          .filter(t => t.assigneeId === actor.techId && t.status !== 'done')
          .map(t => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate || null })),
        overdueTasks: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < today).length,
        freeTasks: tasks.filter(t => !t.assigneeId && t.status !== 'done').length,
        tasksDone: tasks.filter(t => t.status === 'done').length,
        tasksTotal: tasks.length,
        openBlockers: (p.journal || []).filter((e: any) => e.kind === 'blocker' && !e.resolvedAt).length,
        nextMilestone: nextMilestone ? { name: nextMilestone.name, dueDate: nextMilestone.dueDate || null } : null,
        lastActivityAt: p.lastActivityAt || null,
        active: !closed.includes(status),
      }
    }).sort((a, b) => Number(b.active) - Number(a.active))

    return NextResponse.json({ success: true, projects })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[tech/projects]', error)
    return NextResponse.json({ error: 'Chargement des projets impossible' }, { status: 500 })
  }
}
