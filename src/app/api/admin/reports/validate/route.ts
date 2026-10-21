import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'
import { logDataAccess, logSecurityViolation } from '@/lib/security-logger'
import { InputValidator } from '@/lib/input-validation'
import { requireApiUser, authErrorResponse, ADMIN_ROLES } from '@/lib/api-auth'
import { logAuditEvent } from '@/lib/audit'
import { advanceIntervention } from '@/lib/interventions/lifecycle'
import { notifyTechnician } from '@/lib/tech/notify-technician'
import { notifyCompany, resolveClientCompanyId } from '@/lib/portal/company-notify'
import { getClientContactEmails } from '@/lib/client-contacts'
import { emailService } from '@/lib/email-service'
import { getBrandFromHost, type BrandConfig } from '@/lib/branding'
import { escapeHtml } from '@/lib/html-escape'

// Un rapport validé est publié au client sauf désactivation explicite (relecture manuelle)
const AUTO_PUBLISH = process.env.AUTO_PUBLISH_VALIDATED_REPORTS !== 'false'

async function verifyAdminToken(request: NextRequest) {
  const user = await requireApiUser(request, ADMIN_ROLES)
  logDataAccess('admin_reports', 'validate_access', request, user.userId)
  return user
}

// POST - Valider ou rejeter un rapport
export async function POST(request: NextRequest) {
  // Appliquer le rate limiting
  const rateLimitResponse = await applyRateLimit(request, apiRateLimiter)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    await connectMongoose()
    
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
      
      // Publication vers le client
      if (AUTO_PUBLISH) {
        report.status = 'published'
        report.publishedToClient = true
        report.publishedAt = new Date()
        report.set('clientAcknowledgement.status', 'pending')
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
        autoPublished: action === 'approved' && AUTO_PUBLISH
      }
    )
    
    await report.save()

    // Un rapport validé clôture l'intervention liée (sans quoi avis et accusé de réception restent bloqués côté client)
    if (action === 'approved' && report.interventionId) {
      await advanceIntervention(report.interventionId, 'completed', userId)
        .catch(e => console.error('[Report] Clôture intervention impossible:', e))
    }

    // Temps réel + audit
    try {
      await logAuditEvent({
        entityType: 'MaintenanceReport',
        entityId: String(report._id),
        action: action === 'approved' ? 'validated' : 'rejected',
        previousState: { status: 'pending_validation' },
        newState: { status: report.status, publishedToClient: report.publishedToClient },
        userId,
        userRole: 'ADMIN',
        ip: request.headers.get('x-forwarded-for') || undefined,
        metadata: { validationTime, autoPublished: action === 'approved' && AUTO_PUBLISH }
      })
    } catch (e) { console.error('[Report] Audit error:', e) }

    await notifyTechnicianValidation(report, action, comments)

    if (report.status === 'published') {
      await notifyClientReportAvailable(report, getBrandFromHost(request.nextUrl.host))
    }

    // Agent corporate `quote_draft` : prépare un devis brouillon à partir du
    // rapport validé (matériel + main d'œuvre + prix catalogue ITV) → l'admin
    // valide dans /admin/copilot, le devis réel est créé à l'approbation.
    if (action === 'approved' && !report.quoteGenerated) {
      try {
        const { enqueueAgentJob } = await import('@/lib/agents/queue')
        await enqueueAgentJob('quote_draft', String(report._id))
      } catch (e) {
        console.warn('[Report] enqueue quote_draft échoué:', e)
      }
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
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
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
    await connectMongoose()
    
    await verifyAdminToken(request)
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending_validation'
    const priority = searchParams.get('priority')
    const technicianId = searchParams.get('technicianId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')
    
    // Construction du filtre
    const filter: any = {}
    
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
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur récupération rapports validation:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Fonction de notification technicien
async function notifyTechnicianValidation(report: any, action: string, comments: string) {
  const technicianId = report.technicianId?._id || report.technicianId
  const approved = action === 'approved'
  await notifyTechnician(technicianId, approved
    ? {
        type: 'success',
        title: `Rapport validé : ${report.reportId}`,
        message: report.status === 'published' ? 'Il est publié dans l\u2019espace du client.' : 'Il sera publié au client après relecture.',
        actionUrl: '/tech-interface?tab=rapports',
        metadata: { reportId: String(report._id) },
      }
    : {
        type: 'warning',
        title: `Rapport à corriger : ${report.reportId}`,
        message: String(comments || '').slice(0, 300),
        actionUrl: `/tech-interface?tab=rapports&rapport=${report._id}`,
        metadata: { reportId: String(report._id) },
      })
}

async function notifyClientReportAvailable(report: any, brand: BrandConfig) {
  const companyId = await resolveClientCompanyId(report.clientId?._id || report.clientId)
  if (!companyId) return
  const dateStr = report.interventionDate ? new Date(report.interventionDate).toLocaleDateString('fr-FR') : ''
  const actionUrl = `/portail-entreprise/rapports?rapport=${report._id}`
  await notifyCompany({
    companyId,
    category: 'report',
    requires: 'reports:view',
    title: `Rapport d\u2019intervention disponible : ${report.reportId}`,
    message: `${report.site || 'Votre site'}${dateStr ? ` · ${dateStr}` : ''}. Merci d\u2019en accuser réception.`,
    actionUrl,
    metadata: { reportId: String(report._id) },
  })

  try {
    const emails = await getClientContactEmails(companyId)
    if (!emails.length) return
    const link = `${brand.url}${actionUrl}`
    await emailService.sendEmail({
      to: emails.join(', '),
      fromName: brand.name,
      brand,
      subject: `Rapport d'intervention ${report.reportId} - ${brand.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#065f46;margin:0 0 12px">Votre rapport d'intervention est disponible</h2>
          <p>Référence : <strong>${escapeHtml(report.reportId)}</strong></p>
          <p>Site : ${escapeHtml(report.site || '')}${dateStr ? ` · ${dateStr}` : ''}</p>
          <p>Il a été relu et validé par nos équipes. Vous pouvez le consulter et en accuser réception dans votre espace.</p>
          <p style="margin:20px 0"><a href="${link}" style="background:#065f46;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Consulter le rapport</a></p>
          <p style="color:#6b7280;font-size:13px">L'équipe ${escapeHtml(brand.name)}</p>
        </div>`,
      text: `Rapport d'intervention ${report.reportId} disponible.\nSite : ${report.site || ''} ${dateStr}\nConsulter : ${link}`,
    })
  } catch (e) {
    console.error('[Report] Email client:', e)
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