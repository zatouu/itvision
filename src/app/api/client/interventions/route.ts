import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import User from '@/lib/models/User'
import { getJwtSecretKey } from '@/lib/jwt-secret'

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

  const secret = getJwtSecretKey()
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

    // Récupérer tous les projets du client
    const projects = await Project.find({ clientId: userId }).select('_id').lean()
    const projectIds = projects.map((p: any) => p._id.toString())

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')
    
    const query: any = { 
      projectId: projectId || { $in: projectIds }
    }
    
    if (status && status !== 'all') {
      query.status = status
    }

    const interventions = await Intervention.find(query)
      .sort({ date: -1 })
      .lean()
    
    // Peupler manuellement les techniciens et projets
    const technicianIds = [...new Set(interventions.map((i: any) => i.technicienId).filter(Boolean))]
    const technicians = await User.find({ _id: { $in: technicianIds }, role: 'TECHNICIAN' }).select('name email phone').lean()
    const technicianMap = new Map(technicians.map((t: any) => [t._id.toString(), t]))
    
    const projectIdsToPopulate = [...new Set(interventions.map((i: any) => i.projectId).filter(Boolean))]
    const projectsToPopulate = await Project.find({ _id: { $in: projectIdsToPopulate } }).select('name address').lean()
    const projectMap = new Map(projectsToPopulate.map((p: any) => [p._id.toString(), p]))

    return NextResponse.json({
      success: true,
      interventions: interventions.map((i: any) => ({
        _id: i._id.toString(),
        interventionNumber: i.interventionNumber,
        date: i.date,
        heureDebut: i.heureDebut,
        heureFin: i.heureFin,
        duree: i.duree,
        site: i.site,
        status: i.status,
        activites: i.activites,
        observations: i.observations,
        recommandations: i.recommandations,
        photosAvant: i.photosAvant,
        photosApres: i.photosApres,
        quoteGenerated: i.quoteGenerated,
        quoteId: i.quoteId,
        technicien: i.technicienId ? technicianMap.get(i.technicienId.toString()) : null,
        project: i.projectId ? projectMap.get(i.projectId.toString()) : null,
        createdAt: i.createdAt
      }))
    })
  } catch (error) {
    console.error('Erreur récupération interventions client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

