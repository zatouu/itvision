import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import { requireAuth } from '@/lib/jwt'

async function verifyAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (role !== 'ADMIN') throw new Error('Accès non autorisé')
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await verifyAdmin(request)
    const body = await request.json()
    const { id, nextPhase, progress } = body
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(id, { $set: { currentPhase: nextPhase, progress } }, { new: true })
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur avance phase' }, { status: 500 })
  }
}
