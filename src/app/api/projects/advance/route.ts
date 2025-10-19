import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (String(decoded.role).toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
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
