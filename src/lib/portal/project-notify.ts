import { notifyCompany } from '@/lib/portal/company-notify'
import { detectDomain, ITV_DOMAINS, projectStage } from '@/lib/portal/project-view'

type ProjectLike = {
  _id?: unknown
  name?: string
  status?: string
  progress?: number
  serviceType?: string
  clientAccess?: boolean
  clientCompanyId?: unknown
  milestones?: Array<{ id?: string; name?: string; status?: string }>
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
