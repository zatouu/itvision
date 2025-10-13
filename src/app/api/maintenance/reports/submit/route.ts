import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'

async function verifyTechnicianToken(request: NextRequest) {
  const token = request.cookies.get('tech-auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Token manquant')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  return decoded
}

// POST - Soumettre rapport pour validation
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { technicianId } = await verifyTechnicianToken(request)
    const { reportId, finalChecks } = await request.json()
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }
    
    // Récupération et vérification du rapport
    const report = await MaintenanceReport.findOne({
      _id: reportId,
      technicianId
    })
    
    if (!report) {
      return NextResponse.json(
        { error: 'Rapport non trouvé' },
        { status: 404 }
      )
    }
    
    if (report.status !== 'draft') {
      return NextResponse.json(
        { error: 'Seuls les brouillons peuvent être soumis' },
        { status: 400 }
      )
    }
    
    // Validation des données requises
    const validationErrors = validateReportForSubmission(report)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Données incomplètes',
          details: validationErrors
        },
        { status: 400 }
      )
    }
    
    // Calcul temps de création du rapport
    const creationTime = new Date().getTime() - new Date(report.createdAt).getTime()
    const timeToCompleteMinutes = Math.round(creationTime / 60000)
    
    // Mise à jour du statut et analytics
    report.status = 'pending_validation'
    report.analytics.timeToComplete = timeToCompleteMinutes
    
    // Ajout entrée historique
    report.addHistoryEntry('submitted_for_validation', technicianId, {
      finalChecks,
      timeToComplete: timeToCompleteMinutes,
      submissionTimestamp: new Date()
    })
    
    await report.save()
    
    // Notification admin (ici on simule, mais dans un vrai système on enverrait email/push)
    await notifyAdminNewReport(report)
    
    // Mise à jour statistiques technicien
    const technician = await Technician.findById(technicianId)
    if (technician) {
      // Calcul du taux de complétion (rapports soumis vs créés)
      const totalSubmitted = await MaintenanceReport.countDocuments({
        technicianId,
        status: { $ne: 'draft' }
      })
      
      technician.stats.completionRate = (totalSubmitted / technician.stats.totalReports) * 100
      await technician.save()
    }
    
    return NextResponse.json({
      success: true,
      message: 'Rapport soumis pour validation avec succès',
      report: {
        id: report._id,
        reportId: report.reportId,
        status: report.status,
        submittedAt: new Date(),
        estimatedValidationTime: '24-48h'
      }
    })

  } catch (error) {
    console.error('Erreur soumission rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la soumission' },
      { status: 500 }
    )
  }
}

// Fonction de validation des données avant soumission
function validateReportForSubmission(report: any): string[] {
  const errors: string[] = []
  
  // Vérifications obligatoires
  if (!report.initialObservations || report.initialObservations.trim().length < 10) {
    errors.push('Observations initiales trop courtes (minimum 10 caractères)')
  }
  
  if (!report.results || report.results.trim().length < 10) {
    errors.push('Résultats de l\'intervention requis (minimum 10 caractères)')
  }
  
  if (!report.tasksPerformed || report.tasksPerformed.length === 0) {
    errors.push('Au moins une tâche réalisée doit être spécifiée')
  }
  
  if (!report.startTime || !report.endTime) {
    errors.push('Heures de début et fin d\'intervention requises')
  }
  
  // Vérification durée cohérente
  if (report.startTime && report.endTime) {
    const start = new Date(`2000-01-01T${report.startTime}`)
    const end = new Date(`2000-01-01T${report.endTime}`)
    
    if (end <= start) {
      errors.push('L\'heure de fin doit être postérieure à l\'heure de début')
    }
    
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    if (durationHours > 12) {
      errors.push('Durée d\'intervention anormalement longue (>12h)')
    }
  }
  
  // Vérification photos (au moins une photo avant OU après selon le type)
  const hasBeforePhotos = report.photos?.before?.length > 0
  const hasAfterPhotos = report.photos?.after?.length > 0
  
  if (report.interventionType === 'maintenance' && !hasBeforePhotos && !hasAfterPhotos) {
    errors.push('Au moins une photo (avant ou après) requise pour une maintenance')
  }
  
  if (report.interventionType === 'installation' && !hasAfterPhotos) {
    errors.push('Photos après installation requises')
  }
  
  // Vérification signatures si intervention terminée
  if (report.status !== 'draft' && !report.signatures?.technician) {
    errors.push('Signature du technicien requise')
  }
  
  return errors
}

// Fonction de notification admin (à implémenter selon vos besoins)
async function notifyAdminNewReport(report: any) {
  // Ici vous pouvez ajouter :
  // - Envoi email
  // - Notification push
  // - Slack/Teams webhook
  // - SMS si urgent
  
  console.log(`🔔 Nouveau rapport en attente de validation: ${report.reportId}`)
  
  // Exemple d'envoi d'email (à adapter avec votre service email)
  if (process.env.NODE_ENV === 'production') {
    try {
      // await sendEmail({
      //   to: 'admin@itvision.sn',
      //   subject: `Nouveau rapport à valider - ${report.reportId}`,
      //   template: 'new-report-validation',
      //   data: {
      //     reportId: report.reportId,
      //     technicianName: report.technicianName,
      //     clientName: report.clientName,
      //     interventionDate: report.interventionDate,
      //     priority: report.priority,
      //     validationUrl: `https://itvision.sn/validation-rapports?report=${report._id}`
      //   }
      // })
    } catch (emailError) {
      console.error('Erreur envoi email notification:', emailError)
    }
  }
}