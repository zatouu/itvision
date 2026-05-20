import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { emailService } from '@/lib/email-service'
import { addNotification } from '@/lib/notifications-memory'

export const JOB_NAME = 'maintenance.sla-monitoring'

interface SLAResult {
  breachesDetected: number
  escalations: number
  errors: string[]
}

function parseResponseTime(responseTime?: string): number {
  if (!responseTime) return 24
  const match = responseTime.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 24
}

/**
 * Détecte les interventions qui dépassent le SLA de temps de réponse
 * ou qui sont scheduled sans être démarrées après leur date planifiée.
 */
export async function runSLAMonitoringJob(): Promise<SLAResult> {
  const errors: string[] = []
  let breachesDetected = 0
  let escalations = 0

  try {
    await connectMongoose()

    const now = new Date()
    const adminEmail = process.env.ADMIN_EMAIL || 'contact@itvisionplus.sn'

    // 1. Interventions pending sans technicien assigné depuis > responseTime
    const pendingInterventions = await Intervention.find({
      status: 'pending',
      isCoveredByContract: true,
      maintenanceContractId: { $exists: true },
      date: { $lte: now }
    }).populate('maintenanceContractId', 'coverage.responseTime name contractNumber')
      .lean() as any[]

    for (const intervention of pendingInterventions) {
      try {
        const contract = intervention.maintenanceContractId as any
        if (!contract) continue

        const responseHours = parseResponseTime(contract.coverage?.responseTime)
        const createdAt = new Date(intervention.date || intervention.createdAt)
        const hoursSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

        if (hoursSince > responseHours) {
          breachesDetected++

          addNotification({
            userId: 'admin',
            type: 'warning',
            title: 'Alerte SLA — Intervention non assignée',
            message: `${intervention.title} (${intervention.interventionNumber}) dépasse le SLA de ${responseHours}h`,
            actionUrl: `/admin/maintenance/interventions/${intervention._id}`,
            metadata: { interventionId: String(intervention._id), slaHours: responseHours, hoursSince }
          })

          // Escalade si > 2x SLA
          if (hoursSince > responseHours * 2) {
            escalations++
            await emailService.sendEmail({
              to: adminEmail,
              subject: `ESCALADE SLA — ${intervention.interventionNumber || 'INT-?' }`,
              html: `
                <p><strong>Intervention :</strong> ${intervention.title}</p>
                <p><strong>SLA :</strong> ${responseHours}h</p>
                <p><strong>Délai réel :</strong> ${Math.round(hoursSince)}h</p>
                <p><strong>Contrat :</strong> ${contract.contractNumber}</p>
              `
            })
          }
        }
      } catch (err: any) {
        errors.push(`Pending ${intervention._id}: ${err.message}`)
      }
    }

    // 2. Interventions scheduled passées sans passage in_progress
    const scheduledDateLimit = new Date(now)
    scheduledDateLimit.setDate(scheduledDateLimit.getDate() - 1)

    const staleScheduled = await Intervention.find({
      status: 'scheduled',
      scheduledDate: { $lte: scheduledDateLimit.toISOString().split('T')[0] }
    }).lean() as any[]

    for (const intervention of staleScheduled) {
      try {
        addNotification({
          userId: 'admin',
          type: 'info',
          title: 'Intervention non démarrée',
          message: `${intervention.title} était prévue le ${intervention.scheduledDate} mais n'a pas commencé`,
          actionUrl: `/admin/maintenance/interventions/${intervention._id}`,
          metadata: { interventionId: String(intervention._id), scheduledDate: intervention.scheduledDate }
        })
      } catch (err: any) {
        errors.push(`Scheduled ${intervention._id}: ${err.message}`)
      }
    }
  } catch (err: any) {
    errors.push(`Global: ${err.message}`)
  }

  return { breachesDetected, escalations, errors }
}
