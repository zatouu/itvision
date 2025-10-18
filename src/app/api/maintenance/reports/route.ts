import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import Client from '@/lib/models/Client'

async function verifyTechnicianToken(request: NextRequest) {
  // Supporte 'auth-token' (standard) et 'tech-auth-token' (legacy)
  const token = request.cookies.get('auth-token')?.value || 
                request.cookies.get('tech-auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Token manquant')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  const role = String(decoded.role || '').toUpperCase()
  const technicianId = decoded.technicianId || (role === 'TECHNICIAN' ? decoded.userId : undefined)
  return { ...decoded, role, technicianId }
}

// GET - Récupérer les rapports (filtres par technicien)
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { technicianId, role, userId } = await verifyTechnicianToken(request)
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction filtre
    let filter: any = {}
    if (role === 'TECHNICIAN') {
      filter.technicianId = technicianId || userId
    }
    
    if (status && status !== 'all') {
      filter.status = status
    }
    
    if (clientId) {
      filter.clientId = clientId
    }
    
    // Récupération rapports
    const reports = await MaintenanceReport.find(filter)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .sort({ interventionDate: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
    
    const totalCount = await MaintenanceReport.countDocuments(filter)
    
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

// POST - Créer nouveau rapport
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { technicianId } = await verifyTechnicianToken(request)
    const reportData = await request.json()
    
    // Assouplir les champs requis: on fournira des valeurs par défaut si absents
    if (!reportData.interventionDate || !reportData.site) {
      return NextResponse.json(
        { error: 'Champs requis manquants: interventionDate et site' },
        { status: 400 }
      )
    }
    
    // Vérification que le technicien existe
    const technician = await Technician.findById(technicianId)
    if (!technician || !technician.isActive) {
      return NextResponse.json(
        { error: 'Technicien non autorisé' },
        { status: 403 }
      )
    }
    
    // Calcul automatique de la durée si startTime/endTime fournis
    let duration = reportData.duration
    if (reportData.startTime && reportData.endTime && !duration) {
      const start = new Date(`2000-01-01T${reportData.startTime}`)
      const end = new Date(`2000-01-01T${reportData.endTime}`)
      duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }
    
    // Création du rapport avec valeurs par défaut compatibles schéma
    const newReport = new MaintenanceReport({
      technicianId,
      clientId: reportData.clientId || new (require('mongoose').Types.ObjectId)(),
      projectId: reportData.projectId || new (require('mongoose').Types.ObjectId)(),
      interventionDate: new Date(reportData.interventionDate),
      startTime: reportData.startTime || '08:00',
      endTime: reportData.endTime || '09:00',
      duration,
      site: reportData.site,
      interventionType: (reportData.interventionType || 'maintenance'),
      templateId: reportData.templateId || 'generic',
      templateVersion: reportData.templateVersion || '1.0',
      formData: reportData.formData || {},
      initialObservations: reportData.initialObservations || 'Observations non renseignées',
      problemDescription: reportData.problemDescription || '',
      problemSeverity: (reportData.problemSeverity || 'medium').toLowerCase(),
      tasksPerformed: reportData.tasksPerformed || [],
      results: reportData.results || 'N/A',
      recommendations: reportData.recommendations || [],
      photos: reportData.photos || { before: [], after: [] },
      signatures: {
        technician: reportData.technicianSignature
          ? { signature: reportData.technicianSignature, name: reportData.technician || 'Technicien', timestamp: new Date() }
          : undefined,
        client: reportData.clientSignature
          ? { signature: reportData.clientSignature, name: reportData.clientName || '', title: reportData.clientTitle || '', timestamp: new Date() }
          : undefined,
      },
      gpsLocation: reportData.gpsLocation,
      status: reportData.status || 'draft',
      priority: reportData.priority || 'medium',
      version: 1,
      analytics: {
        timeToComplete: 0,
        revisionCount: 0
      }
    })
    
    // Ajout entrée historique
    newReport.addHistoryEntry('created', technicianId, { 
      initialStatus: newReport.status 
    })
    
    await newReport.save()
    
    // Mise à jour stats technicien
    technician.stats.totalReports += 1
    await technician.save()
    
    // Population pour réponse
    const populatedReport = await MaintenanceReport.findById(newReport._id)
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .lean()
    
    return NextResponse.json({
      success: true,
      report: populatedReport,
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

// PUT - Mettre à jour rapport
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { technicianId } = await verifyTechnicianToken(request)
    const updateData = await request.json()
    const reportId = updateData.reportId
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }
    
    // Vérification propriété et droits
    const existingReport = await MaintenanceReport.findOne({
      _id: reportId,
      technicianId
    })
    
    if (!existingReport) {
      return NextResponse.json(
        { error: 'Rapport non trouvé ou accès non autorisé' },
        { status: 404 }
      )
    }
    
    // Vérification statut modifiable
    if (['validated', 'published', 'archived'].includes(existingReport.status)) {
      return NextResponse.json(
        { error: 'Rapport non modifiable dans cet état' },
        { status: 403 }
      )
    }
    
    // Calcul durée si nécessaire
    if (updateData.startTime && updateData.endTime && !updateData.duration) {
      const start = new Date(`2000-01-01T${updateData.startTime}`)
      const end = new Date(`2000-01-01T${updateData.endTime}`)
      updateData.duration = Math.round((end.getTime() - start.getTime()) / 60000)
    }
    
    // Mise à jour
    const updatedReport = await MaintenanceReport.findByIdAndUpdate(
      reportId,
      {
        ...updateData,
        version: existingReport.version + 1,
        'analytics.revisionCount': existingReport.analytics.revisionCount + 1
      },
      { new: true, runValidators: true }
    ).populate('clientId', 'name company')
     .populate('projectId', 'name')
    
    // Ajout historique
    updatedReport!.addHistoryEntry('updated', technicianId, {
      previousStatus: existingReport.status,
      newStatus: updateData.status || existingReport.status,
      fieldsChanged: Object.keys(updateData)
    })
    
    await updatedReport!.save()
    
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