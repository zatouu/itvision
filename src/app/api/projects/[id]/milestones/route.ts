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
    const body = await request.json()
    const { id } = params
    const milestone = body?.milestone
    if (!id || !milestone?.id || !milestone?.name) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { milestones: milestone } },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout jalon' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const body = await request.json()
    const { id } = params
    const { milestoneId, updates } = body
    if (!id || !milestoneId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const proj = await Project.findById(id)
    if (!proj) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    // @ts-ignore
    proj.milestones = (proj.milestones || []).map((m: any) => m.id === milestoneId ? { ...m.toObject?.() || m, ...updates } : m)
    await proj.save()
    return NextResponse.json({ success: true, project: proj })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour jalon' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const { id } = params
    const milestoneId = searchParams.get('milestoneId')
    if (!id || !milestoneId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $pull: { milestones: { id: milestoneId } } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression jalon' }, { status: 500 })
  }
}
