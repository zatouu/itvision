import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProjectImage from '@/lib/models/ProjectImage'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'
import { notifyProjectDocument } from '@/lib/portal/project-notify'

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase())) throw new Error('Accès non autorisé')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    try { await requireAdmin(request) } catch { return NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
    const { id } = await params
    const images = await ProjectImage.find({ projectId: id }).sort({ order: 1, createdAt: -1 }).lean()
    return NextResponse.json({ images })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur récupération images' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const url = String(body?.url || '').trim()
    if (!/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url)) return NextResponse.json({ error: 'Lien http(s) attendu' }, { status: 400 })
    const image = await ProjectImage.create({
      projectId: id,
      filename: body.filename,
      url,
      title: body.title,
      description: body.description,
      isMain: body.isMain || false,
      order: body.order || 0,
      clientVisible: body.clientVisible === true
    })
    if (image.clientVisible) {
      const project = await Project.findById(id).select('name status clientAccess clientCompanyId').lean() as any
      if (project) notifyProjectDocument(project, { name: body.title || body.filename, type: 'photo' }).catch(() => {})
    }
    return NextResponse.json({ success: true, image })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout image' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    try { await requireAdmin(request) } catch { return NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
    const { id } = await params
    const body = await request.json().catch(() => null)
    const imageIds: string[] = Array.isArray(body?.imageIds) ? body.imageIds.map(String) : body?.imageId ? [String(body.imageId)] : []
    if (!imageIds.length || typeof body?.clientVisible !== 'boolean') return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const res = await ProjectImage.updateMany({ _id: { $in: imageIds }, projectId: id }, { $set: { clientVisible: body.clientVisible } })
    if (body.clientVisible && res.modifiedCount > 0) {
      const project = await Project.findById(id).select('name status clientAccess clientCompanyId').lean() as any
      if (project) notifyProjectDocument(project, {
        name: res.modifiedCount > 1 ? `${res.modifiedCount} nouvelles photos du chantier` : 'Photo ajoutée par IT Vision',
        type: 'photo',
      }).catch(() => {})
    }
    return NextResponse.json({ success: true, modified: res.modifiedCount })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour image' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')
    if (!imageId) return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    await ProjectImage.findByIdAndDelete(imageId)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression image' }, { status: 500 })
  }
}
