import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import { addNotification } from '@/lib/notifications-memory'
import { verifyJwtPayload } from '@/lib/jwt'
import { emailService } from '@/lib/email-service'

async function verifyTechnicianToken(request: NextRequest) {
  // Supporte 'auth-token' (standard) et 'tech-auth-token' (legacy)
  const token = request.cookies.get('auth-token')?.value ||
                request.cookies.get('tech-auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Token manquant')
  const payload = await verifyJwtPayload(token)
  const decoded = payload as any
  const role = String(decoded.role || '').toUpperCase()
  const userId = String(decoded.userId || decoded.id || decoded.sub || '')
  const technicianId = decoded.technicianId || (role === 'TECHNICIAN' ? userId : undefined)
  return { ...decoded, role, technicianId, userId }
}

// POST - Soumettre rapport pour validation
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const tokenData = await verifyTechnicianToken(request)
    const { reportId, finalChecks } = await request.json()
    
    if (!reportId) {
      return NextResponse.json(
        { error: 'ID du rapport requis' },
        { status: 400 }
      )
    }

    // Résoudre le vrai Technician._id depuis le token (qui contient User._id)
    let technicianId = tokenData.technicianId || tokenData.userId
    const techRecord = await Technician.findById(technicianId).select('_id').lean().catch(() => null) as any
      || (tokenData.email ? await Technician.findOne({ email: String(tokenData.email).toLowerCase() }).select('_id').lean() as any : null)
    if (techRecord && techRecord._id) technicianId = String(techRecord._id)
    
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
    
      const followUps = Array.isArray(report.followUpRecommendations) ? report.followUpRecommendations : []
      const needsQuote = followUps.some((entry: any) => entry?.requiresQuote && entry?.status !== 'completed')

      if (!report.billing) {
        report.billing = {
          needsQuote,
          quoteStatus: needsQuote ? 'draft' : 'not_started',
          invoiceStatus: 'not_started',
          lastUpdatedAt: new Date()
        } as any
      } else {
        report.billing.needsQuote = needsQuote
        if (needsQuote && report.billing.quoteStatus === 'not_started') {
          report.billing.quoteStatus = 'draft'
        }
        if (!needsQuote && !report.billing.quoteId && ['draft', 'sent'].includes(report.billing.quoteStatus)) {
          report.billing.quoteStatus = 'not_started'
        }
        report.billing.lastUpdatedAt = new Date()
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
        submissionTimestamp: new Date(),
        needsQuote,
        followUpCount: followUps.length
      })
    
    await report.save()
    
    // Notification admin (ici on simule, mais dans un vrai système on enverrait email/push)
    try {
      await notifyAdminNewReport(report)
    } catch {}
    
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

  if (Array.isArray(report.materialsUsed)) {
    const invalidMaterials = report.materialsUsed.filter((material: any) => !material || material.quantity <= 0)
    if (invalidMaterials.length > 0) {
      errors.push('Certaines lignes matériel ont une quantité invalide (≥1 requis)')
    }
  }

  if (Array.isArray(report.issuesDetected)) {
    report.issuesDetected.forEach((issue: any, index: number) => {
      if (issue?.requiresQuote && !issue?.recommendedSolution) {
        errors.push(`La recommandation détaillée est obligatoire pour le problème ${issue?.reference || index + 1}`)
      }
    })
  }

  if (Array.isArray(report.followUpRecommendations)) {
    report.followUpRecommendations.forEach((rec: any, index: number) => {
      if (rec?.requiresQuote && typeof rec?.estimatedCost !== 'number') {
        errors.push(`La recommandation ${rec?.title || index + 1} doit être chiffrée pour générer un devis`)
      }
    })
  }

  const hasUrgentFollowUp = Array.isArray(report.followUpRecommendations)
    ? report.followUpRecommendations.some((rec: any) => rec?.priority === 'urgent')
    : false
  const hasUpcomingNextAction = Array.isArray(report.nextActions)
    ? report.nextActions.some((action: any) => ['pending', 'scheduled'].includes(action?.status))
    : false

  if (hasUrgentFollowUp && !hasUpcomingNextAction) {
    errors.push('Planifiez une action de suivi pour les recommandations urgentes')
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

  // Ajouter une notification mémoire pour les admins (canal 'admin')
  addNotification({
    userId: 'admin',
    type: 'info',
    title: 'Nouveau rapport soumis',
    message: `Rapport ${report.reportId} soumis pour validation`,
    actionUrl: '/validation-rapports',
    metadata: { reportMongoId: String(report._id), reportId: report.reportId }
  })
  
  // Envoi d'email de notification à l'admin
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itvisionplus.sn'
    const dateStr = report.interventionDate
      ? new Date(report.interventionDate).toLocaleDateString('fr-FR')
      : 'Non spécifiée'
    const priorityLabel = report.priority === 'urgent' ? '🔴 URGENT' :
      report.priority === 'high' ? '🟠 Haute' :
      report.priority === 'medium' ? '🟡 Moyenne' : '🟢 Faible'

    await emailService.sendEmail({
      to: 'contact@itvisionplus.sn',
      subject: `Nouveau rapport à valider - ${report.reportId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#059669,#2563eb);color:white;padding:20px;border-radius:10px 10px 0 0">
            <h2 style="margin:0">📋 Nouveau rapport soumis</h2>
          </div>
          <div style="background:#f9fafb;padding:20px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb">
            <p><strong>Rapport :</strong> ${report.reportId}</p>
            <p><strong>Site :</strong> ${report.site || 'Non spécifié'}</p>
            <p><strong>Date d'intervention :</strong> ${dateStr}</p>
            <p><strong>Priorité :</strong> ${priorityLabel}</p>
            <p style="margin-top:20px">
              <a href="${siteUrl}/admin" style="background:#2563eb;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">
                Valider le rapport
              </a>
            </p>
          </div>
        </div>
      `,
      text: `Nouveau rapport soumis: ${report.reportId}\nSite: ${report.site}\nDate: ${dateStr}\nPriorité: ${priorityLabel}`
    })
  } catch (emailError) {
    console.error('Erreur envoi email notification:', emailError)
  }
}