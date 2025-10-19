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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = params
    const body = await request.json()
    const quote = body?.quote
    if (!id || !quote) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $set: { quote } },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour devis' }, { status: 500 })
  }
}
