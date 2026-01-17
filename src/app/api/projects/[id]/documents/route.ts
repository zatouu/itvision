import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (role !== 'ADMIN') throw new Error('Accès non autorisé')
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const doc = body?.document
    if (!id || !doc?.id || !doc?.name || !doc?.url) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { documents: doc } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout document' }, { status: 500 })
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
