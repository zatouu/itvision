/**
 * Outil de test Socket.io — mise à jour temps réel d'un projet (cf. TEST_SOCKET_IO.md).
 *
 * Mutait un projet SANS aucune autorisation : désormais réservé au staff
 * (ADMIN/SUPER_ADMIN). Aucun écran applicatif ne l'appelle — la mise à jour
 * réelle des projets passe par /api/projects.
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { emitProjectUpdate, emitUserNotification } from '@/lib/socket-emit'
import { requireAdminApi } from '@/lib/api-auth'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await context.params
    const body = await request.json()
    
    await connectMongoose()
    
    const project = await Project.findById(id)
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    // Mettre à jour le projet
    if (body.progress !== undefined) project.progress = body.progress
    if (body.status) project.status = body.status
    if (body.currentPhase) project.currentPhase = body.currentPhase
    
    await project.save()

    // 🔥 ÉMETTRE L'ÉVÉNEMENT TEMPS RÉEL
    emitProjectUpdate(id, {
      progress: project.progress,
      status: project.status,
      currentPhase: project.currentPhase
    })

    // Notifier le client
    if (project.clientId) {
      emitUserNotification(project.clientId.toString(), {
        type: 'info',
        title: 'Projet mis à jour',
        message: `${project.name} - ${project.progress}% complété`,
        data: { projectId: id }
      })
    }

    return NextResponse.json({
      success: true,
      project: {
        _id: project._id.toString(),
        name: project.name,
        progress: project.progress,
        status: project.status,
        currentPhase: project.currentPhase
      }
    })
  } catch (error) {
    console.error('Erreur mise à jour projet:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}





