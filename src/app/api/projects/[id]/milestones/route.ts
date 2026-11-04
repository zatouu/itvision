import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'
import { notifyProjectChange, shareProjectPlanning } from '@/lib/portal/project-notify'

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (!['ADMIN', 'SUPER_ADMIN'].includes(String(role || '').toUpperCase())) throw new Error('Accès non autorisé')
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const body = await request.json()
    const { id } = await params

    // Action explicite « Envoyer le planning au client » : mail aux contacts + notif portail, une seule fois
    if (body?.action === 'share-planning') {
      const project = await Project.findById(id).lean() as any
      if (!project) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
      if (!(project.milestones || []).length) return NextResponse.json({ error: 'Aucun jalon à envoyer' }, { status: 400 })
      const result = await shareProjectPlanning(project)
      return NextResponse.json({ success: true, ...result })
    }

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const body = await request.json()
    const { id } = await params
    const { milestoneId, updates } = body
    if (!id || !milestoneId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const proj = await Project.findById(id)
    if (!proj) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }
    
    const before = (proj as any).toObject()
    ;(proj as any).milestones = ((proj as any).milestones || []).map((m: any) => (m.id === milestoneId ? { ...m.toObject?.() || m, ...updates } : m))
    await proj.save()
    void notifyProjectChange(before, (proj as any).toObject()).catch(e => console.error('[milestones] notification:', e))
    return NextResponse.json({ success: true, project: proj })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour jalon' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { searchParams } = new URL(request.url)
    const { id } = await params
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
