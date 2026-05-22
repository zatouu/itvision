import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProjectImage from '@/lib/models/ProjectImage'
import { requireAuth } from '@/lib/jwt'

async function requireAdmin(request: NextRequest) {
  const { role } = await requireAuth(request)
  if (role !== 'ADMIN') throw new Error('Accès non autorisé')
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
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
    const image = await ProjectImage.create({
      projectId: id,
      filename: body.filename,
      url: body.url,
      title: body.title,
      description: body.description,
      isMain: body.isMain || false,
      order: body.order || 0
    })
    return NextResponse.json({ success: true, image })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout image' }, { status: 500 })
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
