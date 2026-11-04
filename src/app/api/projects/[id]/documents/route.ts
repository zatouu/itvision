import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'
import { notifyProjectDocument } from '@/lib/portal/project-notify'

const DOC_TYPES = ['quote', 'contract', 'invoice', 'technical', 'photo', 'manual']

function safeUrl(raw: unknown) {
  const url = String(raw || '').trim()
  return /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) ? url.slice(0, 2000) : ''
}

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase())) throw new Error('Accès non autorisé')
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const raw = body?.document
    const url = safeUrl(raw?.url)
    if (!id || !raw?.id || !raw?.name || !url) return NextResponse.json({ error: 'Paramètres invalides (lien http(s) attendu)' }, { status: 400 })
    const doc = {
      id: String(raw.id).slice(0, 64),
      name: String(raw.name).trim().slice(0, 200),
      url,
      type: DOC_TYPES.includes(raw.type) ? raw.type : 'technical',
      uploadDate: new Date(),
      clientVisible: raw.clientVisible === true,
    }

    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { documents: doc } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    if (doc.clientVisible) notifyProjectDocument(updated.toObject(), doc).catch(() => {})
    return NextResponse.json({ success: true, project: updated, document: doc })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout document' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json().catch(() => null)
    const documentId = String(body?.documentId || '')
    if (!id || !documentId || typeof body?.clientVisible !== 'boolean') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findOneAndUpdate(
      { _id: id, 'documents.id': documentId },
      { $set: { 'documents.$.clientVisible': body.clientVisible } },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    const doc = (updated.documents || []).find((d: any) => d.id === documentId)
    if (body.clientVisible && doc) notifyProjectDocument(updated.toObject(), doc).catch(() => {})
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour document' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    if (!id || !documentId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $pull: { documents: { id: documentId } } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression document' }, { status: 500 })
  }
}
