import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'
import { logFailedAuth, logDataAccess, logSecurityViolation } from '@/lib/security-logger'
import { InputValidator } from '@/lib/input-validation'

async function verifyAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin-auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    logFailedAuth('missing_token', request)
    throw new Error('Token manquant')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    // Vérification rôle admin
    if (decoded.role !== 'admin' && decoded.role !== 'supervisor') {
      logSecurityViolation('unauthorized_admin_access', request, { 
        userId: decoded.userId, 
        role: decoded.role 
      })
      throw new Error('Accès non autorisé')
    }
    
    logDataAccess('admin_reports', 'validate_access', request, decoded.userId)
    return decoded
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    logFailedAuth('invalid_token', request, { error: errorMessage })
    throw error
  }
}

// POST - Valider ou rejeter un rapport
export async function POST(request: NextRequest) {
  // Appliquer le rate limiting
  const rateLimitResponse = applyRateLimit(request, apiRateLimiter)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    await connectDB()
    
    const { userId } = await verifyAdminToken(request)
    const requestData = await request.json()
    
    // Validation sécurisée des entrées
    const validation = InputValidator.validateObject(requestData, {
      reportId: { required: true, type: 'string', maxLength: 50 },
      action: { required: true, type: 'string', maxLength: 20 },
      comments: { required: false, type: 'string', maxLength: 1000 },
      adminSignature: { required: false, type: 'string', maxLength: 500 }
    }, request)

    if (!validation.isValid) {
      logSecurityViolation('invalid_input_validation', request, {
        errors: validation.errors,
        userId
      })
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      )
    }

    const { reportId, action, comments, adminSignature } = validation.sanitized
    
    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide' },
        { status: 400 }
      )
    }
    
    if (action === 'rejected' && (!comments || comments.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Commentaires obligatoires pour un rejet' },
        { status: 400 }
      )
    }
    
    // Récupération du rapport
    const report = await MaintenanceReport.findById(reportId)
      .populate('technicianId', 'name email')
      .populate('clientId', 'name company email')
    
    if (!report) {
      return NextResponse.json(
        { error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    if (report.status !== 'pending_validation') {
      return NextResponse.json(
        { error: 'Ce rapport ne peut pas être validé dans son état actuel' },
        { status: 400 }
      )
    }
    
    // Calcul temps de validation
    const submissionTime = report.history.find((h: any) => h.action === 'submitted_for_validation')?.timestamp
    const validationTime = submissionTime ? 
      Math.round((new Date().getTime() - new Date(submissionTime).getTime()) / 60000) : 0
    
    // Mise à jour du rapport selon l'action
    if (action === 'approved') {
      report.status = 'validated'
      report.validation = {
        validatedBy: userId,
        validatedAt: new Date(),
        action: 'approved',
        comments: comments || 'Rapport approuvé',
        adminSignature
      }
      
      // Auto-publication vers le client (configurable)
      if (process.env.AUTO_PUBLISH_VALIDATED_REPORTS === 'true') {
        report.status = 'published'
        report.publishedToClient = true
        report.publishedAt = new Date()
      }
      
    } else {
      report.status = 'rejected'
      report.validation = {
        validatedBy: userId,
        validatedAt: new Date(),
        action: 'rejected',
        comments,
        adminSignature
      }
    }
    
    // Analytics
    report.analytics.adminValidationTime = validationTime
    
    // Historique
    report.addHistoryEntry(
      action === 'approved' ? 'validated' : 'rejected',
      userId,
      {
        comments,
        validationTime,
        autoPublished: action === 'approved' && process.env.AUTO_PUBLISH_VALIDATED_REPORTS === 'true'
      }
    )
    
    await report.save()
    
    // Notification au technicien
    await notifyTechnicianValidation(report, action, comments)
    
    // Notification au client si publié
    if (report.status === 'published') {
      await notifyClientReportAvailable(report)
    }
    
    // Mise à jour des statistiques admin (optionnel)
    await updateAdminStats(userId, action)
    
    return NextResponse.json({
      success: true,
      message: action === 'approved' ? 'Rapport validé avec succès' : 'Rapport rejeté',
      report: {
        id: report._id,
        reportId: report.reportId,
        status: report.status,
        validatedAt: report.validation?.validatedAt,
        validatedBy: userId,
        publishedToClient: report.publishedToClient
      }
    })

  } catch (error) {
    console.error('Erreur validation rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation' },
      { status: 500 }
    )
  }
}

// GET - Récupérer les rapports en attente de validation
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    await verifyAdminToken(request)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_validation'
    const priority = searchParams.get('priority')
    const technicianId = searchParams.get('technicianId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction du filtre
    let filter: any = {}
    
    if (status !== 'all') {
      filter.status = status
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority
    }
    
    if (technicianId) {
      filter.technicianId = technicianId
    }
    
    // Récupération des rapports
    const reports = await MaintenanceReport.find(filter)
      .populate('technicianId', 'name email specialties')
      .populate('clientId', 'name company')
      .populate('projectId', 'name')
      .sort({ 
        priority: 1, // urgent d'abord
        interventionDate: -1 
      })
      .limit(limit)
      .skip(skip)
      .lean()
    
    const totalCount = await MaintenanceReport.countDocuments(filter)
    
    // Statistiques de validation
    const stats = await getValidationStats()
    
    return NextResponse.json({
      success: true,
      reports,
      stats,
      pagination: {
        total: totalCount,
        page: Math.floor(skip / limit) + 1,
        limit,
        hasMore: skip + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Erreur récupération rapports validation:', error)
    return NextResponse.json(
      { error: 'Accès non autorisé' },
      { status: 401 }
    )
  }
}

// Fonction de notification technicien
async function notifyTechnicianValidation(report: any, action: string, comments: string) {
  console.log(`🔔 Notification technicien ${report.technicianId.name}: Rapport ${report.reportId} ${action}`)
  
  // Ici vous implémenterez l'envoi de notifications :
  // - Email
  // - Push notification
  // - SMS si urgent
  
  if (process.env.NODE_ENV === 'production') {
    // await sendNotification({
    //   to: report.technicianId.email,
    //   type: action === 'approved' ? 'report_approved' : 'report_rejected',
    //   data: {
    //     reportId: report.reportId,
    //     clientName: report.clientId.name,
    //     comments,
    //     actionRequired: action === 'rejected'
    //   }
    // })
  }
}

// Fonction de notification client
async function notifyClientReportAvailable(report: any) {
  console.log(`🔔 Notification client ${report.clientId.name}: Nouveau rapport disponible ${report.reportId}`)
  
  if (process.env.NODE_ENV === 'production') {
    // await sendClientNotification({
    //   to: report.clientId.email,
    //   type: 'new_report_available',
    //   data: {
    //     reportId: report.reportId,
    //     interventionDate: report.interventionDate,
    //     technicianName: report.technicianId.name,
    //     portalUrl: `https://itvision.sn/client-portal`
    //   }
    // })
  }
}

// Statistiques de validation
async function getValidationStats() {
  const stats = await MaintenanceReport.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgValidationTime: { $avg: '$analytics.adminValidationTime' }
      }
    }
  ])
  
  const pendingUrgent = await MaintenanceReport.countDocuments({
    status: 'pending_validation',
    priority: 'urgent'
  })
  
  return {
    byStatus: stats,
    pendingUrgent,
    totalPending: stats.find(s => s._id === 'pending_validation')?.count || 0
  }
}

// Mise à jour stats admin
async function updateAdminStats(adminId: string, action: string) {
  // Ici vous pouvez suivre les statistiques des admins :
  // - Nombre de validations
  // - Temps moyen de validation
  // - Taux d'approbation vs rejet
  console.log(`Admin ${adminId} action: ${action}`)
}