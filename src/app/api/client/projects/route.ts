import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  
  if (!payload.userId || !payload.role || !payload.email) {
    throw new Error('Token invalide')
  }
  
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    
    const query: any = { clientId: userId }
    if (status && status !== 'all') {
      query.status = status
    }

    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      projects: projects.map((p: any) => ({
        _id: p._id.toString(),
        name: p.name,
        description: p.description,
        status: p.status,
        progress: p.progress || 0,
        currentPhase: p.currentPhase,
        address: p.address,
        startDate: p.startDate,
        endDate: p.endDate,
        budget: p.budget,
        serviceType: p.serviceType,
        assignedTo: p.assignedTo,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        milestones: p.milestones || [],
        documents: (p.documents || []).filter((d: any) => d.clientVisible !== false)
      }))
    })
  } catch (error) {
    console.error('Erreur récupération projets client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

