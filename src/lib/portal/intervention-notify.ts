import { notifyCompany, resolveClientCompanyId } from '@/lib/portal/company-notify'

type InterventionLike = {
  _id?: unknown
  title?: string
  status?: string
  date?: Date | string
  heureDebut?: string
  clientId?: unknown
  clientCompanyId?: unknown
  site?: string
}

const dayLabel = (d?: Date | string, time?: string) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  const txt = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return time ? `${txt} à ${time}` : txt
}

/**
 * Prévient l'entreprise cliente des étapes visibles d'une intervention :
 * planification ou report, arrivée du technicien, fin (bon à valider), annulation.
 */
export async function notifyInterventionChange(before: InterventionLike | null, after: InterventionLike) {
  const companyId = (after.clientCompanyId && String(after.clientCompanyId)) || await resolveClientCompanyId(after.clientId)
  if (!companyId) return

  const id = String(after._id || '')
  const actionUrl = `/portail-entreprise/interventions/${id}`
  const title = after.title || 'Intervention'
  const statusChanged = (before?.status || '') !== (after.status || '')
  const dateChanged = !!before && !!after.date && (
    new Date(before.date || 0).getTime() !== new Date(after.date).getTime() || (before.heureDebut || '') !== (after.heureDebut || '')
  )
  const when = dayLabel(after.date, after.heureDebut)

  if ((after.status === 'scheduled' && (statusChanged || !before)) || (after.status === 'scheduled' && dateChanged)) {
    return notifyCompany({
      companyId, category: 'intervention', actionUrl, metadata: { interventionId: id },
      title: before && dateChanged && !statusChanged ? `Intervention reprogrammée : ${title}` : `Intervention planifiée : ${title}`,
      message: when ? `Prévue ${when}${after.site ? ` · ${after.site}` : ''}.` : 'La date vous sera confirmée.',
    })
  }
  if (!statusChanged) return
  if (after.status === 'in_progress') {
    return notifyCompany({
      companyId, category: 'intervention', actionUrl, metadata: { interventionId: id },
      title: `Technicien sur place : ${title}`, message: 'L’intervention a commencé.',
    })
  }
  if (after.status === 'completed') {
    return notifyCompany({
      companyId, category: 'intervention', type: 'success', actionUrl: `${actionUrl}#avis`, metadata: { interventionId: id },
      title: `Intervention terminée : ${title}`, message: 'Consultez le compte rendu, validez le bon de fin de travaux et donnez votre avis en un geste.',
    })
  }
  if (after.status === 'cancelled') {
    return notifyCompany({
      companyId, category: 'intervention', type: 'warning', actionUrl, metadata: { interventionId: id },
      title: `Intervention annulée : ${title}`, message: 'Votre interlocuteur IT Vision vous recontacte pour convenir d’une nouvelle date si besoin.',
    })
  }
}
