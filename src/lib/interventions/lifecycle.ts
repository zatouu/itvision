import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { emitInterventionUpdate } from '@/lib/socket-emit'
import { notifyInterventionChange } from '@/lib/portal/intervention-notify'

const FORWARD_FROM: Record<'in_progress' | 'completed', string[]> = {
  in_progress: ['pending', 'scheduled'],
  completed: ['pending', 'scheduled', 'in_progress'],
}

/** Décompte une intervention terminée sur son contrat de maintenance (à appeler une seule fois par clôture). */
export async function countCompletionOnContract(intervention: { maintenanceContractId?: unknown; typeIntervention?: string }) {
  if (!intervention.maintenanceContractId) return
  const contract = await MaintenanceContract.findById(intervention.maintenanceContractId)
  if (!contract) return
  const used = contract.coverage?.interventionsUsed || 0
  const included = contract.coverage?.interventionsIncluded || 0
  if (included === 0 || used < included) {
    contract.coverage.interventionsUsed = used + 1
  }
  contract.stats.totalInterventions = (contract.stats.totalInterventions || 0) + 1
  if (intervention.typeIntervention === 'maintenance' || intervention.typeIntervention === 'preventive') {
    contract.stats.preventiveInterventions = (contract.stats.preventiveInterventions || 0) + 1
  } else {
    contract.stats.curativeInterventions = (contract.stats.curativeInterventions || 0) + 1
  }
  await contract.save()
}

/**
 * Fait avancer une intervention depuis un autre flux (rapports de maintenance) avec les mêmes effets
 * que le planning : transition conditionnelle, contrat, historique, notification client, temps réel.
 * Sans effet si l'intervention a déjà franchi cette étape (jamais de retour en arrière).
 */
export async function advanceIntervention(interventionId: unknown, to: 'in_progress' | 'completed', actorUserId?: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(String(interventionId || ''))) return false
  const before = await Intervention.findOneAndUpdate(
    { _id: interventionId, status: { $in: FORWARD_FROM[to] } },
    { $set: { status: to } },
    { new: false }
  ).lean() as any
  if (!before) return false

  if (to === 'completed') await countCompletionOnContract(before)
  if (actorUserId && mongoose.isValidObjectId(actorUserId)) {
    await Intervention.updateOne({ _id: before._id }, {
      $push: { history: { action: 'status_changed', userId: actorUserId, timestamp: new Date(), details: { previousStatus: before.status, newStatus: to } } },
    })
  }
  emitInterventionUpdate(String(before._id), { id: String(before._id), status: to })
  void notifyInterventionChange(before, { ...before, status: to })
    .catch(e => console.error('[advanceIntervention] notification:', e))
  return true
}
