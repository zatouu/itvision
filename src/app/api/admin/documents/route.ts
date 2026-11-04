import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { authErrorResponse, requireApiUser } from '@/lib/api-auth'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import { projectsCollection } from '@/lib/projects/persistence'
import { notifyProjectDocument } from '@/lib/portal/project-notify'

export const dynamic = 'force-dynamic'

/**
 * Bibliothèque documentaire admin : vue unique des pièces stockées sur les projets
 * (Project.documents), les devis et les factures (attachments). Aucun nouveau stockage :
 * chaque document reste rattaché à son dossier.
 */

const DOC_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT']
const PROJECT_DOC_TYPES = ['quote', 'contract', 'invoice', 'technical', 'photo', 'manual']
const ATTACHMENT_CATEGORIES = ['bon_commande', 'recu', 'contrat', 'cheque', 'autre']
const SOURCES = ['project', 'quote', 'invoice'] as const
type Source = typeof SOURCES[number]

export interface LibraryDocument {
  key: string
  docId: string
  source: Source
  parentId: string
  parentLabel: string
  projectId?: string
  projectName?: string
  clientName?: string
  name: string
  url: string
  kind: 'pdf' | 'image' | 'office' | 'other'
  category: string
  size?: number
  date?: string
  clientVisible?: boolean
}

function kindOf(url: string, mime?: string): LibraryDocument['kind'] {
  const u = url.split('?')[0].toLowerCase()
  const m = (mime || '').toLowerCase()
  if (u.endsWith('.pdf') || m === 'application/pdf') return 'pdf'
  if (/\.(png|jpe?g|webp|gif)$/.test(u) || m.startsWith('image/')) return 'image'
  if (/\.(docx?|xlsx?|csv)$/.test(u) || /word|excel|spreadsheet/.test(m)) return 'office'
  return 'other'
}

function safeUrl(raw: unknown) {
  const url = String(raw || '').trim()
  return /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url.slice(0, 2000) : ''
}

const iso = (d: any) => (d ? new Date(d).toISOString() : undefined)

async function collect(): Promise<LibraryDocument[]> {
  const [projects, quotes, invoices] = await Promise.all([
    projectsCollection().find({ 'documents.0': { $exists: true } }, { projection: { name: 1, documents: 1, clientSnapshot: 1 } }).limit(3000).toArray(),
    AdminQuote.find({ 'attachments.0': { $exists: true } }).select('numero title attachments projectId client.name').limit(3000).lean(),
    AdminInvoice.find({ 'attachments.0': { $exists: true } }).select('numero attachments projectId client.name').limit(3000).lean(),
  ])
  const projectNames = new Map<string, string>()
  const linkedIds = [...(quotes as any[]), ...(invoices as any[])].map(d => d.projectId).filter(Boolean).map(String)
  if (linkedIds.length) {
    const linked = await projectsCollection()
      .find({ _id: { $in: Array.from(new Set(linkedIds)).filter(mongoose.isValidObjectId).map(i => new mongoose.Types.ObjectId(i)) } }, { projection: { name: 1 } })
      .toArray()
    linked.forEach((p: any) => projectNames.set(String(p._id), p.name))
  }

  const out: LibraryDocument[] = []
  for (const p of projects as any[]) {
    for (const d of p.documents || []) {
      if (!d?.url) continue
      out.push({
        key: `project:${p._id}:${d.id}`,
        docId: String(d.id),
        source: 'project',
        parentId: String(p._id),
        parentLabel: p.name,
        projectId: String(p._id),
        projectName: p.name,
        clientName: p.clientSnapshot?.company || p.clientSnapshot?.contact,
        name: d.name || 'Document',
        url: d.url,
        kind: kindOf(d.url),
        category: d.type || 'technical',
        date: iso(d.uploadDate),
        clientVisible: !!d.clientVisible,
      })
    }
  }
  const pushAttachments = (docs: any[], source: 'quote' | 'invoice') => {
    for (const doc of docs) {
      ;(doc.attachments || []).forEach((a: any, index: number) => {
        if (!a?.url) return
        out.push({
          key: `${source}:${doc._id}:${index}:${a.url}`,
          docId: a.url,
          source,
          parentId: String(doc._id),
          parentLabel: `${source === 'quote' ? 'Devis' : 'Facture'} ${doc.numero}${doc.title ? ` — ${doc.title}` : ''}`,
          projectId: doc.projectId ? String(doc.projectId) : undefined,
          projectName: doc.projectId ? projectNames.get(String(doc.projectId)) : undefined,
          clientName: doc.client?.name,
          name: a.name || 'Pièce jointe',
          url: a.url,
          kind: kindOf(a.url, a.type),
          category: a.category || 'autre',
          size: a.size,
          date: iso(a.uploadedAt),
        })
      })
    }
  }
  pushAttachments(quotes as any[], 'quote')
  pushAttachments(invoices as any[], 'invoice')
  return out
}

/** GET ?q=&source=&kind=&projectId=&page=&limit= */
export async function GET(request: NextRequest) {
  try {
    await requireApiUser(request, DOC_ROLES)
    await connectMongoose()
    const sp = new URL(request.url).searchParams
    const q = (sp.get('q') || '').trim().toLowerCase()
    const source = sp.get('source') || 'all'
    const kind = sp.get('kind') || 'all'
    const projectId = sp.get('projectId') || ''
    const limit = Math.min(100, Math.max(6, Number(sp.get('limit')) || 24))
    const page = Math.max(1, Number(sp.get('page')) || 1)

    const all = await collect()
    const filtered = all
      .filter(d => source === 'all' || d.source === source)
      .filter(d => kind === 'all' || d.kind === kind)
      .filter(d => !projectId || d.projectId === projectId)
      .filter(d => !q || [d.name, d.parentLabel, d.projectName, d.clientName, d.category].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    const stats = {
      total: all.length,
      bySource: Object.fromEntries(SOURCES.map(s => [s, all.filter(d => d.source === s).length])),
      byKind: Object.fromEntries(['pdf', 'image', 'office', 'other'].map(k => [k, all.filter(d => d.kind === k).length])),
      sharedWithClients: all.filter(d => d.clientVisible).length,
    }
    return NextResponse.json({
      success: true,
      documents: filtered.slice((page - 1) * limit, page * limit),
      total: filtered.length,
      page,
      pages: Math.max(1, Math.ceil(filtered.length / limit)),
      stats,
    })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('GET /api/admin/documents:', error)
    return NextResponse.json({ error: 'Erreur de chargement des documents' }, { status: 500 })
  }
}

/**
 * POST { target: project|quote|invoice, targetId, file: { name, url, type?, size? }, category?, clientVisible? }
 * Rattache un fichier déjà envoyé (/api/admin/documents/upload) à son dossier.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser(request, DOC_ROLES)
    await connectMongoose()
    const body = await request.json().catch(() => ({}))
    const target = String(body?.target || '') as Source
    const targetId = String(body?.targetId || '')
    const url = safeUrl(body?.file?.url)
    const name = String(body?.file?.name || '').trim().slice(0, 200)
    if (!SOURCES.includes(target) || !mongoose.isValidObjectId(targetId) || !url || !name) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    if (target === 'project' && user.role === 'ACCOUNTANT') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (target === 'project') {
      const doc = {
        id: new mongoose.Types.ObjectId().toString(),
        name,
        url,
        type: PROJECT_DOC_TYPES.includes(body?.category) ? body.category : 'technical',
        uploadDate: new Date(),
        clientVisible: body?.clientVisible === true,
      }
      // Driver mongodb 6 : findOneAndUpdate renvoie directement le document (son champ `value` est le montant)
      const project = await projectsCollection().findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(targetId) },
        { $push: { documents: doc } as any, $set: { updatedAt: new Date() } },
        { returnDocument: 'after' }
      ) as any
      if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
      if (doc.clientVisible) notifyProjectDocument(project, doc).catch(() => {})
      return NextResponse.json({ success: true }, { status: 201 })
    }

    const attachment = {
      name,
      url,
      type: String(body?.file?.type || '').slice(0, 120),
      size: Math.max(0, Number(body?.file?.size) || 0),
      uploadedAt: new Date(),
      uploadedBy: user.userId,
      category: ATTACHMENT_CATEGORIES.includes(body?.category) ? body.category : 'autre',
    }
    const Model: any = target === 'quote' ? AdminQuote : AdminInvoice
    const res = await Model.updateOne({ _id: targetId }, { $push: { attachments: attachment } })
    if (!res.matchedCount) return NextResponse.json({ error: target === 'quote' ? 'Devis introuvable' : 'Facture introuvable' }, { status: 404 })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('POST /api/admin/documents:', error)
    return NextResponse.json({ error: 'Rattachement du document impossible' }, { status: 500 })
  }
}

/** PATCH { source: project, parentId, docId, clientVisible } — partage d'un document projet sur le portail client. */
export async function PATCH(request: NextRequest) {
  try {
    await requireApiUser(request, ['ADMIN', 'SUPER_ADMIN'])
    await connectMongoose()
    const body = await request.json().catch(() => ({}))
    const parentId = String(body?.parentId || '')
    const docId = String(body?.docId || '')
    if (body?.source !== 'project' || !mongoose.isValidObjectId(parentId) || !docId || typeof body?.clientVisible !== 'boolean') {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    const project = await projectsCollection().findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(parentId), 'documents.id': docId },
      { $set: { 'documents.$.clientVisible': body.clientVisible, updatedAt: new Date() } },
      { returnDocument: 'after' }
    ) as any
    if (!project) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    const doc = (project.documents || []).find((d: any) => d.id === docId)
    if (body.clientVisible && doc) notifyProjectDocument(project, doc).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('PATCH /api/admin/documents:', error)
    return NextResponse.json({ error: 'Modification impossible' }, { status: 500 })
  }
}

/** DELETE ?source=&parentId=&docId= (docId = id du document projet, ou URL de la pièce jointe) */
export async function DELETE(request: NextRequest) {
  try {
    await requireApiUser(request, ['ADMIN', 'SUPER_ADMIN'])
    await connectMongoose()
    const sp = new URL(request.url).searchParams
    const source = sp.get('source') as Source
    const parentId = sp.get('parentId') || ''
    const docId = sp.get('docId') || ''
    if (!SOURCES.includes(source) || !mongoose.isValidObjectId(parentId) || !docId) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    let matched = 0
    if (source === 'project') {
      const res = await projectsCollection().updateOne(
        { _id: new mongoose.Types.ObjectId(parentId) },
        { $pull: { documents: { id: docId } } as any, $set: { updatedAt: new Date() } }
      )
      matched = res.modifiedCount
    } else {
      const Model: any = source === 'quote' ? AdminQuote : AdminInvoice
      const res = await Model.updateOne({ _id: parentId }, { $pull: { attachments: { url: docId } } })
      matched = res.modifiedCount
    }
    if (!matched) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('DELETE /api/admin/documents:', error)
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
  }
}
