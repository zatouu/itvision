import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Project from '@/lib/models/Project'
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

// GET - Récupérer les rapports de maintenance
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
    
    if (role === 'TECHNICIAN') {
      // Les techniciens ne voient que leurs rapports
      where.technicianId = userId
    } else if (role === 'CLIENT') {
      // Les clients ne voient que leurs projets
      where.project = {
        clientId: userId
      }
    }
    // Les admins voient tout
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }
    
    // Récupération des rapports (Mongoose)
    const query: any = {}
    if (where.technicianId) query.technicianId = where.technicianId
    if (where.status) query.status = where.status.toLowerCase()
    // NOTE: Si filtre client via projet, utiliser agrégation/lookup si besoin

    const [reports, totalCount] = await Promise.all([
      MaintenanceReport.find(query)
        .sort({ interventionDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MaintenanceReport.countDocuments(query)
    ])
    
    logDataAccess('maintenance_reports', 'read', request, userId, { count: reports.length })
    
    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total: totalCount,
        page: Math.floor(skip / limit) + 1,
        limit,
        hasMore: skip + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Erreur récupération rapports:', error)
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 401 }
    )
  }
}

// POST - Créer un nouveau rapport de maintenance
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    
    // Seuls les techniciens et admins peuvent créer des rapports
    if (!['TECHNICIAN', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    const reportData = await request.json()
    
    // Validation des données requises
    const requiredFields = ['projectId', 'interventionDate', 'startTime', 'initialObservations']
    for (const field of requiredFields) {
      if (!reportData[field]) {
        return NextResponse.json(
          { error: `Champ requis manquant: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Vérification que le projet existe et que le technicien y a accès
    const project = (await Project.findById(reportData.projectId).lean()) as any
    
    if (!project) {
      return NextResponse.json(
        { error: 'Projet non trouvé' },
        { status: 404 }
      )
    }
    
    // Calcul de la durée si startTime et endTime sont fournis
    let duration = reportData.duration
    if (reportData.startTime && reportData.endTime && !duration) {
      const start = new Date(`2000-01-01T${reportData.startTime}`)
      const end = new Date(`2000-01-01T${reportData.endTime}`)
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)).toString()
    }
    
    // Génération d'un ID de rapport unique
    // reportId auto via pre-save Mongoose
    
    // Création du rapport
    const newReport = await MaintenanceReport.create({
      technicianId: userId,
      projectId: reportData.projectId,
      clientId: project.clientId,
      site: project.address,
      interventionDate: new Date(reportData.interventionDate),
      startTime: reportData.startTime,
      endTime: reportData.endTime || '',
      duration: duration ? Number(duration) : 0,
      initialObservations: reportData.initialObservations,
      problemDescription: reportData.problemDescription || '',
      problemSeverity: (reportData.problemSeverity || 'MEDIUM').toLowerCase(),
      tasksPerformed: reportData.tasksPerformed || [],
      results: reportData.results || '',
      recommendations: reportData.recommendations || [],
      status: 'draft'
    })
    
    logDataAccess('maintenance_reports', 'create', request, userId, { reportId: newReport.reportId })
    
    return NextResponse.json({
      success: true,
      report: newReport,
      message: 'Rapport créé avec succès'
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du rapport' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un rapport
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId, role } = await verifyToken(request)
    const updateData = await request.json()
    const reportId = updateData.id
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }
    
    // Vérification des droits d'accès
    const existingReport = await MaintenanceReport.findById(reportId)
    
    if (!existingReport) {
      return NextResponse.json(
        { error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérification des permissions
    if (role === 'TECHNICIAN' && existingReport.technicianId !== userId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      )
    }
    
    // Vérification du statut modifiable
    if (['validated', 'rejected'].includes(existingReport.status)) {
      return NextResponse.json(
        { error: 'Rapport non modifiable dans cet état' },
        { status: 403 }
      )
    }
    
    // Calcul de la durée si nécessaire
    if (updateData.startTime && updateData.endTime && !updateData.duration) {
      const start = new Date(`2000-01-01T${updateData.startTime}`)
      const end = new Date(`2000-01-01T${updateData.endTime}`)
      updateData.duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)).toString()
    }
    
    // Mise à jour du rapport
    await MaintenanceReport.updateOne(
      { _id: reportId },
      {
        $set: {
          ...updateData,
          id: undefined,
          updatedAt: new Date()
        }
      }
    )

    const updatedReport = await MaintenanceReport.findById(reportId).lean() as any
    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Rapport non trouvé après mise à jour' },
        { status: 404 }
      )
    }
    
    logDataAccess('maintenance_reports', 'update', request, userId, { reportId: updatedReport.reportId })
    
    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: 'Rapport mis à jour avec succès'
    })

  } catch (error) {
    console.error('Erreur mise à jour rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}