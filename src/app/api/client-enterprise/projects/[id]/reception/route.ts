import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireDomainAccess, requireCompanyCapability, companyScope } from '@/lib/domain-access'
import Project from '@/lib/models/Project'
import User from '@/lib/models/User'
import { CLIENT_VISIBLE_PROJECT } from '@/lib/portal/project-view'
import { addNotification } from '@/lib/notifications-memory'
import { emailService } from '@/lib/email-service'
import { CORPORATE_BRAND } from '@/lib/branding'
import { logAuditEvent } from '@/lib/audit'
import { archiveReceptionPdf, receptionPdfFilename } from '@/lib/pdf-reception'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** Signature du PV de réception par le client (avec ou sans réserves). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const result = await requireDomainAccess(request, 'corporate')
    if (!result.ok) return result.response
    const { access } = result
    const denied = requireCompanyCapability(access, 'interventions:ack')
    if (denied) return denied

    const { id } = await params
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

    const decision = body.decision === 'reserves' ? 'reserves' : body.decision === 'accepted' ? 'accepted' : null
    const reserves = typeof body.reserves === 'string' ? body.reserves.trim().slice(0, 3000) : ''
    const signatureName = typeof body.signatureName === 'string' ? body.signatureName.trim().slice(0, 120) : ''
    const signatureTitle = typeof body.signatureTitle === 'string' ? body.signatureTitle.trim().slice(0, 120) : ''
    const signature = typeof body.signature === 'string' && body.signature.startsWith('data:image/png;base64,') && body.signature.length < 600_000
      ? body.signature : ''
    if (!decision) return NextResponse.json({ error: 'Choisissez « sans réserve » ou « avec réserves »' }, { status: 400 })
    if (decision === 'reserves' && !reserves) return NextResponse.json({ error: 'Décrivez les réserves' }, { status: 400 })
    if (!signatureName || !signature) return NextResponse.json({ error: 'Nom du signataire et signature requis' }, { status: 400 })
    if (body.consent !== true) return NextResponse.json({ error: 'Consentement requis' }, { status: 400 })

    await connectDB()
    const userId = new mongoose.Types.ObjectId(access.userId)
    const companyId = access.profiles.companyClientId
    const project = await Project.findOne({
      $and: [{ _id: new mongoose.Types.ObjectId(id) }, companyScope({ userId, companyId }), CLIENT_VISIBLE_PROJECT],
    }).select('name reception progress status clientCompanyId').lean() as any
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    if (!project.reception?.requestedAt) return NextResponse.json({ error: 'La réception n’a pas encore été demandée par IT Vision' }, { status: 409 })
    if (project.reception?.signedAt) return NextResponse.json({ error: 'Le PV de réception est déjà signé' }, { status: 409 })

    const now = new Date()
    const months = Math.min(Math.max(Number(project.reception.warrantyMonths) || 12, 0), 120)
    const warrantyEnd = new Date(now)
    warrantyEnd.setMonth(warrantyEnd.getMonth() + months)

    const set: Record<string, unknown> = {
      'reception.signedAt': now,
      'reception.decision': decision,
      'reception.reserves': decision === 'reserves' ? reserves : '',
      'reception.signature': signature,
      'reception.signatureName': signatureName,
      'reception.signatureTitle': signatureTitle,
      'reception.signedByUserId': userId,
      'reception.ip': request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      'reception.userAgent': (request.headers.get('user-agent') || '').slice(0, 300),
      'reception.warrantyEnd': warrantyEnd,
    }
    if (decision === 'accepted') { set.status = 'completed'; set.progress = 100; set.endDate = now }

    const signer = `${signatureName}${signatureTitle ? ` (${signatureTitle})` : ''}`
    const written = await Project.updateOne({ _id: project._id, 'reception.signedAt': { $exists: false } }, {
      $set: set,
      $push: {
        timeline: {
          id: `reception-${now.getTime()}`, date: now, type: decision === 'accepted' ? 'completed' : 'issue',
          title: decision === 'accepted' ? 'Réception des travaux sans réserve' : 'Réception des travaux avec réserves',
          description: decision === 'accepted' ? `PV signé par ${signer}.` : `PV signé par ${signer}. Réserves : ${reserves}`,
          author: signatureName, clientVisible: true,
        },
      },
    })
    if (!written.modifiedCount) return NextResponse.json({ error: 'Le PV de réception est déjà signé' }, { status: 409 })

    const signed = await Project.findById(project._id).populate('clientCompanyId', 'name company').lean() as any
    const pdf = await archiveReceptionPdf(signed, 'signature').catch(e => { console.error('[reception] archivage PDF', e); return null })

    const label = decision === 'accepted' ? 'sans réserve' : 'avec réserves'
    addNotification({
      userId: 'admin', type: decision === 'accepted' ? 'success' : 'warning',
      title: `PV de réception signé ${label} : ${project.name}`,
      message: decision === 'accepted' ? `Signé par ${signer}.` : `Réserves : ${reserves.slice(0, 160)}`,
      actionUrl: `/admin/projects/${String(project._id)}`,
      metadata: { projectId: String(project._id), event: 'reception_signed' },
    } as any)

    const signerUser = await User.findById(userId).select('email').lean() as any
    emailService.sendEmail({
      to: signerUser?.email || CORPORATE_BRAND.contactEmail,
      subject: `PV de réception signé ${label} - ${project.name}`,
      html: `<p>Le procès-verbal de réception du projet <strong>${esc(project.name || '')}</strong> a été signé ${label}.</p>
        <p>Signataire : ${esc(signer)}${signerUser?.email ? ` (${esc(signerUser.email)})` : ''}<br>Date : ${now.toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' })}<br>Garantie jusqu'au ${warrantyEnd.toLocaleDateString('fr-FR')}</p>
        ${decision === 'reserves' ? `<p><strong>Réserves :</strong><br>${esc(reserves).replace(/\n/g, '<br>')}</p>` : ''}
        <p>Le PV signé est joint à ce message et reste disponible dans votre espace client.</p>`,
      ...(pdf ? { attachments: [{ filename: receptionPdfFilename(signed), content: pdf.data, contentType: 'application/pdf' }] } : {}),
    }).catch(() => {})

    void logAuditEvent({
      entityType: 'Project', entityId: String(project._id), action: 'reception_signed',
      userId: access.userId, userRole: 'CLIENT', clientCompanyId: companyId, changedFields: ['reception'],
      ...(pdf ? { metadata: { pdfSha256: pdf.sha256 } } : {}),
    } as any)

    return NextResponse.json({ success: true, decision, warrantyEnd })
  } catch (error) {
    console.error('[POST /api/client-enterprise/projects/[id]/reception]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
