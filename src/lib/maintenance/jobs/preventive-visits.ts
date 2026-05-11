import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import { generateMaintenanceVisits } from '@/lib/maintenance/schedule'

export const JOB_NAME = 'maintenance.preventive-visits'

/**
 * Pour chaque contrat actif, génère les visites préventives manquantes
 * sur les 90 prochains jours et crée les Interventions + MaintenanceActivities.
 */
export async function runPreventiveVisitsJob(): Promise<{
  contractsProcessed: number
  visitsCreated: number
  errors: string[]
}> {
  const errors: string[] = []
  let contractsProcessed = 0
  let visitsCreated = 0

  try {
    await connectMongoose()

    const now = new Date()
    const to = new Date(now)
    to.setDate(to.getDate() + 90)

    const contracts = await MaintenanceContract.find({ status: 'active' }).lean() as any[]

    for (const contract of contracts) {
      try {
        contractsProcessed++
        const visits = generateMaintenanceVisits(contract, { from: now, to })

        for (const visit of visits) {
          // Vérifier qu'une intervention identique n'existe pas déjà
          const exists = await Intervention.findOne({
            maintenanceContractId: contract._id,
            site: visit.site,
            date: new Date(visit.date)
          }).select('_id').lean()

          if (exists) continue

          const intervention = await Intervention.create({
            title: `Visite préventive — ${contract.name}`,
            description: `Visite contractuelle programmée sur le site ${visit.site}`,
            clientId: contract.clientId,
            projectId: contract.projectId,
            maintenanceContractId: contract._id,
            isCoveredByContract: true,
            typeIntervention: 'maintenance',
            service: 'maintenance',
            priority: visit.priority,
            estimatedDuration: visit.estimatedDurationHours,
            status: 'scheduled',
            date: new Date(visit.date),
            site: visit.site,
            requiredSkills: contract.services?.map((s: any) => s.name) || []
          })

          await MaintenanceActivity.create({
            category: 'contract_visit',
            contractId: contract._id,
            clientId: contract.clientId,
            clientName: visit.clientName,
            date: new Date(visit.date),
            site: visit.site,
            isContractual: true,
            allowMarketplace: false,
            preferredTechnicians: visit.preferredTechnicians?.map((t: any) => t._id) || [],
            status: 'pending'
          })

          visitsCreated++
        }
      } catch (err: any) {
        errors.push(`Contrat ${contract._id}: ${err.message}`)
      }
    }
  } catch (err: any) {
    errors.push(`Global: ${err.message}`)
  }

  return { contractsProcessed, visitsCreated, errors }
}
