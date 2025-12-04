import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import Project from '@/lib/models/Project'
import User from '@/lib/models/User'
import { connectMongoose } from '@/lib/mongoose'
import { logDataAccess } from '@/lib/security-logger'

async function verifyToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Token manquant')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  return decoded
}

// GET - Récupérer les projets
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction du filtre selon le rôle
    let where: any = {}
    
    if (role === 'CLIENT') {
      // Les clients ne voient que leurs projets
      where.clientId = userId
    }
    // Les admins et techniciens voient tous les projets
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }
    
    // Récupération des projets (Mongoose)
    const query: any = {}
    if (where.clientId) query.clientId = where.clientId
    if (where.status) query.status = where.status

    const [projects, totalCount] = await Promise.all([
      Project.find(query)
        .populate('clientId', 'id name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(query)
    ])
    
    logDataAccess('projects', 'read', request, userId, { count: projects.length })
    
    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        total: totalCount,
        page: Math.floor(skip / limit) + 1,
        limit,
        hasMore: skip + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Erreur récupération projets:', error)
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 401 }
    )
  }
}

// POST - Créer un nouveau projet
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    
    // Seuls les admins peuvent créer des projets
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    const projectData = await request.json()
    
    // Validation des données requises
    const requiredFields = ['name', 'address', 'clientId', 'startDate']
    for (const field of requiredFields) {
      if (!projectData[field]) {
        return NextResponse.json(
          { error: `Champ requis manquant: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Vérification que le client existe
    const client = await User.findOne({ _id: projectData.clientId, role: 'CLIENT' }).lean()
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }
    
    // Création du projet
    const created = await Project.create({
      name: projectData.name,
      description: projectData.description || '',
      address: projectData.address,
      clientId: projectData.clientId,
      status: (projectData.status || 'lead').toLowerCase(),
      startDate: new Date(projectData.startDate),
      endDate: projectData.endDate ? new Date(projectData.endDate) : undefined,
      currentPhase: projectData.currentPhase || '',
      progress: projectData.progress || 0,
      serviceType: projectData.serviceType || '',
      clientSnapshot: projectData.clientSnapshot,
      site: projectData.site,
      assignedTo: projectData.assignedTo || [],
      value: projectData.value || 0,
      margin: projectData.margin || 0,
      milestones: projectData.milestones || [],
      quote: projectData.quote || null,
      products: projectData.products || [],
      timeline: projectData.timeline || [],
      risks: projectData.risks || [],
      documents: projectData.documents || [],
      clientAccess: !!projectData.clientAccess
    })

    const newProject = (await Project.findById(created._id)
      .populate('clientId', 'id name email phone')
      .lean()) as any

    if (!newProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé après création' },
        { status: 404 }
      )
    }
    
    logDataAccess('projects', 'create', request, userId, { projectId: String(newProject._id) })
    
    return NextResponse.json({
      success: true,
      project: newProject,
      message: 'Projet créé avec succès'
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création projet:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du projet' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un projet
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const updateData = await request.json()
    const projectId = updateData.id
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }
    
    // Seuls les admins peuvent modifier des projets
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    // Vérification que le projet existe
    const existingProject = await Project.findById(projectId)
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }
    
    // Mise à jour du projet
    await Project.updateOne(
      { _id: projectId },
      {
        $set: {
          name: updateData.name ?? existingProject.name,
          description: updateData.description ?? existingProject.description,
          address: updateData.address ?? existingProject.address,
          status: (updateData.status || existingProject.status),
          endDate: updateData.endDate ? new Date(updateData.endDate) : null,
          currentPhase: updateData.currentPhase ?? existingProject.currentPhase,
          progress: typeof updateData.progress === 'number' ? updateData.progress : existingProject.progress,
          serviceType: updateData.serviceType ?? existingProject.serviceType,
          clientSnapshot: updateData.clientSnapshot ?? existingProject.clientSnapshot,
          site: updateData.site ?? existingProject.site,
          assignedTo: updateData.assignedTo ?? existingProject.assignedTo,
          value: typeof updateData.value === 'number' ? updateData.value : existingProject.value,
          margin: typeof updateData.margin === 'number' ? updateData.margin : existingProject.margin,
          milestones: updateData.milestones ?? existingProject.milestones,
          quote: updateData.quote ?? existingProject.quote,
          products: updateData.products ?? existingProject.products,
          timeline: updateData.timeline ?? existingProject.timeline,
          risks: updateData.risks ?? existingProject.risks,
          documents: updateData.documents ?? existingProject.documents,
          clientAccess: typeof updateData.clientAccess === 'boolean' ? updateData.clientAccess : existingProject.clientAccess,
          updatedAt: new Date()
        }
      }
    )

    const updatedProject = (await Project.findById(projectId)
      .populate('clientId', 'id name email phone')
      .lean()) as any

    if (!updatedProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé après mise à jour' },
        { status: 404 }
      )
    }
    
    logDataAccess('projects', 'update', request, userId, { projectId: String(updatedProject._id) })
    
    return NextResponse.json({
      success: true,
      project: updatedProject,
      message: 'Projet mis à jour avec succès'
    })

  } catch (error) {
    console.error('Erreur mise à jour projet:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un projet
export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)

    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    let projectId: string | null = null
    try {
      const body = await request.json()
      projectId = body?.id || body?._id || null
    } catch {
      // Aucun corps JSON, on tentera d'utiliser les query params
    }

    if (!projectId) {
      const { searchParams } = new URL(request.url)
      projectId = searchParams.get('id')
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'ID du projet requis' },
        { status: 400 }
      )
    }

    const existingProject = await Project.findById(projectId)
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }

    await Project.deleteOne({ _id: projectId })

    logDataAccess('projects', 'delete', request, userId, { projectId: String(projectId) })

    return NextResponse.json({
      success: true,
      message: 'Projet supprimé avec succès'
    })
  } catch (error) {
    console.error('Erreur suppression projet:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du projet' },
      { status: 500 }
    )
  }
}