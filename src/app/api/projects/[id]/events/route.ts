import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import Workflow from '@/lib/models/Workflow'
import { requireAuth } from '@/lib/jwt'

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (role !== 'ADMIN') throw new Error('Accès non autorisé')
}

// Event-driven orchestration: quand un événement se produit, le workflow réagit automatiquement
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const { type, payload } = body || {}

    if (!type) return NextResponse.json({ error: 'Type d\'événement requis' }, { status: 400 })

    const project = await Project.findById(id).lean() as any
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    // Orchestration event-driven
    const actions: string[] = []

    // Événement: jalon complété
    if (type === 'milestone_completed') {
      const milestoneId = payload?.milestoneId
      const milestone = project.milestones?.find((m: any) => m.id === milestoneId)
      if (milestone) {
        // Vérifier si toutes les dépendances du workflow suivant sont OK
        const wf = await Workflow.findOne({ projectId: id }).lean() as any
        if (wf) {
          const steps = wf.steps || []
          const nextStep = steps.find((s: any) => s.status === 'pending' && s.dependencies.every((d: string) => {
            const depStep = steps.find((x: any) => x.id === d)
            return depStep?.status === 'completed'
          }))
          if (nextStep && milestone.phaseTemplate && nextStep.id === milestone.phaseTemplate) {
            await Workflow.updateOne(
              { _id: wf._id, 'steps.id': nextStep.id },
              { $set: { 'steps.$.status': 'in_progress', currentStep: nextStep.id } }
            )
            actions.push(`workflow_step_started:${nextStep.id}`)
          }
        }
      }
    }

    // Événement: checklist complète
    if (type === 'checklist_complete') {
      const milestoneId = payload?.milestoneId
      await Project.updateOne(
        { _id: id, 'milestones.id': milestoneId },
        { $set: { 'milestones.$.status': 'completed', 'milestones.$.completedDate': new Date() } }
      )
      actions.push('milestone_auto_completed')
    }

    // Événement: dépassement de délai
    if (type === 'milestone_delayed') {
      const milestoneId = payload?.milestoneId
      await Project.updateOne(
        { _id: id, 'milestones.id': milestoneId },
        { $set: { 'milestones.$.status': 'delayed' } }
      )
      actions.push('status_changed_to_delayed')
    }

    // Événement: nouveau document ajouté → auto-notifier si workflow en attente de livrable
    if (type === 'document_added') {
      const wf = await Workflow.findOne({ projectId: id }).lean() as any
      if (wf) {
        const currentStep = wf.steps?.find((s: any) => s.id === wf.currentStep)
        if (currentStep?.status === 'in_progress') {
          actions.push('deliverable_received')
        }
      }
    }

    return NextResponse.json({ success: true, actions })
  } catch (e: any) {
    console.error('Erreur event orchestration:', e)
    return NextResponse.json({ error: e.message || 'Erreur orchestration' }, { status: 500 })
  }
}
