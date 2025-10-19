import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (String(decoded.role).toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = params
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = params
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
