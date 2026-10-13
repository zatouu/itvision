import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Project from '@/lib/models/Project'
import '@/lib/models/Client'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { resolveTechnicianId, isAssignedTechnician } from '@/lib/interventions-access'
import { detectDomain, ITV_DOMAINS, projectStage } from '@/lib/portal/project-view'

export const dynamic = 'force-dynamic'

const HISTORY_LABELS: Record<string, string> = {
  created: 'Création',
  updated: 'Mise à jour du planning',
  status_changed: 'Changement de statut',
  report_updated: 'Rapport terrain enregistré',
}

/**
 * GET /api/tech/interventions/[id] — fiche complète pour le technicien affecté :
 * client, projet, contrat, compte rendu déjà saisi, rapport détaillé, historique du site.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const user = await requireApiUser(request, ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'])
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

    const i = await Intervention.findById(id)
      .populate('clientId', 'name company address city phone email contactPerson')
      .lean() as any
    if (!i) return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })

    if (user.role === 'TECHNICIAN') {
      const techId = await resolveTechnicianId(user.email)
      if (!isAssignedTechnician(i, techId)) {
        return NextResponse.json({ error: 'Intervention non assignée à ce technicien' }, { status: 403 })
      }
    }

    const clientRef = i.clientId?._id || i.clientId
    const [project, report, previous] = await Promise.all([
      i.projectId
        ? Project.findById(i.projectId).select('name serviceType status progress quote.status reception address').lean() as any
        : null,
      MaintenanceReport.findOne({ interventionId: i._id })
        .select('reportId status validation.comments publishedToClient updatedAt')
        .sort({ updatedAt: -1 }).lean() as any,
      clientRef
        ? Intervention.find({ clientId: clientRef, _id: { $ne: i._id }, status: 'completed' })
            .select('title date observations typeIntervention')
            .sort({ date: -1 }).limit(3).lean() as any
        : [],
    ])

    const client = i.clientId && typeof i.clientId === 'object' ? i.clientId : null
    const domain = project ? detectDomain(project.serviceType, project.name) : null
    const address = [client?.address, client?.city].filter(Boolean).join(', ') || i.client?.address || i.site || ''
    // Heures réelles d'arrivée et de fin, d'après le journal
    const statusAt = (s: string) => {
      const h = [...(i.history || [])].reverse().find((e: any) => e.details?.newStatus === s)
      return h?.details?.occurredAt || h?.timestamp || null
    }
    const startedAt = statusAt('in_progress')
    const completedAt = statusAt('completed')

    return NextResponse.json({
      intervention: {
        id: String(i._id),
        number: i.interventionNumber || null,
        title: i.title,
        description: i.description || '',
        status: i.status,
        priority: i.priority,
        type: i.typeIntervention || i.service,
        date: i.date,
        scheduledDate: i.scheduledDate,
        heureDebut: i.heureDebut || i.scheduledTime,
        heureFin: i.heureFin,
        startedAt,
        completedAt,
        checkedIn: !!i.gpsLocation?.lat,
        duration: i.estimatedDuration,
        site: i.site || '',
        address,
        coveredByContract: !!i.isCoveredByContract,
        clientId: clientRef ? String(clientRef) : null,
        projectId: i.projectId ? String(i.projectId) : null,
        client: client
          ? { name: client.name, company: client.company, phone: client.phone, email: client.email, contact: client.contactPerson || '' }
          : (i.client?.name ? { name: i.client.name, phone: i.client.phone || '' } : null),
        report: {
          photosAvant: (i.photosAvant || []).map((p: any) => ({ url: p.url, timestamp: p.timestamp })),
          photosApres: (i.photosApres || []).map((p: any) => ({ url: p.url, timestamp: p.timestamp })),
          observations: i.observations || '',
          clientSignature: i.signatures?.client?.signature
            ? { name: i.signatures.client.name || '', at: i.signatures.client.timestamp }
            : null,
          technicianSigned: !!i.signatures?.technician?.signature,
        },
        feedback: i.clientFeedback?.rating
          ? { rating: i.clientFeedback.rating, comment: i.clientFeedback.comment || '' }
          : null,
        history: (i.history || []).slice(-10).reverse().map((h: any) => ({
          label: HISTORY_LABELS[h.action] || h.action,
          status: h.details?.newStatus || null,
          at: h.timestamp,
        })),
      },
      project: project
        ? {
            id: String(project._id),
            name: project.name,
            domain: domain ? ITV_DOMAINS[domain].label : null,
            stage: projectStage(project).label,
            progress: Number(project.progress) || 0,
          }
        : null,
      maintenanceReport: report
        ? {
            id: String(report._id),
            reportId: report.reportId,
            status: report.status,
            comments: report.validation?.comments || '',
            published: !!report.publishedToClient,
          }
        : null,
      siteHistory: (previous as any[]).map(p => ({
        id: String(p._id),
        title: p.title,
        date: p.date,
        type: p.typeIntervention,
        observations: String(p.observations || '').slice(0, 280),
      })),
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('[api/tech/interventions/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
