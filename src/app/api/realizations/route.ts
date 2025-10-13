import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import Realization from '@/lib/models/Realization'
import { connectMongoose } from '@/lib/mongoose'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured') === 'true'
    const limit = parseInt(searchParams.get('limit') || '10')

    const query: any = {}
    if (featured) query.featured = true

    const realizations = await Realization.find(query)
      .sort({ featured: -1, order: 1, createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      realizations
    })

  } catch (error) {
    console.error('Erreur récupération réalisations:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      location,
      description,
      services,
      mainImage,
      images,
      featured,
      order
    } = body

    if (!title || !location || !description || !mainImage) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const realization = await Realization.create({
      title,
      location,
      description,
      services: services || [],
      mainImage,
      images: images || [],
      featured: featured || false,
      order: order || 0
    })

    return NextResponse.json({
      success: true,
      realization
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création réalisation:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}