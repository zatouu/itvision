import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Technician from '@/lib/models/Technician'
import { addNotification } from '@/lib/notifications-memory'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'
import { emailService } from '@/lib/email-service'
 import { logAuditEvent } from '@/lib/audit'
import { getBrandFromHost, BrandConfig } from '@/lib/branding'
import { emitGroupNotification } from '@/lib/socket-emit'
import { advanceIntervention } from '@/lib/interventions/lifecycle'
import { escapeHtml } from '@/lib/html-escape'
import { reportSubmissionErrors } from '@/lib/maintenance/report-rules'

async function verifyTechnicianToken(request: NextRequest) {
  const user = await requireApiUser(request, ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'])
  return { ...user, technicianId: user.technicianId || (user.role === 'TECHNICIAN' ? user.userId : undefined) }
}

// POST - Soumettre rapport pour validation
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const brand = getBrandFromHost(request.nextUrl.host)
    
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
    const techRecord = await Technician.findById(technicianId).select('_id stats').lean().catch(() => null) as any
      || (tokenData.email ? await Technician.findOne({ email: String(tokenData.email).toLowerCase() }).select('_id stats').lean() as any : null)
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

    // Temps réel + audit + liaison intervention
    try {
      await logAuditEvent({
        entityType: 'MaintenanceReport',
        entityId: String(report._id),
        action: 'submitted_for_validation',
        previousState: { status: 'draft' },
        newState: { status: 'pending_validation' },
        userId: technicianId,
        userRole: 'TECHNICIAN',
        ip: request.headers.get('x-forwarded-for') || undefined,
        metadata: { needsQuote, followUpCount: followUps.length }
      })
      emitGroupNotification('admins', {
        type: 'info',
        title: 'Nouveau rapport à valider',
        message: `Rapport ${report.reportId} soumis par ${tokenData.username || 'technicien'}`,
        data: { reportId: String(report._id), reportNumber: report.reportId }
      })
      if (report.interventionId) {
        await advanceIntervention(report.interventionId, 'completed', tokenData.userId)
      }
    } catch (e) { console.error('[Report] Realtime/audit error:', e) }

    // Notification admin
    try {
      await notifyAdminNewReport(report, brand)
    } catch {}

    // Le client est prévenu à la publication (après validation), pas avant : il ne pourrait pas encore lire le rapport
    
    // Mise à jour statistiques technicien
    if (techRecord && techRecord._id) {
      // Calcul du taux de complétion (rapports soumis vs créés)
      const totalSubmitted = await MaintenanceReport.countDocuments({
        technicianId,
        status: { $ne: 'draft' }
      })

      const totalReports = techRecord.stats?.totalReports || 0
      const completionRate = totalReports > 0 ? (totalSubmitted / totalReports) * 100 : 0
      await Technician.updateOne(
        { _id: technicianId },
        { $set: { 'stats.completionRate': completionRate } }
      )
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
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur soumission rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la soumission' },
      { status: 500 }
    )
  }
}

// Mêmes règles que le formulaire technicien (src/lib/maintenance/report-rules.ts)
function validateReportForSubmission(report: any): string[] {
  return reportSubmissionErrors({
    interventionType: report.interventionType,
    initialObservations: report.initialObservations === 'Observations non renseignées' ? '' : report.initialObservations,
    results: report.results === 'N/A' ? '' : report.results,
    tasksPerformed: report.tasksPerformed,
    startTime: report.startTime,
    endTime: report.endTime,
    photosBeforeCount: report.photos?.before?.length || 0,
    photosAfterCount: report.photos?.after?.length || 0,
    materialsUsed: report.materialsUsed,
    issuesDetected: report.issuesDetected,
    followUpRecommendations: report.followUpRecommendations,
    nextActions: report.nextActions,
  })
}

// Fonction de notification admin (à implémenter selon vos besoins)
async function notifyAdminNewReport(report: any, brand: BrandConfig) {
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
    const siteUrl = brand.url
    const dateStr = report.interventionDate
      ? new Date(report.interventionDate).toLocaleDateString('fr-FR')
      : 'Non spécifiée'
    const priorityLabel = report.priority === 'urgent' ? '🔴 URGENT' :
      report.priority === 'high' ? '🟠 Haute' :
      report.priority === 'medium' ? '🟡 Moyenne' : '🟢 Faible'

    await emailService.sendEmail({
      to: brand.contactEmail,
      fromName: brand.name,
      brand,
      subject: `Nouveau rapport à valider - ${report.reportId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#059669,#2563eb);color:white;padding:20px;border-radius:10px 10px 0 0">
            <h2 style="margin:0">📋 Nouveau rapport soumis</h2>
          </div>
          <div style="background:#f9fafb;padding:20px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb">
            <p><strong>Rapport :</strong> ${escapeHtml(report.reportId)}</p>
            <p><strong>Site :</strong> ${escapeHtml(report.site || 'Non spécifié')}</p>
            <p><strong>Date d'intervention :</strong> ${dateStr}</p>
            <p><strong>Priorité :</strong> ${priorityLabel}</p>
            <p style="margin-top:20px">
              <a href="${siteUrl}/validation-rapports" style="background:#2563eb;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">
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
