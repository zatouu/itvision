import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'

function fmt(v: number) {
  return Math.round(v).toLocaleString('fr-FR')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
    }

    await connectDB()
    const userId = new mongoose.Types.ObjectId(auth.user.id)
    const companyId = new mongoose.Types.ObjectId(auth.user.companyClientId)

    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(id),
      $or: [{ clientId: userId }, { clientCompanyId: companyId }]
    }).lean() as any

    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    // Filtrer les données sensibles / non visibles par le client
    const clientVisibleTimeline = (project.timeline || []).filter((t: any) => t.clientVisible !== false)
    const clientVisibleDocuments = (project.documents || []).filter((d: any) => d.clientVisible !== false)
    const clientVisibleNotes = (project.sharedNotes || []).filter((n: any) => n.clientVisible !== false)

    // Enrichir avec devis et factures liées au projet
    const [linkedQuotes, linkedInvoices] = await Promise.all([
      AdminQuote.find({ projectId: new mongoose.Types.ObjectId(id) })
        .select('numero title date status total clientResponse clientRespondedAt clientCounterAmount bonCommande')
        .sort({ date: -1 })
        .lean(),
      AdminInvoice.find({ projectId: new mongoose.Types.ObjectId(id) })
        .select('numero date dueDate status total paidAt')
        .sort({ date: -1 })
        .lean()
    ])

    const response = {
      _id: String(project._id),
      name: project.name,
      description: project.description,
      status: project.status,
      currentPhase: project.currentPhase,
      progress: project.progress ?? 0,
      serviceType: project.serviceType,
      address: project.address,
      startDate: project.startDate,
      endDate: project.endDate,
      value: project.value ?? 0,
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
        unitPrice: p.unitPrice,
        totalPrice: p.totalPrice,
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
      metrics: project.metrics || {},
      quote: project.quote ? {
        id: project.quote.id,
        version: project.quote.version,
        totalHT: project.quote.totalHT,
        totalTTC: project.quote.totalTTC,
        validUntil: project.quote.validUntil,
        status: project.quote.status
      } : null,
      statusHistory: (project.statusHistory || []).map((s: any) => ({
        date: s.date,
        status: s.status,
        author: s.author,
        note: s.note
      })),
      quotes: linkedQuotes,
      invoices: linkedInvoices,
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
