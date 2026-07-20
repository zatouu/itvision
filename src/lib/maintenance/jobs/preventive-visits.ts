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
          const visitId = visit.id

          // Éviter les duplications : une intervention et une activité existent déjà pour cette visite
          const existingIntervention = (await Intervention.findOne({
            maintenanceContractId: contract._id,
            site: visit.site,
            date: new Date(visit.date)
          }).select('_id maintenanceActivityId').lean()) as any

          const existingActivity = (await MaintenanceActivity.findOne({ visitId }).select('_id interventionId').lean()) as any

          if (existingIntervention && existingActivity) {
            // S'assurer que l'activité pointe vers l'intervention si ce n'est pas déjà fait
            if (!existingActivity.interventionId) {
              await MaintenanceActivity.updateOne(
                { _id: existingActivity._id },
                { interventionId: existingIntervention._id }
              )
              await Intervention.updateOne(
                { _id: existingIntervention._id },
                { maintenanceActivityId: existingActivity._id }
              )
            }
            continue
          }

          // Créer l'intervention et l'activité de manière cohérente
          const intervention = await Intervention.create({
            title: `Visite préventive — ${contract.name}`,
            description: `Visite contractuelle programmée sur le site ${visit.site}`,
            clientId: contract.clientId,
            projectId: contract.projectId,
            maintenanceContractId: contract._id,
            isCoveredByContract: true,
            typeIntervention: 'preventive',
            service: 'maintenance',
            priority: visit.priority,
            estimatedDuration: visit.estimatedDurationHours,
            status: 'scheduled',
            date: new Date(visit.date),
            scheduledDate: visit.date.slice(0, 10),
            scheduledTime: '09:00',
            heureDebut: '09:00',
            heureFin: '13:00',
            site: visit.site,
            requiredSkills: contract.services?.map((s: any) => s.name) || []
          })

          const activity = await MaintenanceActivity.create({
            visitId,
            category: 'contract_visit',
            contractId: contract._id,
            clientId: contract.clientId,
            clientName: visit.clientName,
            date: new Date(visit.date),
            site: visit.site,
            isContractual: true,
            allowMarketplace: false,
            preferredTechnicians: visit.preferredTechnicians?.map((t: any) => t._id).filter(Boolean) || [],
            status: 'open',
            interventionId: intervention._id
          })

          intervention.maintenanceActivityId = activity._id
          await intervention.save()

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
