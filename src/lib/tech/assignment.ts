import { ensureTechnicianAccess, type AccessResult } from '@/lib/tech/technician-access'
import { notifyTechnician } from '@/lib/tech/notify-technician'
import { interventionTechnicianIds } from '@/lib/interventions-access'

type InterventionLike = {
  _id?: unknown
  title?: string
  site?: string
  scheduledDate?: string
  technicienId?: unknown
  assignedTechnician?: unknown
  technicianIds?: unknown[]
}

/**
 * Techniciens nouvellement affectés : accès portail garanti (invitation si besoin) et notification
 * aux équipiers (le responsable est déjà prévenu par notifyTechnicianOfChange).
 */
export async function onTechniciansAssigned(before: InterventionLike | null, after: InterventionLike): Promise<AccessResult[]> {
  const prev = new Set(before ? interventionTechnicianIds(before) : [])
  const added = interventionTechnicianIds(after).filter(id => !prev.has(id))
  if (!added.length) return []
  const lead = after.technicienId ? String(after.technicienId) : ''
  const id = String(after._id || '')
  return Promise.all(added.map(async techId => {
    const access = await ensureTechnicianAccess(techId, { interventionTitle: after.title })
    if (techId !== lead) {
      void notifyTechnician(techId, {
        title: `Intervention en équipe : ${after.title || 'intervention'}`,
        message: `${after.scheduledDate ? `Prévue le ${new Date(after.scheduledDate).toLocaleDateString('fr-FR')}` : 'À planifier'}${after.site ? ` · ${after.site}` : ''}.`,
        actionUrl: `/tech-interface?intervention=${id}`,
        metadata: { interventionId: id },
      })
    }
    return access
  }))
}
