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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Projet manquant' }, { status: 400 })
    }

    const project = await Project.findById(id).select('products name').lean() as any
    if (!project) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project._id?.toString(),
        name: project.name
      },
      products: Array.isArray(project.products) ? project.products : []
    })
  } catch (error) {
    console.error('Erreur récupération produits projet:', error)
    return NextResponse.json({ error: 'Erreur récupération produits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const product = body?.product
    if (!id || !product?.productId || !product?.name) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $push: { products: product } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur ajout produit' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const body = await request.json()
    const { productId, updates } = body
    if (!id || !productId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const proj = await Project.findById(id)
    if (!proj) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    }
    
    (proj as any).products = ((proj as any).products || []).map((p: any) => (p.productId === productId ? { ...p.toObject?.() || p, ...updates } : p))
    await proj.save()
    return NextResponse.json({ success: true, project: proj })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour produit' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireAdmin(request)
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    if (!id || !productId) return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })

    const updated = await Project.findByIdAndUpdate(
      id,
      { $pull: { products: { productId } } as any },
      { new: true }
    )
    if (!updated) return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 })
    return NextResponse.json({ success: true, project: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression produit' }, { status: 500 })
  }
}
