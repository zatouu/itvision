/**
 * Exemple d'API route avec Socket.io - Mise à jour temps réel
 * Phase 2B
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { emitProjectUpdate, emitUserNotification } from '@/lib/socket-emit'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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





