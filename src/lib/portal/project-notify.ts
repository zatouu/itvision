import { notifyCompany } from '@/lib/portal/company-notify'
import { detectDomain, ITV_DOMAINS, projectStage } from '@/lib/portal/project-view'
import { getClientContactEmails } from '@/lib/client-contacts'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import emailService from '@/lib/email-service'
import { escapeHtml } from '@/lib/html-escape'
import { CORPORATE_BRAND } from '@/lib/branding'

type ProjectLike = {
  _id?: unknown
  name?: string
  status?: string
  progress?: number
  serviceType?: string
  clientAccess?: boolean
  clientCompanyId?: unknown
  milestones?: Array<{ id?: string; name?: string; status?: string; dueDate?: string | Date | null }>
}

const VISIBLE_STATUSES = ['approved', 'in_progress', 'testing', 'completed', 'maintenance', 'on_hold']

/** Prévient l'entreprise qu'un document ou une photo vient d'être mis à sa disposition sur un projet visible. */
export async function notifyProjectDocument(project: ProjectLike, doc: { name?: string; type?: string }) {
  const companyId = project.clientCompanyId
  if (!companyId) return
  if (!project.clientAccess && !VISIBLE_STATUSES.includes(String(project.status))) return
  const isPhoto = doc.type === 'photo'
  return notifyCompany({
    companyId: String(companyId), category: 'project',
    actionUrl: `/portail-entreprise/projets/${String(project._id)}`,
    title: `${project.name || 'Votre projet'} : ${isPhoto ? 'nouvelle photo du chantier' : 'nouveau document'}`,
    message: doc.name || (isPhoto ? 'Photo ajoutée par IT Vision' : 'Document ajouté par IT Vision'),
    metadata: { projectId: String(project._id) },
  })
}

/** Prévient l'entreprise que le planning de son projet (jalons) vient d'être défini ou complété. */
export async function notifyProjectPlanning(project: ProjectLike, milestoneCount: number) {
  const companyId = project.clientCompanyId
  if (!companyId) return
  if (!project.clientAccess && !VISIBLE_STATUSES.includes(String(project.status))) return
  return notifyCompany({
    companyId: String(companyId), category: 'project',
    actionUrl: `/portail-entreprise/projets/${String(project._id)}`,
    title: `${project.name || 'Votre projet'} : planning mis à jour`,
    message: `${milestoneCount} étape${milestoneCount > 1 ? 's' : ''} planifiée${milestoneCount > 1 ? 's' : ''} — consultez les jalons et leurs échéances.`,
    metadata: { projectId: String(project._id) },
  })
}

const fmtPlanningDate = (d?: string | Date | null) => {
  if (!d) return ''
  const date = new Date(d)
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * « Envoyer le planning au client » : mail aux contacts de l'entreprise (BCC contact interne automatique)
 * + notification portail si le projet y est visible. Le mail part même si le portail n'est pas encore
 * adopté/partagé — les deux canaux vivent en parallèle.
 */
export async function shareProjectPlanning(project: ProjectLike): Promise<{ emailed: number; notified: boolean }> {
  const companyId = project.clientCompanyId
  if (!companyId) return { emailed: 0, notified: false }
  await connectMongoose()

  const milestones = (project.milestones || []).filter(m => m?.name)
  if (!milestones.length) return { emailed: 0, notified: false }

  // Destinataires : contacts de l'entreprise (Client + fiches Contact) et membres portail actifs
  const emails = new Set(await getClientContactEmails(String(companyId)))
  const members = await User.find({ companyClientId: companyId, isActive: { $ne: false }, companyInvitePending: { $ne: true } })
    .select('email').limit(50).lean() as any[]
  for (const m of members) {
    const e = String(m?.email || '').toLowerCase().trim()
    if (e.includes('@')) emails.add(e)
  }

  const name = project.name || 'Votre projet'
  const brand = CORPORATE_BRAND
  const visible = !!project.clientAccess || VISIBLE_STATUSES.includes(String(project.status))
  const link = visible ? `${brand.url}/portail-entreprise/projets/${String(project._id)}` : `${brand.url}/portail-entreprise`
  const rows = milestones.map(m => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#1F2937;font-size:14px">${escapeHtml(String(m.name))}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3f4f6;color:#6B7280;font-size:13px;white-space:nowrap;text-align:right">${escapeHtml(fmtPlanningDate(m.dueDate)) || '—'}</td>
    </tr>`).join('')

  const text = [
    `Planning de votre chantier : ${name}`,
    '',
    ...milestones.map((m, i) => `${i + 1}. ${m.name}${fmtPlanningDate(m.dueDate) ? ` — ${fmtPlanningDate(m.dueDate)}` : ''}`),
    '',
    `Suivez ce chantier en temps réel — avancement, jalons, photos et documents partagés — dans votre espace client : ${link}`,
    'Pas encore d’identifiants ? Répondez à ce mail : nous activons votre espace gratuitement.',
    `L'équipe ${brand.name}`,
  ].join('\n')

  let emailed = 0
  if (emails.size) {
    const ok = await emailService.sendEmail({
      to: Array.from(emails).join(', '),
      fromName: brand.name,
      brand,
      subject: `Planning de votre chantier : ${name} — ${brand.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background-color:#fff">
          <div style="background-color:${brand.primaryColor || '#30326B'};padding:24px;text-align:center">
            <h1 style="color:${brand.secondaryColor || '#FFC800'};margin:0;font-size:22px;letter-spacing:1px">${escapeHtml(brand.name)}</h1>
          </div>
          <div style="padding:28px;border:1px solid #e5e7eb;border-top:none">
            <h2 style="color:#1F2937;margin:0 0 8px;font-size:18px">Planning de votre chantier : ${escapeHtml(name)}</h2>
            <p style="color:#6B7280;font-size:14px;line-height:1.6">Voici les étapes prévues et leurs échéances. Nous vous tiendrons informé de l'avancement.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
            <div style="background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:14px 16px;margin-top:20px">
              <p style="color:#065f46;font-size:14px;line-height:1.6;margin:0 0 4px"><strong>Suivez ce chantier en temps réel</strong> — avancement, jalons, photos et documents partagés — depuis votre espace client.</p>
              <p style="margin:10px 0 4px"><a href="${link}" style="color:#065f46;font-weight:bold;font-size:14px">${visible ? 'Accéder à mon projet en ligne' : 'Découvrir mon espace client'} →</a></p>
              <p style="color:#6B7280;font-size:12px;margin:0">Pas encore d’identifiants ? Répondez simplement à ce mail : nous activons votre espace gratuitement.</p>
            </div>
            <p style="color:#6B7280;font-size:13px;border-top:1px solid #f3f4f6;padding-top:16px;margin-top:8px">L'équipe ${escapeHtml(brand.name)}</p>
          </div>
        </div>`,
      text,
    })
    if (ok) emailed = emails.size
  }

  let notified = false
  if (visible) {
    await notifyProjectPlanning(project, milestones.length)
    notified = true
  }
  return { emailed, notified }
}

/**
 * Prévient l'entreprise cliente d'une évolution visible de son projet (une seule notification par mise à jour) :
 * étape terminée, changement de phase, ou palier d'avancement franchi.
 */
export async function notifyProjectChange(before: ProjectLike, after: ProjectLike) {
  const companyId = after.clientCompanyId || before.clientCompanyId
  if (!companyId) return
  if (!after.clientAccess && !VISIBLE_STATUSES.includes(String(after.status))) return

  const id = String(after._id || before._id || '')
  const domain = ITV_DOMAINS[detectDomain(after.serviceType, after.name)]
  const actionUrl = `/portail-entreprise/projets/${id}`
  const name = after.name || 'Votre projet'

  if (after.clientAccess && !before.clientAccess) {
    return notifyCompany({
      companyId: String(companyId), category: 'project', actionUrl,
      title: `Nouveau projet dans votre espace : ${name}`,
      message: `Suivez votre projet ${domain.label.toLowerCase()} étape par étape : planning, photos et documents.`,
      metadata: { projectId: id },
    })
  }

  const doneBefore = new Set((before.milestones || []).filter(m => m.status === 'completed').map(m => m.id || m.name))
  const newlyDone = (after.milestones || []).filter(m => m.status === 'completed' && !doneBefore.has(m.id || m.name))
  if (newlyDone.length) {
    return notifyCompany({
      companyId: String(companyId), category: 'project', type: 'success', actionUrl,
      title: `${name} : étape franchie`,
      message: `${newlyDone.map(m => m.name).join(', ')} ${newlyDone.length > 1 ? 'sont terminées' : 'est terminée'}. Avancement ${Number(after.progress) || 0} %.`,
      metadata: { projectId: id, domain: domain.short },
    })
  }

  const stageBefore = projectStage(before)
  const stageAfter = projectStage(after)
  if (stageAfter.index !== stageBefore.index || stageAfter.paused !== stageBefore.paused) {
    return notifyCompany({
      companyId: String(companyId), category: 'project', type: stageAfter.paused ? 'warning' : 'info', actionUrl,
      title: stageAfter.paused ? `${name} : projet suspendu` : `${name} : ${stageAfter.label.toLowerCase()}`,
      message: stageAfter.paused
        ? 'Le projet est en pause. Votre chargé de projet IT Vision vous recontacte.'
        : stageAfter.done ? 'Les travaux sont terminés : retrouvez le récapitulatif et les documents de réception.' : `Votre projet ${domain.label.toLowerCase()} passe à l'étape « ${stageAfter.label} ».`,
      metadata: { projectId: id, stage: stageAfter.key },
    })
  }

  const step = (n: unknown) => Math.floor((Number(n) || 0) / 25)
  if (step(after.progress) > step(before.progress) && (Number(after.progress) || 0) < 100) {
    return notifyCompany({
      companyId: String(companyId), category: 'project', actionUrl,
      title: `${name} : ${Number(after.progress)} % réalisés`,
      message: `Le projet avance. Consultez le détail des étapes et les dernières photos.`,
      metadata: { projectId: id },
    })
  }
}
