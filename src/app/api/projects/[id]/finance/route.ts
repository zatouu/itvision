import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { ADMIN_ROLES, authErrorResponse, requireApiUser } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { computeProjectFinance, syncProjectFinance } from '@/lib/finance/project-finance'
import { projectsCollection } from '@/lib/projects/persistence'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]/finance[?candidates=1]
 * Devis et factures liés, montants consolidés (contrat, facturé, encaissé, reste) et alertes de cohérence.
 * candidates=1 : devis/factures non rattachés à un projet, du même client en priorité, pour liaison.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiUser(request, [...ADMIN_ROLES, 'ACCOUNTANT'])
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    await connectMongoose()
    const project = await projectsCollection().findOne({ _id: new mongoose.Types.ObjectId(id) }, { projection: { clientCompanyId: 1, clientId: 1 } }) as any
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

    const finance = await computeProjectFinance(id)
    let candidates: { quotes: any[]; invoices: any[] } | undefined
    if (new URL(request.url).searchParams.get('candidates') === '1') {
      const sameClient: any[] = []
      if (project.clientCompanyId) sameClient.push({ clientCompanyId: project.clientCompanyId })
      if (project.clientId) sameClient.push({ clientUserId: project.clientId })
      const unlinked = { $or: [{ projectId: { $exists: false } }, { projectId: null }] }
      const scope = sameClient.length ? { $and: [unlinked, { $or: sameClient }] } : unlinked
      const [quotes, invoices] = await Promise.all([
        AdminQuote.find({ ...scope, status: { $ne: 'superseded' } }).select('numero title status total date client.name').sort({ date: -1 }).limit(50).lean(),
        AdminInvoice.find({ ...scope, status: { $ne: 'cancelled' } }).select('numero status total date client.name quoteId').sort({ date: -1 }).limit(50).lean(),
      ])
      // Rien pour ce client : proposer les plus récents non rattachés
      const fallback = !quotes.length && !invoices.length && sameClient.length
      const [fq, fi] = fallback
        ? await Promise.all([
          AdminQuote.find({ ...unlinked, status: { $ne: 'superseded' } }).select('numero title status total date client.name').sort({ date: -1 }).limit(30).lean(),
          AdminInvoice.find({ ...unlinked, status: { $ne: 'cancelled' } }).select('numero status total date client.name quoteId').sort({ date: -1 }).limit(30).lean(),
        ])
        : [quotes, invoices]
      const shape = (d: any) => ({ id: String(d._id), numero: d.numero, title: d.title, status: d.status, total: Math.round(Number(d.total) || 0), date: d.date, clientName: d.client?.name })
      candidates = { quotes: (fq as any[]).map(shape), invoices: (fi as any[]).map(shape) }
    }
    return NextResponse.json({ success: true, finance, candidates })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('GET /api/projects/[id]/finance:', error)
    return NextResponse.json({ error: 'Erreur de chargement des finances du projet' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/finance { action, quoteId? , invoiceId? }
 * action : link-quote | unlink-quote | link-invoice | unlink-invoice.
 * Lier un devis rattache aussi ses factures ; le rattachement est une métadonnée (autorisé sur un devis accepté).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiUser(request, ADMIN_ROLES)
    const { id } = await params
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: 'Projet invalide' }, { status: 400 })
    const body = await request.json().catch(() => ({}))
    const action = String(body?.action || '')
    const pid = new mongoose.Types.ObjectId(id)
    await connectMongoose()
    if (!(await projectsCollection().findOne({ _id: pid }, { projection: { _id: 1 } }))) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const others = new Set<string>()
    if (action === 'link-quote' || action === 'unlink-quote') {
      const quoteId = String(body?.quoteId || '')
      if (!mongoose.isValidObjectId(quoteId)) return NextResponse.json({ error: 'Devis invalide' }, { status: 400 })
      const quote = await AdminQuote.findById(quoteId).select('projectId numero').lean() as any
      if (!quote) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })
      if (action === 'link-quote') {
        if (quote.projectId && String(quote.projectId) !== id) others.add(String(quote.projectId))
        await AdminQuote.updateOne({ _id: quoteId }, { $set: { projectId: pid } })
        const moved = await AdminInvoice.find({ quoteId, projectId: { $ne: pid } }).select('projectId').lean() as any[]
        moved.forEach(m => m.projectId && others.add(String(m.projectId)))
        await AdminInvoice.updateMany({ quoteId }, { $set: { projectId: pid } })
      } else {
        if (String(quote.projectId || '') !== id) return NextResponse.json({ error: 'Ce devis n’est pas lié à ce projet' }, { status: 409 })
        await AdminQuote.updateOne({ _id: quoteId }, { $unset: { projectId: 1 } })
        await AdminInvoice.updateMany({ quoteId, projectId: pid }, { $unset: { projectId: 1 } })
      }
    } else if (action === 'link-invoice' || action === 'unlink-invoice') {
      const invoiceId = String(body?.invoiceId || '')
      if (!mongoose.isValidObjectId(invoiceId)) return NextResponse.json({ error: 'Facture invalide' }, { status: 400 })
      const invoice = await AdminInvoice.findById(invoiceId).select('projectId quoteId').lean() as any
      if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
      if (action === 'link-invoice') {
        if (invoice.projectId && String(invoice.projectId) !== id) others.add(String(invoice.projectId))
        await AdminInvoice.updateOne({ _id: invoiceId }, { $set: { projectId: pid } })
      } else {
        if (String(invoice.projectId || '') !== id) return NextResponse.json({ error: 'Cette facture n’est pas liée à ce projet' }, { status: 409 })
        await AdminInvoice.updateOne({ _id: invoiceId }, { $unset: { projectId: 1 } })
      }
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
    }

    const finance = await syncProjectFinance(id)
    others.forEach(o => { syncProjectFinance(o).catch(() => {}) })
    return NextResponse.json({ success: true, finance })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('POST /api/projects/[id]/finance:', error)
    return NextResponse.json({ error: 'Mise à jour des liens impossible' }, { status: 500 })
  }
}
