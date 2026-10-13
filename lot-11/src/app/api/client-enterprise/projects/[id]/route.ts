import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope, companyCapabilities } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Intervention from '@/lib/models/Intervention'
import ProjectImage from '@/lib/models/ProjectImage'
import { CLIENT_VISIBLE_QUOTE, CLIENT_VISIBLE_INVOICE } from '@/lib/client-documents'
import { CLIENT_VISIBLE_PROJECT, detectDomain, projectStage } from '@/lib/portal/project-view'

function fmt(v: number) {
  return Math.round(v).toLocaleString('fr-FR')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireDomainAccess(request, 'corporate')
    if (!result.ok) return result.response
    const { access } = result
    const caps = companyCapabilities(access)
    // Sans finance:view : ni montants ni factures ; devis visibles pour qui doit y répondre
    const canFinance = access.isAdmin || caps.has('finance:view')
    const canQuotes = canFinance || caps.has('quotes:respond')

    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
    }

    await connectDB()
    const userId = new mongoose.Types.ObjectId(access.userId)
    const companyId = access.profiles.companyClientId

    const project = await Project.findOne({
      $and: [{ _id: new mongoose.Types.ObjectId(id) }, companyScope({ userId, companyId }), CLIENT_VISIBLE_PROJECT],
    }).lean() as any

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Filtrer les données sensibles / non visibles par le client
    const clientVisibleTimeline = (project.timeline || []).filter((t: any) => t.clientVisible !== false)
    const clientVisibleDocuments = (project.documents || []).filter((d: any) => d.clientVisible !== false)
    const clientVisibleNotes = (project.sharedNotes || []).filter((n: any) => n.clientVisible !== false)

    // Enrichir avec devis et factures liées au projet
    const [linkedQuotes, linkedInvoices, linkedInterventions, sharedImages] = await Promise.all([
      AdminQuote.find({ projectId: new mongoose.Types.ObjectId(id), ...CLIENT_VISIBLE_QUOTE })
        .select('numero title date status total clientResponse clientRespondedAt clientCounterAmount bonCommande')
        .sort({ date: -1 })
        .lean(),
      AdminInvoice.find({ projectId: new mongoose.Types.ObjectId(id), ...CLIENT_VISIBLE_INVOICE })
        .select('numero date dueDate status total paidAt')
        .sort({ date: -1 })
        .lean(),
      Intervention.find({ projectId: new mongoose.Types.ObjectId(id), status: { $ne: 'cancelled' } })
        .select('interventionNumber title typeIntervention status date scheduledDate photosAvant photosApres')
        .sort({ date: -1, createdAt: -1 })
        .limit(30)
        .lean() as Promise<any[]>,
      ProjectImage.find({ projectId: new mongoose.Types.ObjectId(id), clientVisible: true })
        .select('url title filename createdAt')
        .sort({ order: 1, createdAt: -1 })
        .limit(60)
        .lean() as Promise<any[]>,
    ])

    const interventions = linkedInterventions.map((it: any) => ({
      _id: String(it._id),
      number: it.interventionNumber,
      title: it.title,
      type: it.typeIntervention,
      status: it.status,
      date: it.date || it.scheduledDate,
    }))
    const interventionPhotos = linkedInterventions.flatMap((it: any) =>
      ([['Avant', it.photosAvant], ['Après', it.photosApres]] as const).flatMap(([moment, list]) =>
        (Array.isArray(list) ? list : []).filter((p: any) => p?.url).map((p: any) => ({
          url: p.url,
          caption: p.caption || `${moment} · ${it.title || 'Intervention'}`,
          moment,
          date: p.timestamp || it.date,
          interventionId: String(it._id),
        }))
      )
    )

    const response = {
      _id: String(project._id),
      name: project.name,
      description: project.description,
      status: project.status,
      currentPhase: project.currentPhase,
      progress: project.progress ?? 0,
      serviceType: project.serviceType,
      domain: detectDomain(project.serviceType, project.name),
      stage: projectStage(project),
      address: project.address,
      startDate: project.startDate,
      endDate: project.endDate,
      value: canFinance ? (project.value ?? 0) : null,
      clientSnapshot: project.clientSnapshot,
      site: project.site,
      milestones: (project.milestones || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        dueDate: m.dueDate,
        status: m.status,
        completedDate: m.completedDate,
        deliverables: m.deliverables,
        clientNotified: m.clientNotified
      })),
      timeline: clientVisibleTimeline.map((t: any) => ({
        id: t.id,
        date: t.date,
        type: t.type,
        title: t.title,
        description: t.description,
        author: t.author
      })),
      products: (project.products || []).map((p: any) => ({
        name: p.name,
        brand: p.brand,
        model: p.model,
        quantity: p.quantity,
        unitPrice: canFinance ? p.unitPrice : undefined,
        totalPrice: canFinance ? p.totalPrice : undefined,
        status: p.status,
        supplier: p.supplier,
        leadTime: p.leadTime,
        orderDate: p.orderDate,
        receivedDate: p.receivedDate
      })),
      documents: clientVisibleDocuments.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        url: d.url,
        uploadDate: d.uploadDate
      })),
      sharedNotes: clientVisibleNotes.map((n: any) => ({
        id: n.id,
        author: n.author,
        role: n.role,
        createdAt: n.createdAt,
        message: n.message
      })),
      risks: (project.risks || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        probability: r.probability,
        impact: r.impact,
        mitigation: r.mitigation,
        status: r.status
      })),
      metrics: canFinance ? (project.metrics || {}) : { ...(project.metrics || {}), budgetPlanned: undefined, budgetUsed: undefined },
      quote: project.quote ? {
        id: project.quote.id,
        version: project.quote.version,
        totalHT: canQuotes ? project.quote.totalHT : undefined,
        totalTTC: canQuotes ? project.quote.totalTTC : undefined,
        validUntil: project.quote.validUntil,
        status: project.quote.status
      } : null,
      statusHistory: (project.statusHistory || []).map((s: any) => ({
        date: s.date,
        status: s.status,
        author: s.author,
        note: s.note
      })),
      quotes: canQuotes ? linkedQuotes : [],
      invoices: canFinance ? linkedInvoices : [],
      interventions,
      interventionPhotos,
      galleryPhotos: sharedImages.map((img: any) => ({ id: String(img._id), url: img.url, caption: img.title || img.filename, date: img.createdAt })),
      reception: project.reception?.requestedAt ? {
        requestedAt: project.reception.requestedAt,
        warrantyMonths: project.reception.warrantyMonths,
        signedAt: project.reception.signedAt,
        decision: project.reception.decision,
        reserves: project.reception.reserves,
        signature: project.reception.signature,
        signatureName: project.reception.signatureName,
        signatureTitle: project.reception.signatureTitle,
        warrantyEnd: project.reception.warrantyEnd,
        reservesLiftedAt: project.reception.reservesLiftedAt,
      } : null,
      canSignReception: caps.has('interventions:ack'),
      nextMaintenance: project.nextMaintenance,
      maintenanceWindow: project.maintenanceWindow,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }

    return NextResponse.json({ success: true, project: response })
  } catch (error) {
    console.error('[GET /api/client-enterprise/projects/[id]]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
