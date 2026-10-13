import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'
import { notifyCompany } from '@/lib/portal/company-notify'
import { archiveReceptionPdf } from '@/lib/pdf-reception'

/** Côté IT Vision : demander la réception au client, lever les réserves, ou annuler une demande non signée. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    try {
      const { role } = await requireAuth(request)
      if (role !== 'ADMIN') throw new Error()
    } catch { return NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }

    const { id } = await params
    const body = await request.json().catch(() => null)
    const action = body?.action
    const project = await Project.findById(id).select('name reception clientCompanyId clientAccess status').lean() as any
    if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    const actionUrl = `/portail-entreprise/projets/${String(project._id)}`
    const now = new Date()

    if (action === 'request') {
      if (project.reception?.signedAt) return NextResponse.json({ error: 'PV déjà signé' }, { status: 409 })
      if (!project.clientCompanyId) return NextResponse.json({ error: 'Aucune entreprise cliente liée au projet' }, { status: 400 })
      const warrantyMonths = Math.min(Math.max(Math.round(Number(body?.warrantyMonths) || 12), 0), 120)
      await Project.updateOne({ _id: project._id }, {
        $set: { reception: { requestedAt: now, requestedBy: 'IT Vision', warrantyMonths }, clientAccess: true },
      })
      await notifyCompany({
        companyId: String(project.clientCompanyId), category: 'project', type: 'warning', requires: 'interventions:ack',
        actionUrl: `${actionUrl}?reception=1`,
        title: `${project.name} : réception des travaux à signer`,
        message: `Les travaux sont terminés. Vérifiez l'installation puis signez le PV de réception (garantie ${warrantyMonths} mois).`,
        metadata: { projectId: String(project._id) },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'lift') {
      if (project.reception?.decision !== 'reserves' || project.reception?.reservesLiftedAt) {
        return NextResponse.json({ error: 'Aucune réserve en cours' }, { status: 409 })
      }
      await Project.updateOne({ _id: project._id }, {
        $set: { 'reception.reservesLiftedAt': now, status: 'completed', progress: 100, endDate: now },
        $push: { timeline: { id: `reserves-${now.getTime()}`, date: now, type: 'completed', title: 'Réserves levées', description: 'Les points signalés à la réception ont été traités.', author: 'IT Vision', clientVisible: true } },
      })
      const lifted = await Project.findById(project._id).populate('clientCompanyId', 'name company').lean() as any
      await archiveReceptionPdf(lifted, 'reserves_levees').catch(e => console.error('[reception] archivage PDF', e))
      if (project.clientCompanyId) await notifyCompany({
        companyId: String(project.clientCompanyId), category: 'project', type: 'success', actionUrl,
        title: `${project.name} : réserves levées`,
        message: 'Les points signalés à la réception ont été traités. Votre installation est sous garantie.',
        metadata: { projectId: String(project._id) },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'cancel') {
      if (project.reception?.signedAt) return NextResponse.json({ error: 'PV déjà signé' }, { status: 409 })
      await Project.updateOne({ _id: project._id }, { $unset: { reception: 1 } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (e) {
    console.error('[POST /api/projects/[id]/reception]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
